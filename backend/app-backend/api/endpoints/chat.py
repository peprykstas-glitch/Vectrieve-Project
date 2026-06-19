import uuid
import time
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

# ПРАВИЛЬНІ ІМПОРТИ
from models.schemas import QueryRequest, QueryResponse, FeedbackRequest
from models.sql_models import ChatHistory, ChatSession
from core.database import get_session, engine
from services.llm_service import llm_service
from services.vector_service import vector_service

router = APIRouter()

# --- ФОНОВА ЗАДАЧА ---
async def generate_chat_title_background(session_id: str, user_query: str, ai_response: str):
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

from models.user import User
from api.deps import get_current_user

@router.post("/query", response_model=QueryResponse)
async def handle_query(
    request: QueryRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    start_time = time.time()
    query_id = str(int(time.time() * 1000))
    
    # 1. Сесія
    is_new_session = False
    if request.session_id:
        session_id = request.session_id
        # Перевірка чи існує та належить користувачу
        chk = await session.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id)
            .where(ChatSession.user_id == current_user.id)
        )
        if not chk.scalar_one_or_none():
             is_new_session = True
    else:
        session_id = str(uuid.uuid4())
        is_new_session = True

    if is_new_session:
        new_sess = ChatSession(id=session_id, user_id=current_user.id, title="New Chat...")
        session.add(new_sess)
        await session.commit()

    user_query = request.messages[-1].content

    # 2. Зберігаємо питання юзера
    user_msg_db = ChatHistory(session_id=session_id, user_id=current_user.id, role="user", content=user_query)
    session.add(user_msg_db)
    await session.commit()

    # 3. Пошук (RAG)
    try:
        search_results = await vector_service.search(user_query, user_id=current_user.id, limit=5, mode=request.mode)
    except Exception as e:
        print(f"⚠️ Vector search failed (RAG skipped): {e}")
        search_results = []
    
    # --- ВИПРАВЛЕННЯ: Обробка результатів як словника (dict) ---
    rag_context = ""
    sources_data = []
    
    if search_results:
        parts = []
        for hit in search_results:
            # Тепер це dict, а не об'єкт
            filename = hit.get('filename', 'Unknown')
            content = hit.get('text', '')
            score = hit.get('score', 0)
            
            parts.append(f"Source File ({filename}):\n```\n{content}\n```")
            
            sources_data.append({
                "content": content[:150] + "...",
                "score": score,
                "filename": filename
            })
        rag_context = "\n\n".join(parts)
    # -----------------------------------------------------------

    full_context = f"--- DOCUMENT CONTEXT ---\n{rag_context}"

    # 4. Fetch History for native message array
    statement = select(ChatHistory).where(ChatHistory.session_id == session_id).order_by(ChatHistory.timestamp.desc()).limit(10)
    result = await session.execute(statement)
    history_records = result.scalars().all()
    # history_records includes the user message we just saved, so it's at the end (when reversed)
    history_messages = [{"role": m.role, "content": m.content} for m in reversed(history_records)]

    # 5. Генерація відповіді
    try:
        response_text, used_model = await llm_service.generate_response(request, full_context, history_messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

    latency = time.time() - start_time

    # 6. Зберігаємо відповідь AI
    ai_msg_db = ChatHistory(session_id=session_id, user_id=current_user.id, role="assistant", content=response_text)
    session.add(ai_msg_db)
    await session.commit()

    if is_new_session:
        background_tasks.add_task(generate_chat_title_background, session_id, user_query, response_text)

    return QueryResponse(
        response_text=response_text,
        sources=sources_data,
        latency=latency,
        query_id=query_id,
        mode_used=request.thinking_mode,
        session_id=session_id
    )

@router.post("/feedback")
async def log_feedback(data: FeedbackRequest):
    return {"status": "logged"}