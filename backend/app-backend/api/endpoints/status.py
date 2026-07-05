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
    from ollama import Client
    from core.config import settings

    # Define synchronous generator so FastAPI runs it inside thread pool (no blocking)
    def sse_generator():
        try:
            client = Client(host=settings.OLLAMA_BASE_URL)
            response = client.pull(model=model, stream=True)
            for chunk in response:
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
    # Verify owner
    doc_stmt = select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    doc_res = await session.execute(doc_stmt)
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

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