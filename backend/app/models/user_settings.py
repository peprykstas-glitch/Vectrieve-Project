"""
UserSettings model — stores per-user runtime configuration in the database.

Replaces the previous insecure approach of writing raw POST body values
directly into the .env file on disk (arbitrary file write vulnerability).
"""
from typing import Optional
from sqlmodel import SQLModel, Field


class UserSettings(SQLModel, table=True):
    """Per-user settings stored in the database."""
    __tablename__ = "user_settings"

    user_id: int = Field(primary_key=True, foreign_key="user.id", index=True)
    local_model_name: Optional[str] = Field(default=None)
    groq_api_key: Optional[str] = Field(default=None)
    qdrant_url: Optional[str] = Field(default=None)
    qdrant_api_key: Optional[str] = Field(default=None)
    ollama_url: Optional[str] = Field(default=None)
    # Trial: tracks how many "free" server-key queries this user has used.
    # Once this reaches TRIAL_QUERY_LIMIT, they must supply their own Groq key.
    trial_queries_used: int = Field(default=0)

