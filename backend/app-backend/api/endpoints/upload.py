import time
from fastapi import APIRouter, UploadFile, BackgroundTasks, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.document import Document, DocumentRead
from models.user import User
from core.database import get_session
from services.pdf_parser import process_pdf_background
from api.deps import get_current_user

router = APIRouter()

@router.post(
    "",
    response_model=DocumentRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_file(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Document:
    """
    Asynchronously receive a file, create a database record, and
    dispatch PDF processing to a background task.
    """
    file_bytes: bytes = await file.read()
    file_size = len(file_bytes)

    doc = Document(filename=file.filename, user_id=current_user.id, file_size=file_size)
    session.add(doc)
    await session.commit()
    await session.refresh(doc)

    # Run file processing in the background
    background_tasks.add_task(
        process_pdf_background,
        doc.id,
        file_bytes,
        file.filename,
        current_user.id,
    )

    return doc

from sqlmodel import select
from fastapi import HTTPException
from services.vector_service import VectorService

@router.get("", response_model=list[DocumentRead])
async def list_files(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all documents for the current user."""
    stmt = select(Document).where(Document.user_id == current_user.id).order_by(Document.upload_timestamp.desc())
    result = await session.execute(stmt)
    return result.scalars().all()

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and its associated vector data."""
    stmt = select(Document).where(Document.id == file_id, Document.user_id == current_user.id)
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete vectors from Qdrant
    vector_service = VectorService()
    vector_service.delete_file(doc.filename, current_user.id)
    
    await session.delete(doc)
    await session.commit()
    return None