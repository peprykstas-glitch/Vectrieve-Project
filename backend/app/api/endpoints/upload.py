from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser_service import parse_file # Якщо ти перейменував файл, зміни імпорт
from app.services.vector_service import vector_service
from app.models.schemas import FileUploadResponse, DeleteFileRequest
import time

router = APIRouter()

def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200):
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    start_time = time.time()
    if not file.filename: raise HTTPException(status_code=400, detail="No filename")
    
    # 1. Parsing
    try:
        text_content = await parse_file(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {e}")

    if not text_content.strip(): raise HTTPException(status_code=400, detail="Empty file")

    # 2. Chunking
    chunks = chunk_text(text_content)

    # 3. Indexing
    try:
        for i, chunk in enumerate(chunks):
            vector_service.add_document(
                text=chunk, 
                meta={"filename": file.filename, "chunk_index": i, "total_chunks": len(chunks)}
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Index error: {e}")

    duration = time.time() - start_time
    return FileUploadResponse(
        status="success", 
        filename=file.filename, 
        chunks_count=len(chunks), 
        duration=duration
    )

@router.get("/files")
async def list_files():
    # Простий обхід через scroll (можна оптимізувати в майбутньому)
    try:
        unique = set()
        offset = None
        while True:
            res = vector_service.client.scroll(
                collection_name=vector_service.collection_name, 
                limit=100, 
                with_payload=True, 
                with_vectors=False, 
                offset=offset
            )
            points, offset = res
            for p in points:
                if p.payload: unique.add(p.payload.get("filename", "Unknown"))
            if offset is None: break
        return {"files": list(unique)}
    except Exception as e:
        return {"files": [], "error": str(e)}

@router.post("/delete_file")
async def delete_file(req: DeleteFileRequest):
    # Тут потрібна логіка видалення через vector_service, 
    # але поки можна залишити прямий виклик клієнта або додати метод в сервіс.
    # Для швидкості:
    from qdrant_client.http import models
    try:
        vector_service.client.delete(
            collection_name=vector_service.collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(must=[
                    models.FieldCondition(key="filename", match=models.MatchValue(value=req.filename))
                ])
            )
        )
        return {"status": "deleted", "filename": req.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))