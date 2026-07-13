import uuid
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Space(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    system_prompt: Optional[str] = Field(default=None)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatSession(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    space_id: Optional[str] = Field(default=None, foreign_key="space.id", index=True)
    title: Optional[str] = Field(default="New Chat")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    role: str  # user / assistant
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sources: Optional[str] = Field(default=None)
    attached_filenames: Optional[str] = Field(default=None)


class FeedbackLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query_id: str
    user_query: str
    ai_response: str
    rating: int
    comment: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
