from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid


class PasswordResetToken(SQLModel, table=True):
    """One-time password reset tokens. Each token is valid for 1 hour."""
    __tablename__ = "password_reset_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        unique=True,
        index=True,
    )
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: str = Field(default="", index=True)
