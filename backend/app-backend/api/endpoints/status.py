from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.document import Document, DocumentRead
from core.database import get_session

router = APIRouter()

@router.get("/status/{document_id}", response_model=DocumentRead)
async def get_document_status(document_id: int, session: AsyncSession = Depends(get_session)):
    statement = select(Document).where(Document.id == document_id)
    result = await session.execute(statement)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document