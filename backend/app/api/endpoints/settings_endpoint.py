"""
Settings endpoint — per-user configuration stored in the database.

Security fix: the previous implementation wrote raw POST body values directly
into the .env file on disk via filesystem file I/O. That is an arbitrary file
write vulnerability: any authenticated user could overwrite system configuration
keys, inject malicious values, or corrupt the server's environment.

This version stores all settings in the UserSettings database table, keyed by
user_id, and applies changes in-memory immediately (no filesystem writes).

Cloud-only note: Ollama / local model settings have been removed because this
server runs in Cloud Enterprise mode only. Local model execution is disabled.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from api.deps import get_current_user
from models.user import User
from models.user_settings import UserSettings

router = APIRouter()

# How many free trial queries a user gets before needing their own Groq key.
TRIAL_QUERY_LIMIT = 20


class SettingsUpdate(BaseModel):
    groq_api_key: Optional[str] = None
    qdrant_url: Optional[str] = None
    qdrant_api_key: Optional[str] = None


@router.get("")
async def get_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return the current user's settings.

    IMPORTANT: groq_api_key returns the user's OWN key or empty string.
    The server .env GROQ_API_KEY is NEVER exposed to users — it is only used
    as the trial key (tracked by trial_queries_used).
    """
    stmt = select(UserSettings).where(UserSettings.user_id == current_user.id)
    result = await session.execute(stmt)
    user_cfg = result.scalar_one_or_none()

    own_groq_key = (user_cfg.groq_api_key if user_cfg else None) or ""
    trial_used = user_cfg.trial_queries_used if user_cfg else 0
    trial_remaining = max(0, TRIAL_QUERY_LIMIT - trial_used)

    return {
        # Cloud AI
        "groq_api_key": own_groq_key,
        "trial_queries_used": trial_used,
        "trial_remaining": trial_remaining,
        "trial_limit": TRIAL_QUERY_LIMIT,
        # Vector DB (user-configurable if they want their own Qdrant)
        "qdrant_url": (user_cfg.qdrant_url if user_cfg else None) or "",
        "qdrant_api_key": (user_cfg.qdrant_api_key if user_cfg else None) or "",
    }


@router.post("")
async def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Persist user settings to the database (NOT the .env file).
    Only cloud-relevant settings are accepted (Groq key, Qdrant config).
    Ollama / local model settings are intentionally excluded.
    """
    stmt = select(UserSettings).where(UserSettings.user_id == current_user.id)
    result = await session.execute(stmt)
    user_cfg = result.scalar_one_or_none()

    if user_cfg is None:
        user_cfg = UserSettings(user_id=current_user.id)
        session.add(user_cfg)

    # Persist to DB
    if payload.groq_api_key is not None:
        user_cfg.groq_api_key = payload.groq_api_key or None  # store None if empty string
    if payload.qdrant_url is not None:
        user_cfg.qdrant_url = payload.qdrant_url or None
    if payload.qdrant_api_key is not None:
        user_cfg.qdrant_api_key = payload.qdrant_api_key or None

    await session.commit()

    return {"status": "success", "message": "Settings saved."}
