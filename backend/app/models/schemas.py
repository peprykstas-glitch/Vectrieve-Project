from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Any, Dict
from datetime import datetime

# --- 1. Chat Models (Чат) ---

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str

class ChatAttachment(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"
    base64_data: Optional[str] = None  # Base64 data (e.g. data:image/png;base64,... or raw base64)
    extracted_text: Optional[str] = None  # Optional pre-extracted text

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

    # 👇 НОВЕ ПОЛЕ: Обмежує RAG пошук тільки прикріпленими файлами (якщо використовується)
    attached_filenames: Optional[List[str]] = None 

    # 👇 ЕФЕМЕРНІ ВКЛАДЕННЯ: Прямі вкладення файлів та зображень без запису у векторну БД
    chat_attachments: Optional[List[ChatAttachment]] = None

    space_id: Optional[str] = None
    space_system_prompt: Optional[str] = None

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

KNOWN_CLOUD_MODELS = {
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
    "gemma-7b-it",
}

KNOWN_LOCAL_MODELS = {
    "qwen2.5-coder:7b",
    "qwen2.5-coder",
    "llama3",
    "mistral",
    "gemma",
    "phi3",
}

class SpaceLLMConfig(BaseModel):
    llm_provider: Optional[str] = Field(default=None, pattern="^(cloud|local)$")
    llm_model: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_provider_model_compatibility(self) -> 'SpaceLLMConfig':
        provider = self.llm_provider
        model = self.llm_model
        if provider and model:
            # Check for obvious mismatches
            if provider == "local" and model in KNOWN_CLOUD_MODELS:
                raise ValueError(f"Model '{model}' is a cloud-only model, not compatible with local provider.")
            if provider == "cloud" and model in KNOWN_LOCAL_MODELS:
                raise ValueError(f"Model '{model}' is a local-only model, not compatible with cloud provider.")
        return self

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


# --- 5. Space Member Models ---

class SpaceMemberRead(BaseModel):
    id: int
    space_id: str
    user_id: int
    username: str
    role: str

class SpaceMemberInvite(BaseModel):
    username_or_email: str = Field(..., min_length=1)
    role: str = Field(default="Viewer")

class SpaceMemberRoleUpdate(BaseModel):
    role: str = Field(...)