import time
import tempfile
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, UploadFile, BackgroundTasks, Depends, Request, status, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.document import Document, DocumentRead
from models.sql_models import Space
from models.user import User
from core.database import get_session
from services.pdf_parser import process_pdf_background
from api.deps import get_current_user
from core.rate_limiter import limiter

# Chunk size for streaming file writes (256 KB)
_CHUNK_SIZE = 256 * 1024

router = APIRouter()

async def _validate_space_membership(
    space_id: Optional[str], user_id: int, session: AsyncSession
) -> Optional[str]:
    """Ensures space_id (if passed) exists and current user has OWNER or EDITOR role in it."""
    if not space_id or space_id in ("null", "undefined"):
        return None

    # Check if space exists first
    space_res = await session.execute(select(Space).where(Space.id == space_id))
    if not space_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Space not found")

    # Check membership and role
    from models.sql_models import SpaceMember, SpaceRole
    stmt = (
        select(SpaceMember)
        .where(SpaceMember.space_id == space_id)
        .where(SpaceMember.user_id == user_id)
    )
    member_res = await session.execute(stmt)
    member = member_res.scalar_one_or_none()

    if not member or member.role not in (SpaceRole.OWNER, SpaceRole.EDITOR):
        raise HTTPException(status_code=403, detail="Not authorized to write to this space")
    return space_id

@router.post(
    "",
    response_model=DocumentRead,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit("10/minute")
async def upload_file(
    request: Request,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    space_id: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Document:
    """
    Stream the uploaded file to a temp file on disk, create a DB record,
    and dispatch background processing. The file is NEVER fully loaded into
    RAM — prevents OOM when multiple users upload large files concurrently.
    """
    space_id = await _validate_space_membership(space_id, current_user.id, session)

    # Bug 4 fix: stream to disk chunk-by-chunk instead of file.read() into RAM
    suffix = Path(file.filename or "upload").suffix or ".bin"
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = Path(tmp_file.name)
    file_size = 0
    try:
        while True:
            chunk = await file.read(_CHUNK_SIZE)
            if not chunk:
                break
            tmp_file.write(chunk)
            file_size += len(chunk)
    finally:
        tmp_file.close()

    doc = Document(filename=file.filename, user_id=current_user.id, space_id=space_id, file_size=file_size)
    session.add(doc)
    await session.commit()
    await session.refresh(doc)

    # If media file, also persist a permanent copy in media_storage so original recording can be streamed & seeked
    media_extensions = (".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma", ".mp4", ".mov", ".mkv", ".webm")
    is_media = Path(file.filename or "").suffix.lower() in media_extensions
    if is_media:
        try:
            import shutil
            media_dir = Path("/app/data/media_storage") if Path("/app/data").exists() else Path(__file__).resolve().parent.parent / "media_storage"
            media_dir.mkdir(parents=True, exist_ok=True)
            persisted_path = media_dir / f"{doc.id}_{file.filename}"
            shutil.copyfile(tmp_path, persisted_path)
            canonical_path = media_dir / file.filename
            shutil.copyfile(tmp_path, canonical_path)
        except Exception as copy_err:
            print(f"⚠️ Failed to copy media file to persistent media_storage: {copy_err}")

    # process_pdf_background now receives a Path, not raw bytes
    background_tasks.add_task(
        process_pdf_background,
        doc.id,
        tmp_path,
        file.filename,
        current_user.id,
        space_id,
    )

    return doc

from sqlmodel import select
from fastapi import HTTPException
from fastapi.responses import FileResponse
from services.vector_service import get_vector_service, VectorService

@router.get("/media/{filename}")
async def get_media_file(
    filename: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Serve the original uploaded audio/video recording for playback with HTTP Range seeking support."""
    from models.sql_models import SpaceMember

    media_dir = Path("/app/data/media_storage") if Path("/app/data").exists() else Path(__file__).resolve().parent.parent / "media_storage"

    # Look up document by filename accessible to this user
    doc_stmt = select(Document).where(Document.filename == filename)
    doc_res = await session.execute(doc_stmt)
    docs = doc_res.scalars().all()

    accessible_doc = None
    for d in docs:
        if d.user_id == current_user.id:
            accessible_doc = d
            break
        if d.space_id:
            sm_stmt = select(SpaceMember).where(
                SpaceMember.space_id == d.space_id,
                SpaceMember.user_id == current_user.id
            )
            sm_res = await session.execute(sm_stmt)
            if sm_res.scalar_one_or_none():
                accessible_doc = d
                break

    if not accessible_doc and not current_user.is_admin:
        raise HTTPException(status_code=404, detail="Media file not found or unauthorized")

    media_path = None
    if accessible_doc:
        candidate = media_dir / f"{accessible_doc.id}_{accessible_doc.filename}"
        if candidate.exists():
            media_path = candidate

    if not media_path:
        candidate = media_dir / filename
        if candidate.exists():
            media_path = candidate

    if not media_path or not media_path.exists():
        raise HTTPException(status_code=404, detail="Original media recording file not found on server disk")

    import mimetypes
    content_type, _ = mimetypes.guess_type(str(media_path))
    content_type = content_type or "audio/mpeg"

    return FileResponse(
        path=media_path,
        media_type=content_type,
        filename=filename,
        headers={"Accept-Ranges": "bytes"}
    )

@router.get("", response_model=list[DocumentRead])
async def list_files(
    space_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all documents for the current user, filtered by space with membership check."""
    if space_id:
        from models.sql_models import Space, SpaceMember
        # Check space existence
        space_res = await session.execute(select(Space).where(Space.id == space_id))
        if not space_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Space not found")

        # Check membership
        member_stmt = (
            select(SpaceMember)
            .where(SpaceMember.space_id == space_id)
            .where(SpaceMember.user_id == current_user.id)
        )
        member_res = await session.execute(member_stmt)
        if not member_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied to this space")

        stmt = (
            select(Document)
            .where(Document.space_id == space_id)
            .order_by(Document.upload_timestamp.desc())
        )
    else:
        stmt = (
            select(Document)
            .where(Document.user_id == current_user.id)
            .where(Document.space_id.is_(None))
            .order_by(Document.upload_timestamp.desc())
        )

    result = await session.execute(stmt)
    return result.scalars().all()

@router.get("/{file_id}", response_model=DocumentRead)
async def get_file(
    file_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get status of a specific document with space membership checks."""
    stmt = select(Document).where(Document.id == file_id)
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.space_id:
        from models.sql_models import SpaceMember
        member_stmt = (
            select(SpaceMember)
            .where(SpaceMember.space_id == doc.space_id)
            .where(SpaceMember.user_id == current_user.id)
        )
        member_res = await session.execute(member_stmt)
        if not member_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied to this space's documents")
    else:
        if doc.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this private document")

    return doc

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    vs: Optional[VectorService] = Depends(get_vector_service),
):
    """Delete a document and its associated vector data, respecting space roles and ownership."""
    stmt = select(Document).where(Document.id == file_id)
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Author is always allowed to delete
    is_authorized = (doc.user_id == current_user.id)

    if not is_authorized and doc.space_id:
        # OWNER or EDITOR of space is also allowed to delete
        from models.sql_models import SpaceMember, SpaceRole
        member_stmt = (
            select(SpaceMember)
            .where(SpaceMember.space_id == doc.space_id)
            .where(SpaceMember.user_id == current_user.id)
        )
        member_res = await session.execute(member_stmt)
        member = member_res.scalar_one_or_none()
        if member and member.role in (SpaceRole.OWNER, SpaceRole.EDITOR):
            is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")
        
    # Delete vectors from Qdrant using the actual document author's user_id
    if vs:
        vs.delete_file(doc.filename, doc.user_id, space_id=doc.space_id)
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
    vs: Optional[VectorService] = Depends(get_vector_service),
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

    # Delete existing vectors from Qdrant using the injected dependency
    if vs:
        vs.delete_file(doc.filename, current_user.id, space_id=doc.space_id)

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
                    await vs.upsert_batch(chunk_texts, bg_doc.filename, current_user.id, space_id=bg_doc.space_id)
                
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