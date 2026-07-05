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
from services.vector_service import get_vector_service

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
        
    # Delete vectors from Qdrant using the lazy singleton (avoids expensive re-initialization)
    vs = get_vector_service()
    if vs:
        vs.delete_file(doc.filename, current_user.id)
    else:
        print(f"⚠️ VectorService unavailable — skipping vector deletion for '{doc.filename}'")
    
    # Delete chunks from SQL
    from sqlmodel import delete as sql_delete
    from models.document import DocumentChunk
    await session.execute(sql_delete(DocumentChunk).where(DocumentChunk.document_id == file_id))
    
    await session.delete(doc)
    await session.commit()
    return None

@router.post("/{file_id}/reindex", response_model=DocumentRead)
async def reindex_file(
    file_id: int,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Force re-indexing of a document from its existing SQL chunks.
    This deletes the vectors from Qdrant and regenerates them.
    """
    stmt = select(Document).where(Document.id == file_id, Document.user_id == current_user.id)
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from models.document import DocumentChunk
    stmt_chunks = select(DocumentChunk).where(DocumentChunk.document_id == file_id)
    chunks_result = await session.execute(stmt_chunks)
    chunks = chunks_result.scalars().all()
    
    if not chunks:
        raise HTTPException(status_code=400, detail="Cannot re-index a document that has no extracted chunks. Please re-upload.")

    # Delete existing vectors from Qdrant
    vs = get_vector_service()
    if vs:
        vs.delete_file(doc.filename, current_user.id)

    async def reindex_background():
        from core.database import get_session_factory
        session_factory = get_session_factory()
        from services.ws_manager import manager
        
        async def send_ws(status_val: str):
            payload = {"type": "file_status", "doc_id": doc.id, "status": status_val}
            await manager.send_personal_message(payload, current_user.id)
            
        async with session_factory() as bg_session:
            try:
                # Update status to processing
                stmt_bg = select(Document).where(Document.id == file_id)
                res_bg = await bg_session.execute(stmt_bg)
                bg_doc = res_bg.scalar_one()
                bg_doc.status = "PROCESSING"
                await bg_session.commit()
                await send_ws("PROCESSING")
                
                # Fetch chunks text
                chunk_texts = [c.content for c in sorted(chunks, key=lambda x: x.chunk_index)]
                
                if vs and chunk_texts:
                    await send_ws("EMBEDDING")
                    bg_doc.status = "EMBEDDING"
                    await bg_session.commit()
                    await vs.upsert_batch(chunk_texts, bg_doc.filename, current_user.id)
                
                bg_doc.status = "COMPLETED"
                await bg_session.commit()
                await send_ws("COMPLETED")
            except Exception as e:
                print(f"Error in reindex_background: {e}")
                # Fetch document again in this session to update status
                try:
                    stmt_bg = select(Document).where(Document.id == file_id)
                    res_bg = await bg_session.execute(stmt_bg)
                    bg_doc = res_bg.scalar_one()
                    bg_doc.status = "FAILED"
                    bg_doc.error_log = str(e)
                    await bg_session.commit()
                except Exception:
                    pass
                await send_ws("FAILED")

    background_tasks.add_task(reindex_background)
    
    doc.status = "PROCESSING"
    await session.commit()
    await session.refresh(doc)
    return doc