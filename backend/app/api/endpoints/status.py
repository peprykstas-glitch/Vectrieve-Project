from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi.responses import StreamingResponse
import json

from models.document import Document, DocumentRead, DocumentChunk
from models.user import User
from core.database import get_session
from api.deps import get_current_user

router = APIRouter()


@router.get("/status/{document_id}", response_model=DocumentRead)
async def get_document_status(
    document_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Returns the processing status of a document. Only the document owner can check it."""
    statement = select(Document).where(
        Document.id == document_id,
        Document.user_id == current_user.id,
    )
    result = await session.execute(statement)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("/models/local")
async def list_local_models(current_user: User = Depends(get_current_user)):
    """Return all models currently pulled and ready in Ollama."""
    try:
        from ollama import Client
        from core.config import settings
        
        client = Client(host=settings.OLLAMA_BASE_URL)
        models_data = client.list().models
        # Models are items with a 'model' attribute in ollama-python v0.6+
        models = [m.model for m in models_data]
        return {"models": models}
    except Exception as e:
        print(f"⚠️ Ollama model listing failed: {e}")
        return {"models": [], "error": str(e)}


@router.get("/models/pull-stream")
async def pull_model_stream(model: str, current_user: User = Depends(get_current_user)):
    """SSE streaming endpoint to pull a model from Ollama library."""
    from ollama import AsyncClient
    from core.config import settings

    async def sse_generator():
        try:
            client = AsyncClient(host=settings.OLLAMA_BASE_URL)
            response = await client.pull(model=model, stream=True)
            async for chunk in response:
                status_text = chunk.get("status", "")
                completed = chunk.get("completed") or 0
                total = chunk.get("total") or 0
                percentage = 0
                if total > 0:
                    percentage = int((completed / total) * 100)
                
                payload = {
                    "status": status_text,
                    "percentage": percentage,
                    "completed": completed,
                    "total": total
                }
                yield f"data: {json.dumps(payload)}\n\n"

            # Only emit success if no exception was raised
            yield "data: {\"status\": \"success\", \"percentage\": 100}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
            return

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@router.get("/documents/{document_id}/chunks")
async def get_document_chunks(
    document_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all extracted text segments for a specific document."""
    # Verify owner or space membership
    doc_stmt = select(Document).where(Document.id == document_id)
    doc_res = await session.execute(doc_stmt)
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    is_authorized = (doc.user_id == current_user.id)
    if not is_authorized and doc.space_id:
        from models.sql_models import SpaceMember
        m_stmt = select(SpaceMember).where(
            SpaceMember.space_id == doc.space_id,
            SpaceMember.user_id == current_user.id
        )
        m_res = await session.execute(m_stmt)
        if m_res.scalar_one_or_none():
            is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")

    stmt = select(DocumentChunk).where(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index.asc())
    result = await session.execute(stmt)
    chunks = result.scalars().all()
    
    summary = doc.summary
    segments = []
    
    # Backward-compatible fallback for legacy uploads:
    for c in chunks:
        if c.chunk_index == -1:
            if not summary:
                summary = c.content
        elif c.chunk_index >= 0:
            segments.append({"index": c.chunk_index, "content": c.content})
            
    return {
        "summary": summary,
        "chunks": segments
    }


@router.post("/documents/{document_id}/summary")
async def generate_document_summary(
    document_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate or re-generate an AI Executive Briefing for an existing document."""
    doc_stmt = select(Document).where(Document.id == document_id)
    doc_res = await session.execute(doc_stmt)
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    is_authorized = (doc.user_id == current_user.id)
    if not is_authorized and doc.space_id:
        from models.sql_models import SpaceMember
        m_stmt = select(SpaceMember).where(
            SpaceMember.space_id == doc.space_id,
            SpaceMember.user_id == current_user.id
        )
        m_res = await session.execute(m_stmt)
        if m_res.scalar_one_or_none():
            is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")

    stmt = select(DocumentChunk).where(
        DocumentChunk.document_id == document_id,
        DocumentChunk.chunk_index >= 0
    ).order_by(DocumentChunk.chunk_index.asc())
    result = await session.execute(stmt)
    chunks = result.scalars().all()
    chunk_texts = [c.content for c in chunks if c.content]

    if not chunk_texts:
        # Fallback: retrieve chunk text from Qdrant vector collection
        try:
            from services.vector_service import vector_service
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            client = await vector_service._get_client()
            must_filters = []
            if doc.space_id:
                must_filters.append(FieldCondition(key="space_id", match=MatchValue(value=str(doc.space_id))))
            if doc.filename:
                must_filters.append(FieldCondition(key="filename", match=MatchValue(value=doc.filename)))
            if must_filters:
                res, _ = await client.scroll(
                    collection_name=vector_service.collection_name,
                    scroll_filter=Filter(must=must_filters),
                    limit=100,
                    with_payload=True
                )
                if res:
                    chunk_texts = [p.payload.get("text", "") for p in res if p.payload.get("text")]
                    for idx, txt in enumerate(chunk_texts):
                        db_c = DocumentChunk(document_id=doc.id, user_id=doc.user_id, content=txt.replace("\x00", ""), chunk_index=idx)
                        session.add(db_c)
                    await session.commit()
        except Exception as q_err:
            pass

    if not chunk_texts:
        raise HTTPException(status_code=400, detail="Document has no text chunks to summarize.")

    from services.pdf_parser import _sample_chunks
    from services.llm_service import llm_service
    from models.schemas import QueryRequest, ChatMessage
    from models.user_settings import UserSettings

    sampled = _sample_chunks(chunk_texts, n=8, max_chars=6000)
    summary_input = "\n\n".join(sampled)
    summary_prompt = f"""
You are Vectrieve Core, a premium business document intelligence analyzer.
Provide a highly structured, polished, and extremely concise Executive Briefing for this document in English.
Outline:
1. Document Category (e.g. Resume/CV, SLA, NDA, Corporate Guideline, FAQ, Research)
2. High-level Summary (1-2 sentences)
3. Key Takeaways or Highlighted Skills (bullet points)
4. Key Risks, Warnings, or Compliance Issues (bullet points or "None")

Format headings clearly as bold text like **Document Category:** or **Key Takeaways:**. Use standard bullet points. Keep it professional.

Document Sample:
"{summary_input}"
"""
    req = QueryRequest(
        messages=[ChatMessage(role="user", content=summary_prompt)],
        thinking_mode="auditor",
    )

    user_groq_key = None
    try:
        st_res = await session.execute(
            select(UserSettings).where(UserSettings.user_id == current_user.id)
        )
        u_set = st_res.scalar_one_or_none()
        if u_set and u_set.groq_api_key:
            user_groq_key = u_set.groq_api_key
    except Exception:
        pass

    try:
        summary_text, _ = await llm_service.generate_response(req, "", groq_api_key=user_groq_key)
        if summary_text:
            doc.summary = summary_text.strip()
            session.add(doc)
            await session.commit()
            await session.refresh(doc)
            return {"summary": doc.summary, "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Model returned empty summary.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {e}")