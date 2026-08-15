import io
import csv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from core.database import get_session
from models.sql_models import ChatHistory, ChatSession
from models.user import User
from api.deps import get_current_user

router = APIRouter()


@router.get("/chat/{session_id}/json")
async def export_chat_json(
    session_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Export a chat session as JSON. Only the session owner can export it."""
    # Verify session exists AND belongs to the current user
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    chat_session = result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get messages
    msg_stmt = select(ChatHistory).where(
        ChatHistory.session_id == session_id
    ).order_by(ChatHistory.timestamp.asc())
    msg_result = await session.execute(msg_stmt)
    messages = msg_result.scalars().all()

    return {
        "session_id": session_id,
        "title": chat_session.title,
        "created_at": str(chat_session.created_at),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "timestamp": str(m.timestamp),
            }
            for m in messages
        ],
    }


@router.get("/chat/{session_id}/csv")
async def export_chat_csv(
    session_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Export a chat session as CSV. Only the session owner can export it."""
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    chat_session = result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_stmt = select(ChatHistory).where(
        ChatHistory.session_id == session_id
    ).order_by(ChatHistory.timestamp.asc())
    msg_result = await session.execute(msg_stmt)
    messages = msg_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "role", "content"])
    for m in messages:
        writer.writerow([str(m.timestamp), m.role, m.content])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=chat_{session_id[:8]}.csv"},
    )