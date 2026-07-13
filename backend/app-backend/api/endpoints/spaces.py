import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete as sql_delete

from models.sql_models import Space, ChatSession, ChatHistory
from models.document import Document, DocumentChunk
from models.schemas import SpaceCreate, SpaceUpdate, SpaceRead
from models.user import User
from core.database import get_session
from api.deps import get_current_user
from services.vector_service import get_vector_service

router = APIRouter()


@router.get("", response_model=List[SpaceRead])
async def list_spaces(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all spaces owned by the current user."""
    stmt = (
        select(Space)
        .where(Space.user_id == current_user.id)
        .order_by(Space.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
async def create_space(
    body: SpaceCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new space."""
    space = Space(
        id=str(uuid.uuid4()),
        name=body.name,
        system_prompt=body.system_prompt,
        user_id=current_user.id,
    )
    session.add(space)
    await session.commit()
    await session.refresh(space)
    return space


@router.patch("/{space_id}", response_model=SpaceRead)
async def update_space(
    space_id: str,
    body: SpaceUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update space details."""
    stmt = select(Space).where(Space.id == space_id).where(Space.user_id == current_user.id)
    res = await session.execute(stmt)
    space = res.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    if body.name is not None:
        space.name = body.name
    if body.system_prompt is not None:
        space.system_prompt = body.system_prompt

    session.add(space)
    await session.commit()
    await session.refresh(space)
    return space


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space(
    space_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a space and all its associated documents, vectors, and chat history."""
    stmt = select(Space).where(Space.id == space_id).where(Space.user_id == current_user.id)
    res = await session.execute(stmt)
    space = res.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # 1. Delete all documents, chunks, and vectors in this space
    doc_stmt = select(Document).where(Document.space_id == space_id).where(Document.user_id == current_user.id)
    doc_res = await session.execute(doc_stmt)
    docs = doc_res.scalars().all()

    vs = get_vector_service()
    for doc in docs:
        if vs:
            try:
                vs.delete_file(doc.filename, current_user.id, space_id=space_id)
            except Exception as e:
                print(f"⚠️ Vector deletion failed for '{doc.filename}' during space deletion: {e}")
        
        # Delete chunks for this document
        await session.execute(
            sql_delete(DocumentChunk).where(DocumentChunk.document_id == doc.id)
        )
        await session.delete(doc)

    # 2. Delete all chat sessions and history in this space
    sess_stmt = select(ChatSession).where(ChatSession.space_id == space_id).where(ChatSession.user_id == current_user.id)
    sess_res = await session.execute(sess_stmt)
    sessions = sess_res.scalars().all()

    for sess in sessions:
        await session.execute(
            sql_delete(ChatHistory).where(ChatHistory.session_id == sess.id)
        )
        await session.delete(sess)

    # 3. Delete the Space itself
    await session.delete(space)
    await session.commit()
    return None
