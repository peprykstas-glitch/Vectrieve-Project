from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

# --- 1. Chat Models (Чат) ---

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str

class QueryRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.3
    model: Optional[str] = None
    
    # --- ОСЬ ТВОЇ 3 РЕЖИМИ (ЛОГІКА) ---
    thinking_mode: str = "mentor"  # mentor / auditor / architect
    
    # --- А ЦЕ ТЕХНІЧНИЙ РЕЖИМ (ХМАРА/ЛОКАЛ) ---
    mode: str = "cloud"
    
    # 👇 НОВЕ ПОЛЕ: Дозволяє фронтенду вказати ID чату
    session_id: Optional[str] = None 

class QueryResponse(BaseModel):
    response_text: str
    sources: List[Any] = [] 
    latency: float
    query_id: Optional[str] = None
    mode_used: Optional[str] = None
    
    # 👇 НОВЕ ПОЛЕ: Повертаємо ID сесії назад
    session_id: Optional[str] = None
    suggested_prompts: List[str] = []

# --- 2. Feedback Models ---

class FeedbackRequest(BaseModel):
    query_id: str
    rating: int
    user_query: str = ""
    ai_response: str = ""
    comment: Optional[str] = None

# --- 3. File Models ---

class FileUploadResponse(BaseModel):
    filename: str
    message: str
    doc_id: Optional[str] = None
    chunks_count: Optional[int] = 0
    duration: Optional[float] = 0.0
    status: str = "success"

class DeleteFileRequest(BaseModel):
    filename: str