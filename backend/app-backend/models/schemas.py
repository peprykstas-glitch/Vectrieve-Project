from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# --- 1. Chat Models (Чат) ---

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str

class QueryRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = None
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    
    # --- ОСЬ ТВОЇ 3 РЕЖИМИ (ЛОГІКА) ---
    thinking_mode: str = "mentor"  # mentor / auditor / architect
    
    # --- А ЦЕ ТЕХНІЧНИЙ РЕЖИМ (ХМАРА/ЛОКАЛ) ---
    mode: Optional[str] = None
    
    # 👇 НОВЕ ПОЛЕ: Дозволяє фронтенду вказати ID чату
    session_id: Optional[str] = None

    # 👇 НОВЕ ПОЛЕ: Обмежує RAG пошук тільки прикріпленими файлами
    attached_filenames: Optional[List[str]] = None 
    space_id: Optional[str] = None

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

class SpaceLLMConfig(BaseModel):
    llm_provider: Optional[str] = Field(default=None, pattern="^(cloud|local)$")
    llm_model: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)

class SpaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    system_prompt: Optional[str] = None
    llm_config: Optional[SpaceLLMConfig] = None

class SpaceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    system_prompt: Optional[str] = None
    llm_config: Optional[SpaceLLMConfig] = None

class SpaceRead(BaseModel):
    id: str
    name: str
    system_prompt: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    created_at: datetime