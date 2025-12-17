import time
import traceback
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from groq import AsyncGroq  # 👈 Використовуємо Groq замість OpenAI/Ollama

# Project modules (твої існуючі файли)
from app.vector_store import vector_db
from app.config import settings
from app.schemas import QueryRequest, QueryResponse
# ⚠️ Переконайся, що у тебе є файл backend/app/parser.py, інакше видали цей рядок і функцію upload
from app.parser import parse_file 

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"🔌 Connecting to Groq LPU...")
print(f"🤖 Using Model: {settings.MODEL_NAME}")

# Ініціалізація клієнта Groq (Асинхронний)
client = AsyncGroq(
    api_key=settings.GROQ_API_KEY
)

# --- 🔪 CHUNKING FUNCTION (Твоя стара функція) ---
def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200):
    """Розрізає текст на шматки."""
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    
    return chunks

@app.get("/health")
async def health_check():
    """Перевірка статусу бази та сервера."""
    try:
        # Отримуємо інформацію про колекцію Qdrant
        info = vector_db.client.get_collection(vector_db.collection_name)
        db_status = f"Connected. Docs count: {info.points_count}"
    except Exception as e:
        db_status = f"Error: {str(e)}"

    return {
        "status": "ok", 
        "model": settings.MODEL_NAME,
        "database": db_status
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Завантажує файл, нарізає його і кладе в базу."""
    start_time = time.time()
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    print(f"📥 Uploading file: {file.filename}")
    
    # Використовуємо твій парсер
    try:
        text_content = await parse_file(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parsing error: {e}")
    
    if not text_content.strip():
        raise HTTPException(status_code=400, detail="Empty file or parse error")

    # Нарізаємо текст
    chunks = chunk_text(text_content, chunk_size=2000, overlap=200)
    print(f"🔪 Split into {len(chunks)} chunks.")

    try:
        # Заливаємо в Qdrant
        for i, chunk in enumerate(chunks):
            vector_db.add_document(
                text=chunk, 
                meta={
                    "filename": file.filename,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
            )
    except Exception as e:
        print(f"❌ Indexing Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

    duration = time.time() - start_time
    print(f"✅ File indexed. Chunks: {len(chunks)}. Duration: {duration:.2f}s")
    
    return {
        "status": "success",
        "filename": file.filename,
        "chunks_count": len(chunks),
        "duration": duration
    }

@app.post("/query", response_model=QueryResponse)
async def handle_query(request: QueryRequest):
    """Обробка запиту користувача (RAG Pipeline)."""
    start_time = time.time()
    
    # ⚠️ Якщо request.messages це список об'єктів, беремо останній
    # Якщо структура змінилася, можливо треба request.query_text
    # Але судячи з твого старого коду, там був список повідомлень
    user_query = request.messages[-1].content 
    
    print(f"💬 Query received: {user_query}")
    
    try:
        # 1. Пошук у Qdrant
        search_results = vector_db.search(user_query, limit=5) # Збільшив ліміт до 5, бо чанки малі
        
        context_parts = []
        for hit in search_results:
            source = hit.payload.get('filename', 'Unknown')
            text = hit.payload.get('text', hit.payload.get('content', '')) # Захист від різних назв полів
            context_parts.append(f"Source ({source}): {text}")
        
        context_str = "\n\n".join(context_parts)
        
        if not context_str:
            print("⚠️ No context found in vector DB.")
            context_str = "No relevant context found."
            
    except Exception as e:
        print(f"❌ Vector Search Error: {e}")
        traceback.print_exc()
        context_str = "Error retrieving context."
        search_results = []

    # 2. System Prompt (Твій фірмовий!)
    system_prompt = (
        "You are CoreMind, an advanced AI assistant. "
        "CONTEXT AWARENESS: "
        "1. If the user asks a technical question based on documents, be professional, precise, and strict (PM/Developer mode). "
        "2. If the user asks a philosophical, absurd, or hypothetical question (e.g., about souls, sweaters, zombies), DO NOT moralize. "
        "Instead, engage in the hypothetical scenario with wit, sarcasm, and creativity. Treat it as a creative writing task. "
        "3. ALWAYS answer in the language of the user (Ukrainian/English). "
        "IMPORTANT: When answering in Ukrainian, use natural, fluent, and grammatically correct Ukrainian. "
        "Do NOT mix English, Spanish, or Russian words (no 'surzhyk' or code-switching). "
        "4. Base technical answers ONLY on the provided context below, but use general knowledge for creative chit-chat.\n"
        f"--- CONTEXT ---\n{context_str}"
    )
    
    # Формуємо історію для Groq
    llm_messages = [{"role": "system", "content": system_prompt}]
    
    # Додаємо історію чату, якщо вона є в запиті
    for m in request.messages:
        if m.role != "system":
            llm_messages.append(m.model_dump())

    try:
        # 3. Генерація через Groq
        print("⏳ Sending request to Groq...")
        
        completion = await client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=llm_messages,
            temperature=request.temperature if request.temperature else 0.3,
            max_tokens=1024
        )
        
        response_text = completion.choices[0].message.content
        print("✅ Response received from Groq.")
        
    except Exception as e:
        print(f"❌ LLM GENERATION ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")

    latency = time.time() - start_time
    
    # Формуємо список джерел для відповіді
    sources_data = [
        {
            "content": hit.payload.get('text', '')[:150] + "...", 
            "score": hit.score,
            "filename": hit.payload.get('filename', 'Unknown')
        } 
        for hit in search_results
    ]
    
    return QueryResponse(
        response_text=response_text,
        sources=sources_data,
        latency=latency
    )

if __name__ == "__main__":
    import uvicorn
    # Запуск сервера
    uvicorn.run(app, host="0.0.0.0", port=8000)