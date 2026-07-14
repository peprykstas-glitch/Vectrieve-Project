import uuid
import json
import time
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from models.schemas import QueryRequest, QueryResponse, FeedbackRequest
from models.sql_models import ChatHistory, ChatSession, FeedbackLog
from models.user import User
from core.database import get_session, engine
from api.deps import get_current_user
from services.llm_service import llm_service
from services.vector_service import get_vector_service, VectorService, SearchResult
from core.telemetry import rag_telemetry
from core.rate_limiter import limiter

router = APIRouter()




# --- BACKGROUND TASK: Auto-generate session title after first message ---
async def generate_chat_title_background(session_id: str, user_query: str, ai_response: str):
    """Generates a short title for a new chat session using the LLM."""
    try:
        title = await llm_service.generate_title(user_query, ai_response)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            statement = select(ChatSession).where(ChatSession.id == session_id)
            result = await session.execute(statement)
            chat_session = result.scalar_one_or_none()
            if chat_session:
                chat_session.title = title
                session.add(chat_session)
                await session.commit()
    except Exception as e:
        print(f"Error generating title: {e}")


def _resolve_llm_config(request: QueryRequest, space) -> None:
    # --- Hard limits: space provider/model constraints cannot be bypassed ---
    if space and space.llm_provider:
        request.mode = space.llm_provider
    elif request.mode is None:
        request.mode = "cloud"  # system default

    if space and space.llm_model:
        request.model = space.llm_model

    # --- Soft defaults: client request values override space values ---
    if request.temperature is None:
        request.temperature = space.temperature if (space and space.temperature is not None) else None

    if request.max_tokens is None:
        request.max_tokens = space.max_tokens if (space and space.max_tokens is not None) else None

    if request.top_p is None:
        request.top_p = space.top_p if (space and space.top_p is not None) else None


async def _prepare_rag_context(
    request: QueryRequest,
    current_user: User,
    session: AsyncSession,
    vector_service: Optional[VectorService],
):
    """Shared logic: resolves/creates session, saves user message, runs RAG search, fetches history."""
    is_new_session = False
    space = None

    # --- Resolve Space (if provided) and verify OWNERSHIP ---
    if request.space_id:
        from models.sql_models import Space
        space_res = await session.execute(
            select(Space)
            .where(Space.id == request.space_id)
            .where(Space.user_id == current_user.id)
        )
        space = space_res.scalar_one_or_none()
        if not space:
            raise HTTPException(status_code=404, detail="Space not found or access denied.")

    _resolve_llm_config(request, space)

    if request.session_id:
        session_id = request.session_id
        chk = await session.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id)
            .where(ChatSession.user_id == current_user.id)
        )
        existing_session = chk.scalar_one_or_none()
        if not existing_session:
            is_new_session = True
        elif existing_session.space_id != request.space_id:
            raise HTTPException(
                status_code=400,
                detail="This chat session belongs to a different space."
            )
    else:
        session_id = str(uuid.uuid4())
        is_new_session = True

    if is_new_session:
        new_sess = ChatSession(
            id=session_id,
            user_id=current_user.id,
            space_id=request.space_id,
            title="New Chat...",
        )
        session.add(new_sess)
        await session.commit()

    user_query = request.messages[-1].content

    # 2. Persist user message
    user_msg_db = ChatHistory(
        session_id=session_id,
        user_id=current_user.id,
        role="user",
        content=user_query,
    )
    session.add(user_msg_db)
    await session.commit()

    # 3. Pre-flight check: verify attached files are fully indexed before RAG search
    # Wrapped in try/except — any failure here should degrade gracefully, NOT cause a 500.
    if request.attached_filenames:
        print(f"🔗 Attached filenames for RAG filter: {request.attached_filenames}")
        try:
            from models.document import Document as DocModel, DocumentStatus as DocStatus
            from core.database import get_session_factory
            not_ready = []
            session_factory = get_session_factory()
            async with session_factory() as check_session:
                for fname in request.attached_filenames:
                    stmt_doc = (
                        select(DocModel)
                        .where(DocModel.user_id == current_user.id)
                        .where(DocModel.filename == fname)
                    )
                    if request.space_id:
                        stmt_doc = stmt_doc.where(DocModel.space_id == request.space_id)
                    res_doc = await check_session.execute(stmt_doc)
                    doc_rows = res_doc.scalars().all()
                    # Pick the most recently uploaded one
                    if not doc_rows:
                        not_ready.append(f"'{fname}' (not found in database)")
                    else:
                        # Find the latest by upload_timestamp
                        latest = max(doc_rows, key=lambda d: d.upload_timestamp)
                        if latest.status != DocStatus.COMPLETED.value:
                            not_ready.append(f"'{fname}' (status: {latest.status})")
            
            if not_ready:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"The following attached files are not yet fully indexed and cannot be queried: "
                        f"{', '.join(not_ready)}. "
                        f"Please wait for indexing to complete or upload via the Knowledge Base tab."
                    )
                )
        except HTTPException:
            raise  # Re-raise 422 so the client gets the proper error
        except Exception as preflight_err:
            # Any other error (SQL, import, etc.) — log and continue rather than 500
            print(f"⚠️ Pre-flight file status check failed (skipping): {preflight_err}")


    # 4. RAG vector search
    search_results = []
    if vector_service:
        try:
            search_results = await vector_service.search(
                user_query,
                user_id=current_user.id,
                limit=8,
                mode=request.mode,
                filenames=request.attached_filenames,
                space_id=request.space_id
            )
        except Exception as e:
            print(f"⚠️ Vector search failed (RAG skipped): {e}")
            search_results = []
    else:
        print("⚠️ VectorService unavailable — skipping vector search")

    rag_context = ""
    sources_data = []
    if not search_results and request.attached_filenames:
        print(f"⚠️ RAG search returned 0 results for attached files: {request.attached_filenames}. "
              f"Check that vectors were upserted to Qdrant successfully.")
    if search_results:
        # Group sources by filename for clarity
        file_groups: dict[str, list[str]] = {}
        for hit in search_results:
            filename = hit.get("filename", "Unknown")
            content = hit.get("text", "")
            score = hit.get("score", 0)
            if filename not in file_groups:
                file_groups[filename] = []
            file_groups[filename].append(content)
            sources_data.append({
                "content": content,
                "score": score,
                "filename": filename,
            })
        
        parts = []
        for fn, chunks in file_groups.items():
            file_section = f"=== Source File: {fn} ===\n"
            for i, chunk in enumerate(chunks, 1):
                file_section += f"[Segment {i}]\n```\n{chunk}\n```\n"
            parts.append(file_section)
        rag_context = "\n\n".join(parts)

    num_unique_files = len(set(s["filename"] for s in sources_data)) if sources_data else 0
    multi_source_instruction = ""
    if num_unique_files > 1:
        filenames_list = ", ".join(set(s["filename"] for s in sources_data))
        multi_source_instruction = (
            f"\n\nIMPORTANT: The context contains segments from {num_unique_files} different files ({filenames_list}). "
            "You MUST reference and cite information from ALL relevant source files in your answer. "
            "When citing, mention the source filename. Do NOT focus exclusively on one file while ignoring others. "
            "If the user's question is relevant to multiple files, compare and contrast information across them."
        )

    full_context = f"--- DOCUMENT CONTEXT ---\n{rag_context}{multi_source_instruction}"

    # 5. Fetch recent conversation history (last 10 turns)
    stmt = (
        select(ChatHistory)
        .where(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.timestamp.desc())
        .limit(10)
    )
    result = await session.execute(stmt)
    history_records = result.scalars().all()
    history_messages = [
        {"role": m.role, "content": m.content} for m in reversed(history_records)
    ]

    if space and space.system_prompt:
        history_messages.insert(0, {"role": "system", "content": space.system_prompt})

    return session_id, is_new_session, user_query, full_context, sources_data, history_messages


# ---------------------------------------------------------------------------
# POST /chat/query  (non-streaming, returns full JSON response)
# ---------------------------------------------------------------------------
@router.post("/query", response_model=QueryResponse)
@limiter.limit("30/minute")
async def handle_query(
    request: Request,
    body: QueryRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    vector_service: Optional[VectorService] = Depends(get_vector_service),
):
    start_time = time.time()
    query_id = str(int(time.time() * 1000))

    session_id, is_new_session, user_query, full_context, sources_data, history_messages = (
        await _prepare_rag_context(body, current_user, session, vector_service)
    )

    # Generate full response
    llm_start = time.time()
    try:
        response_text, used_model = await llm_service.generate_response(
            body, full_context, history_messages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
    llm_latency = time.time() - llm_start

    latency = time.time() - start_time

    # Generate dynamic follow-up suggestions
    try:
        suggested_prompts = await llm_service.generate_suggestions(
            user_query, response_text, body.mode, body.model
        )
    except Exception:
        suggested_prompts = []

    # Persist AI response
    ai_msg_db = ChatHistory(
        session_id=session_id,
        user_id=current_user.id,
        role="assistant",
        content=response_text,
        sources=json.dumps(sources_data) if sources_data else None
    )
    # Retrieve telemetry metrics
    metrics = rag_telemetry.get() or {"dense_latency": 0.0, "sparse_latency": 0.0, "rerank_latency": 0.0}
    dense_latency = metrics.get("dense_latency", 0.0)
    sparse_latency = metrics.get("sparse_latency", 0.0)
    rerank_latency = metrics.get("rerank_latency", 0.0)
    tokens_generated = len(response_text) // 4
    tokens_per_second = tokens_generated / llm_latency if llm_latency > 0 else 0.0

    from models.telemetry_log import TelemetryLog
    telemetry_entry = TelemetryLog(
        query_id=query_id,
        user_id=current_user.id,
        dense_latency=dense_latency,
        sparse_latency=sparse_latency,
        rerank_latency=rerank_latency,
        llm_latency=llm_latency,
        total_latency=latency,
        tokens_generated=tokens_generated,
        tokens_per_second=tokens_per_second
    )
    session.add(telemetry_entry)
    await session.commit()

    if is_new_session:
        background_tasks.add_task(
            generate_chat_title_background, session_id, user_query, response_text
        )

    return QueryResponse(
        response_text=response_text,
        sources=sources_data,
        latency=latency,
        query_id=query_id,
        mode_used=body.thinking_mode,
        session_id=session_id,
        suggested_prompts=suggested_prompts,
    )


# ---------------------------------------------------------------------------
# POST /chat/stream  (SSE streaming endpoint)
# Emits Server-Sent Events in this order:
#   1. data: {"type":"session","session_id":"...","sources":[...]}
#   2. data: {"type":"token","text":"hello "}   (repeated)
#   3. data: {"type":"done"}
# ---------------------------------------------------------------------------
@router.post("/stream")
@limiter.limit("30/minute")
async def handle_query_stream(
    request: Request,
    body: QueryRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    vector_service: Optional[VectorService] = Depends(get_vector_service),
):
    start_time = time.time()
    query_id = str(int(time.time() * 1000))
    session_id, is_new_session, user_query, full_context, sources_data, history_messages = (
        await _prepare_rag_context(body, current_user, session, vector_service)
    )

    async def event_generator():
        full_response = []
        llm_latency = 0.0
        try:
            # --- Event 1: Send session info + sources before first token ---
            meta_event = json.dumps({
                "type": "session",
                "session_id": session_id,
                "sources": sources_data,
            })
            yield f"data: {meta_event}\n\n"

            # --- Events 2+: Stream tokens ---
            llm_start = time.time()
            async for token in llm_service.generate_response_stream(
                body, full_context, history_messages
            ):
                full_response.append(token)
                token_event = json.dumps({"type": "token", "text": token})
                yield f"data: {token_event}\n\n"
            llm_latency = time.time() - llm_start

            # --- Event 3: Send dynamic follow-up suggestions ---
            response_text = "".join(full_response)
            try:
                suggested_prompts = await llm_service.generate_suggestions(
                    user_query, response_text, body.mode, body.model
                )
            except Exception:
                suggested_prompts = []
            
            suggestions_event = json.dumps({
                "type": "suggestions",
                "prompts": suggested_prompts
            })
            yield f"data: {suggestions_event}\n\n"

            # --- Event: Done ---
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            error_event = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {error_event}\n\n"
            return

        # --- Post-stream: Persist AI response & schedule title generation ---
        response_text = "".join(full_response)
        try:
            async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            async with async_session_factory() as db:
                ai_msg_db = ChatHistory(
                    session_id=session_id,
                    user_id=current_user.id,
                    role="assistant",
                    content=response_text,
                    sources=json.dumps(sources_data) if sources_data else None
                )
                db.add(ai_msg_db)

                # Log Telemetry for streaming query inside same session
                latency = time.time() - start_time
                metrics = rag_telemetry.get() or {"dense_latency": 0.0, "sparse_latency": 0.0, "rerank_latency": 0.0}
                dense_latency = metrics.get("dense_latency", 0.0)
                sparse_latency = metrics.get("sparse_latency", 0.0)
                rerank_latency = metrics.get("rerank_latency", 0.0)
                tokens_generated = len(response_text) // 4
                tokens_per_second = tokens_generated / llm_latency if llm_latency > 0 else 0.0

                from models.telemetry_log import TelemetryLog
                telemetry_entry = TelemetryLog(
                    query_id=query_id,
                    user_id=current_user.id,
                    dense_latency=dense_latency,
                    sparse_latency=sparse_latency,
                    rerank_latency=rerank_latency,
                    llm_latency=llm_latency,
                    total_latency=latency,
                    tokens_generated=tokens_generated,
                    tokens_per_second=tokens_per_second
                )
                db.add(telemetry_entry)
                
                await db.commit()
        except Exception as e:
            print(f"⚠️ Failed to persist streamed AI response/telemetry: {e}")

        if is_new_session and response_text:
            background_tasks.add_task(
                generate_chat_title_background, session_id, user_query, response_text
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/feedback")
async def log_feedback(
    data: FeedbackRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Persist user feedback (thumbs up/down) for a query to the FeedbackLog table."""
    feedback_entry = FeedbackLog(
        query_id=data.query_id,
        user_query=data.user_query,
        ai_response=data.ai_response,
        rating=data.rating,
        comment=data.comment,
    )
    session.add(feedback_entry)
    await session.commit()
    return {"status": "logged", "query_id": data.query_id}