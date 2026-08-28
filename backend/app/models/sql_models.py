import uuid
from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from enum import Enum


def utc_now() -> datetime:
    """Return UTC naive datetime for PostgreSQL TIMESTAMP WITHOUT TIME ZONE compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class SpaceRole(str, Enum):
    OWNER = "Owner"
    EDITOR = "Editor"
    VIEWER = "Viewer"


class SpaceMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    space_id: str = Field(foreign_key="space.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    role: SpaceRole = Field(default=SpaceRole.VIEWER)


class Space(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    system_prompt: Optional[str] = Field(default=None)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=utc_now)

    # --- Phase 1: Per-Space LLM Configuration ---
    llm_provider: Optional[str] = Field(default=None)
    llm_model: Optional[str] = Field(default=None)
    temperature: Optional[float] = Field(default=None)
    max_tokens: Optional[int] = Field(default=None)
    top_p: Optional[float] = Field(default=None)


class ChatSession(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    space_id: Optional[str] = Field(default=None, foreign_key="space.id", index=True)
    title: Optional[str] = Field(default="New Chat")
    created_at: datetime = Field(default_factory=utc_now)


class ChatHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    role: str  # user / assistant
    content: str
    timestamp: datetime = Field(default_factory=utc_now)
    sources: Optional[str] = Field(default=None)
    attached_filenames: Optional[str] = Field(default=None)


class FeedbackLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query_id: str
    user_query: str
    ai_response: str
    rating: int


class FeedbackType(str, Enum):
    IDEA = "IDEA"
    BUG = "BUG"


class FeedbackStatus(str, Enum):
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    user_email: Optional[str] = Field(default=None)
    type: FeedbackType = Field(default=FeedbackType.IDEA)
    message: str
    status: FeedbackStatus = Field(default=FeedbackStatus.NEW)
    created_at: datetime = Field(default_factory=utc_now)

    comment: Optional[str] = None
    timestamp: datetime = Field(default_factory=utc_now)
