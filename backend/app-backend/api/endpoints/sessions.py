from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete as sql_delete
from typing import List, Optional
from pydantic import BaseModel
import json

from models.sql_models import ChatSession, ChatHistory
from models.user import User
from core.database import get_session
from api.deps import get_current_user
from datetime import datetime

# ─── Response schemas ────────────────────────────────────────────────────────

class ChatHistoryRead(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime
    sources: Optional[List[dict]] = None

class ChatSessionRead(BaseModel):
    id: str
    title: str
    space_id: Optional[str] = None
    created_at: datetime

class ChatSessionWithMessages(ChatSessionRead):
    messages: List[ChatHistoryRead] = []

class RenameChatRequest(BaseModel):
    title: str

class CreateSessionRequest(BaseModel):
    space_id: Optional[str] = None

# ─── Router ──────────────────────────────────────────────────────────────────

router = APIRouter()

@router.get("", response_model=List[ChatSessionRead])
async def list_sessions(
    space_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all sessions for the current user, optionally filtered by space, newest first."""
    if space_id in ("null", "undefined"):
        space_id = None
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .where(ChatSession.space_id == space_id)
        .order_by(ChatSession.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ChatSessionRead)
async def create_session(
    body: CreateSessionRequest = CreateSessionRequest(),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new empty chat session, optionally scoped to a space."""
    import uuid
    if body.space_id in ("null", "undefined"):
        body.space_id = None
    if body.space_id:
        from models.sql_models import Space, SpaceMember
        # Check space existence
        space_res = await session.execute(select(Space).where(Space.id == body.space_id))
        if not space_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Space not found")
        
        # Check membership
        member_stmt = (
            select(SpaceMember)
            .where(SpaceMember.space_id == body.space_id)
            .where(SpaceMember.user_id == current_user.id)
        )
        member_res = await session.execute(member_stmt)
        if not member_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied to this space")

    chat_session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        space_id=body.space_id,
        title="New Chat",
    )
    session.add(chat_session)
    await session.commit()
    await session.refresh(chat_session)
    return chat_session


@router.get("/{session_id}", response_model=ChatSessionWithMessages)
async def get_session_details(
    session_id: str,
    space_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a session with its full message history, checking space compatibility."""
    if space_id in ("null", "undefined"):
        space_id = None
    chat_session = await _get_session_or_404(session, session_id, current_user.id)

    if chat_session.space_id != space_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This chat session belongs to a different space."
        )

    msg_stmt = (
        select(ChatHistory)
        .where(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.timestamp.asc())
    )
    messages = (await session.execute(msg_stmt)).scalars().all()

    return {
        "id": chat_session.id,
        "title": chat_session.title or "New Chat",
        "space_id": chat_session.space_id,
        "created_at": chat_session.created_at,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp,
                "sources": json.loads(m.sources) if getattr(m, "sources", None) else None
            }
            for m in messages
        ],
    }


@router.patch("/{session_id}", response_model=ChatSessionRead)
async def rename_session(
    session_id: str,
    body: RenameChatRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Rename a chat session."""
    chat_session = await _get_session_or_404(session, session_id, current_user.id)
    chat_session.title = body.title.strip() or "New Chat"
    session.add(chat_session)
    await session.commit()
    await session.refresh(chat_session)
    return chat_session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a session and all its messages."""
    chat_session = await _get_session_or_404(session, session_id, current_user.id)

    # Delete all messages first (no cascade in SQLite without FK pragma)
    await session.execute(
        sql_delete(ChatHistory).where(ChatHistory.session_id == session_id)
    )
    await session.delete(chat_session)
    await session.commit()
    return None


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _get_session_or_404(session: AsyncSession, session_id: str, user_id: int) -> ChatSession:
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    )
    result = await session.execute(stmt)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return obj