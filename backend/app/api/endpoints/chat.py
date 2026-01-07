from fastapi import APIRouter, HTTPException
from app.models.schemas import QueryRequest, QueryResponse, FeedbackRequest
from app.services.llm_service import llm_service
from app.services.vector_service import vector_service
import time
import csv
from datetime import datetime
from app.core.config import settings

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def handle_query(request: QueryRequest):
    start_time = time.time()
    
    # 1. Отримуємо текст запиту
    user_query = request.messages[-1].content
    
    # 2. Шукаємо контекст (Vector DB)
    search_results = vector_service.search(user_query, limit=5)
    
    context_str = ""
    if search_results:
        parts = [f"Source ({hit.payload.get('filename', '?')}): {hit.payload.get('content', '')}" for hit in search_results]
        context_str = "\n\n".join(parts)

    # 3. Генеруємо відповідь (LLM Service)
    try:
        response_text, used_model = await llm_service.generate_response(request, context_str)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

    latency = time.time() - start_time
    query_id = str(int(time.time() * 1000))

    # 4. Логування (CSV)
    try:
        with open(settings.LOG_FILE, mode="a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow([
                datetime.now().isoformat(), user_query, response_text, 
                f"{latency:.2f}", used_model, "", query_id, request.thinking_mode
            ])
    except Exception as e:
        print(f"⚠️ Log Error: {e}")

    # 5. Формуємо відповідь
    sources_data = [
        {"content": hit.payload.get('content', '')[:150] + "...", "score": hit.score, "filename": hit.payload.get('filename', 'Unknown')}
        for hit in search_results
    ]

    return QueryResponse(
        response_text=response_text,
        sources=sources_data,
        latency=latency,
        query_id=query_id,
        mode_used=request.thinking_mode
    )

@router.post("/feedback")
async def log_feedback(data: FeedbackRequest):
    # (Тут проста логіка логування, можна залишити як було, або теж винести в сервіс)
    try:
        with open(settings.LOG_FILE, mode="a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow([
                datetime.now().isoformat(), data.query, data.response, 
                f"{data.latency:.2f}", settings.MODEL_NAME, data.feedback, data.query_id, "feedback"
            ])
        return {"status": "logged"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}