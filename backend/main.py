import time
import traceback
import csv
import os
os.environ["OLLAMA_HOST"] = "http://127.0.0.1:11434"
from datetime import datetime
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import AsyncGroq
from qdrant_client.http import models
import ollama 

# Project modules
from app.vector_store import vector_db
from app.config import settings
from app.parser import parse_file 

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# --- CONFIGURATION ---
LOCAL_MODEL_NAME = "qwen2.5-coder:7b"

# --- LOGGING ---
LOG_FILE = "chat_logs.csv"
if not os.path.exists(LOG_FILE):
    with open(LOG_FILE, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["Timestamp", "Query", "Response", "Latency", "Model", "Feedback", "QueryID"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq
try:
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    print(f"☁️ Groq Client initialized (Model: {settings.MODEL_NAME})")
except Exception as e:
    client = None
    print(f"⚠️ Groq Init Warning: {e}")

print(f"🤖 Local Model Configured: {LOCAL_MODEL_NAME}")

# --- DATA SCHEMAS ---
class QueryRequest(BaseModel):
    messages: list
    temperature: float = 0.3
    mode: str = "hybrid"  # "cloud" або "local"

class FeedbackRequest(BaseModel):
    query_id: str
    feedback: str
    query: str
    response: str
    latency: float

class DeleteFileRequest(BaseModel):
    filename: str

# --- UTILS ---
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

# --- ENDPOINTS ---

@app.get("/health")
async def health_check():
    try:
        info = vector_db.client.get_collection(vector_db.collection_name)
        db_status = f"Connected. Docs count: {info.points_count}"
    except Exception as e:
        db_status = f"Error: {str(e)}"
    
    try:
        ollama.list()
        ollama_status = "Running 🟢"
    except:
        ollama_status = "Not Detected 🔴 (Run 'ollama serve')"

    return {
        "status": "ok", 
        "local_model": LOCAL_MODEL_NAME,
        "ollama_status": ollama_status,
        "database": db_status
    }

@app.get("/analytics")
async def get_analytics():
    if not os.path.exists(LOG_FILE):
        return {"total": 0, "avg_latency": 0, "likes": 0, "dislikes": 0, "history": [], "models": {}}
    try:
        df = pd.read_csv(LOG_FILE)
        if df.empty: return {"total": 0, "avg_latency": 0, "likes": 0, "dislikes": 0, "history": [], "models": {}}
        
        total = len(df)
        avg_lat = df["Latency"].mean() if "Latency" in df and pd.to_numeric(df["Latency"], errors='coerce').notnull().all() else 0
        likes = len(df[df["Feedback"] == "positive"]) if "Feedback" in df else 0
        dislikes = len(df[df["Feedback"] == "negative"]) if "Feedback" in df else 0
        
        history = []
        if "Timestamp" in df and "Latency" in df:
            history = df[["Timestamp", "Latency"]].tail(50).fillna(0).to_dict(orient="records")
        
        models_stats = df["Model"].value_counts().to_dict() if "Model" in df else {}

        return {
            "total": total,
            "avg_latency": round(float(avg_lat), 2),
            "likes": likes,
            "dislikes": dislikes,
            "history": history,
            "models": models_stats
        }
    except Exception as e:
        print(f"❌ Analytics Error: {e}")
        return {"error": str(e)}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    start_time = time.time()
    if not file.filename: raise HTTPException(status_code=400, detail="No filename provided")
    print(f"📥 Uploading file: {file.filename}")
    
    try:
        text_content = await parse_file(file)
    except Exception as e:
        print(f"❌ Parsing Error: {e}")
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")
    
    if not text_content or not text_content.strip():
        raise HTTPException(status_code=400, detail="Empty file")

    chunks = chunk_text(text_content, chunk_size=2000, overlap=200)
    print(f"🔪 Split into {len(chunks)} chunks.")

    try:
        for i, chunk in enumerate(chunks):
            vector_db.add_document(text=chunk, meta={"filename": file.filename, "chunk_index": i, "total_chunks": len(chunks)})
    except Exception as e:
        print(f"❌ Indexing Error: {e}")
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

    duration = time.time() - start_time
    print(f"✅ File indexed. Duration: {duration:.2f}s")
    return {"status": "success", "filename": file.filename, "chunks_count": len(chunks), "duration": duration}

@app.get("/files")
async def list_files():
    try:
        unique_files = set()
        next_offset = None
        while True:
            res = vector_db.client.scroll(
                collection_name=vector_db.collection_name, limit=2000, with_payload=True, with_vectors=False, offset=next_offset
            )
            points, next_offset = res
            for point in points:
                if point.payload and "filename" in point.payload: unique_files.add(point.payload["filename"])
            if next_offset is None: break
        return {"files": list(unique_files)}
    except Exception as e:
        return {"files": [], "error": str(e)}

@app.post("/delete_file")
async def delete_file(request: DeleteFileRequest):
    try:
        vector_db.client.delete(
            collection_name=vector_db.collection_name,
            points_selector=models.FilterSelector(filter=models.Filter(must=[models.FieldCondition(key="filename", match=models.MatchValue(value=request.filename))])),
        )
        print(f"🗑️ Deleted file: {request.filename}")
        return {"status": "deleted", "filename": request.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def handle_query(request: QueryRequest):
    """🧠 HYBRID BRAIN: Vector Search -> Switch (Local/Cloud) -> Response"""
    start_time = time.time()
    
    # Отримуємо останнє повідомлення користувача
    if isinstance(request.messages[-1], dict):
        user_query = request.messages[-1]['content']
    else:
        user_query = request.messages[-1].content
        
    print(f"💬 Query: {user_query} | Mode: {request.mode}")
    
    # 1. Search Vector DB
    try:
        search_results = vector_db.search(user_query, limit=5)
        context_parts = []
        for hit in search_results:
            source = hit.payload.get('filename', 'Unknown')
            text = hit.payload.get('text', hit.payload.get('content', '')) 
            context_parts.append(f"Source ({source}): {text}")
        context_str = "\n\n".join(context_parts) if context_parts else "No relevant context found."
    except Exception as e:
        print(f"❌ Search Error: {e}")
        context_str = "Error retrieving context."
        search_results = []

    # 2. System Prompt (ОНОВЛЕНО: Більш гнучкий, дозволяє small talk)
    system_prompt = (
        "You are a code analysis assistant. "
        "Your task is to answer the user's question using ONLY the provided CONTEXT below. "
        "Do not apologize. Do not say you are an AI. Do not use outside knowledge. "
        "If the answer is in the Context, extract it. "
        f"--- CONTEXT ---\n{context_str}"
    )
    
    # 3. Message Sanitization (ВАЖЛИВО: Очищаємо повідомлення від сміття для Groq)
    llm_messages = [{"role": "system", "content": system_prompt}]
    
    for m in request.messages:
        # Отримуємо сирі дані
        raw_msg = m if isinstance(m, dict) else m.model_dump()
        
        # Створюємо чистий об'єкт тільки з role і content
        # Це виправляє помилку Error 400 у Groq
        clean_msg = {
            "role": raw_msg.get("role"),
            "content": raw_msg.get("content")
        }
        
        if clean_msg["role"] != "system":
            llm_messages.append(clean_msg)

    # 4. GENERATE RESPONSE (The Magic Switch) 🎚️
    response_text = ""
    used_model = "Unknown"
    temp = request.temperature if request.temperature is not None else 0.3

    force_local = (request.mode == "local") or (not client)

    try:
        # === STRATEGY 1: LOCAL (SECURE) ===
        if force_local:
            print(f"🔒 [SECURE MODE] Using Local Model: {LOCAL_MODEL_NAME}...")
            response = ollama.chat(
                model=LOCAL_MODEL_NAME,
                messages=llm_messages,
                options={'temperature': temp}
            )
            response_text = response['message']['content']
            used_model = LOCAL_MODEL_NAME

        # === STRATEGY 2: CLOUD (GROQ) ===
        else:
            try:
                # Спробувати Groq
                if not client: raise Exception("Groq client not initialized")
                print(f"☁️ [CLOUD] Trying Groq ({settings.MODEL_NAME})...")
                completion = await client.chat.completions.create(
                    model=settings.MODEL_NAME,
                    messages=llm_messages,
                    temperature=temp,
                    max_tokens=1024
                )
                response_text = completion.choices[0].message.content
                used_model = settings.MODEL_NAME
            except Exception as e:
                # Якщо помилка (немає інтернету), перемкнутись на Local
                print(f"⚠️ Cloud failed ({e}). Switching to LOCAL...")
                print(f"🔒 [FALLBACK] Using Local Model: {LOCAL_MODEL_NAME}...")
                response = ollama.chat(
                    model=LOCAL_MODEL_NAME,
                    messages=llm_messages,
                    options={'temperature': temp}
                )
                response_text = response['message']['content']
                used_model = LOCAL_MODEL_NAME + " (Fallback)"

    except Exception as e:
        print(f"❌ Generation Error: {e}")
        # Якщо впало і це, повертаємо помилку користувачеві
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

    latency = time.time() - start_time
    query_id = str(int(time.time() * 1000))

    # Log used model for analytics
    print(f"✅ Response generated using: {used_model} in {latency:.2f}s")

    try:
        with open(LOG_FILE, mode="a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow([datetime.now().isoformat(), user_query, response_text, f"{latency:.2f}", used_model, "", query_id])
    except Exception as log_err:
        print(f"⚠️ Logging Error: {log_err}")

    sources_data = [
        {"content": hit.payload.get('text', '')[:150] + "...", "score": hit.score, "filename": hit.payload.get('filename', 'Unknown')} 
        for hit in search_results
    ]
    
    return {
        "response_text": response_text,
        "sources": sources_data,
        "latency": latency,
        "query_id": query_id
    }

@app.post("/feedback")
async def log_feedback(data: FeedbackRequest):
    try:
        with open(LOG_FILE, mode="a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow([datetime.now().isoformat(), data.query, data.response, f"{data.latency:.2f}", settings.MODEL_NAME, data.feedback, data.query_id])
        return {"status": "logged"}
    except Exception as e:
        print(f"❌ Feedback Error: {e}")
        return {"status": "error", "detail": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)