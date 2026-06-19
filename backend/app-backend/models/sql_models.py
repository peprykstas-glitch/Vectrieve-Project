from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

# 👇 НОВА ТАБЛИЦЯ
class ChatSession(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: Optional[str] = Field(default="New Chat")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    role: str  # user / assistant
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FeedbackLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query_id: str
    user_query: str
    ai_response: str
    rating: int
    comment: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FileRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True)
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    size: int = 0
    status: str = Field(default="processing") # processing / completed / failed
    chunks_count: int = 0
    