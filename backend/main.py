import time
import traceback
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
import uuid #for generating uniq ID

# Project modules
from app.vector_store import vector_db
from app.config import settings
from app.schemas import QueryRequest, QueryResponse
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

print(f"🔌 Connecting to Ollama at: {settings.OLLAMA_HOST}")
print(f"🤖 Using Model: {settings.OLLAMA_MODEL}")

client = AsyncOpenAI(
    base_url=settings.OLLAMA_HOST,
    api_key=settings.OLLAMA_API_KEY 
)

# --- 🔪 CHUNKING FUNCTION ---
def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200):
    """text cutter."""
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
    """Health check endpoint to verify backend and DB status."""
    try:
        info = vector_db.client.get_collection(vector_db.collection_name)
        db_status = f"Connected. Docs count: {info.points_count}"
    except Exception as e:
        db_status = f"Error: {str(e)}"

    return {
        "status": "ok", 
        "model": settings.OLLAMA_MODEL,
        "database": db_status
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Uploads, CHUNKS and indexes a file into the Vector DB."""
    start_time = time.time()
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    print(f"📥 Uploading file: {file.filename}")
    text_content = await parse_file(file)
    
    if not text_content.strip():
        raise HTTPException(status_code=400, detail="Empty file or parse error")


    chunks = chunk_text(text_content, chunk_size=2000, overlap=200)
    print(f"🔪 Split into {len(chunks)} chunks.")

    try:
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
    """Processes user query using RAG pipeline."""
    start_time = time.time()
    user_query = request.messages[-1].content
    print(f"💬 Query received: {user_query}")
    
    try:
        # 1. Retrieve context from Qdrant (limit=3 is safe now because chunks are small)
        search_results = vector_db.search(user_query, limit=3)
        
        context_parts = []
        for hit in search_results:
            source = hit.payload.get('filename', 'Unknown')
            text = hit.payload.get('content', '')
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

    # 2. System Prompt
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
    
    llm_messages = [{"role": "system", "content": system_prompt}]
    for m in request.messages:
        if m.role != "system":
            llm_messages.append(m.model_dump())

    try:
        # 3. LLM Generation
        print("⏳ Sending request to Ollama...")
        
        temp = request.temperature if request.temperature is not None else 0.3
        target_model = request.model if request.model else settings.OLLAMA_MODEL

        completion = await client.chat.completions.create(
            model=target_model,
            messages=llm_messages,
            temperature=temp
        )
        response_text = completion.choices[0].message.content
        print("✅ Response received from Ollama.")
        
    except Exception as e:
        print(f"❌ LLM GENERATION ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")

    latency = time.time() - start_time
    
    sources = [
        {
            "content": hit.payload['content'][:150] + "...", 
            "score": hit.score,
            "filename": hit.payload.get('filename', 'Unknown')
        } 
        for hit in search_results
    ]
    
    return QueryResponse(
        response_text=response_text,
        sources=sources,
        latency=latency
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)