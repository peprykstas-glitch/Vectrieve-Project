from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    space_id: Optional[str] = Field(default=None, foreign_key="space.id", index=True)
    filename: str
    file_size: Optional[int] = Field(default=None)
    chunk_count: Optional[int] = Field(default=None)
    upload_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default=DocumentStatus.PENDING.value)
    error_log: Optional[str] = Field(default=None)
    summary: Optional[str] = Field(default=None)


class DocumentRead(SQLModel):
    id: Optional[int] = None
    user_id: int
    space_id: Optional[str] = None
    filename: str
    file_size: Optional[int] = None
    chunk_count: Optional[int] = None
    upload_timestamp: datetime
    status: str
    error_log: Optional[str] = None
    summary: Optional[str] = None


class DocumentChunk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(foreign_key="document.id", index=True)
    user_id: int = Field(index=True)
    content: str
    chunk_index: int