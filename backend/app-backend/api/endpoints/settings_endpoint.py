"""
Settings endpoint — per-user configuration stored in the database.

Security fix: the previous implementation wrote raw POST body values directly
into the .env file on disk via filesystem file I/O. That is an arbitrary file
write vulnerability: any authenticated user could overwrite system configuration
keys, inject malicious values, or corrupt the server's environment.

This version stores all settings in the UserSettings database table, keyed by
user_id, and applies changes in-memory immediately (no filesystem writes).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from services.vector_service import get_vector_service, VectorService
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_session
from api.deps import get_current_user
from models.user import User
from models.user_settings import UserSettings

router = APIRouter()


class SettingsUpdate(BaseModel):
    selected_local_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    qdrant_url: Optional[str] = None
    qdrant_api_key: Optional[str] = None
    ollama_url: Optional[str] = None


@router.get("")
async def get_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return the current user's settings, falling back to server defaults."""
    stmt = select(UserSettings).where(UserSettings.user_id == current_user.id)
    result = await session.execute(stmt)
    user_cfg = result.scalar_one_or_none()

    return {
        "selected_local_model": (user_cfg.local_model_name if user_cfg else None) or settings.LOCAL_MODEL_NAME,
        "groq_api_key": (user_cfg.groq_api_key if user_cfg else None) or settings.GROQ_API_KEY,
        "qdrant_url": (user_cfg.qdrant_url if user_cfg else None) or settings.QDRANT_URL,
        "qdrant_api_key": (user_cfg.qdrant_api_key if user_cfg else None) or settings.QDRANT_API_KEY,
        "ollama_url": (user_cfg.ollama_url if user_cfg else None) or settings.OLLAMA_BASE_URL,
    }


@router.post("")
async def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    vs: Optional[VectorService] = Depends(get_vector_service),
):
    """
    Persist user settings to the database (NOT the .env file).
    Also apply changes in-memory immediately so they take effect without restart.
    """
    stmt = select(UserSettings).where(UserSettings.user_id == current_user.id)
    result = await session.execute(stmt)
    user_cfg = result.scalar_one_or_none()

    if user_cfg is None:
        user_cfg = UserSettings(user_id=current_user.id)
        session.add(user_cfg)

    # Persist to DB
    if payload.selected_local_model is not None:
        user_cfg.local_model_name = payload.selected_local_model
    if payload.groq_api_key is not None:
        user_cfg.groq_api_key = payload.groq_api_key
    if payload.qdrant_url is not None:
        user_cfg.qdrant_url = payload.qdrant_url
    if payload.qdrant_api_key is not None:
        user_cfg.qdrant_api_key = payload.qdrant_api_key
    if payload.ollama_url is not None:
        user_cfg.ollama_url = payload.ollama_url

    await session.commit()

    # Apply in-memory immediately so changes take effect without a server restart
    if payload.selected_local_model is not None:
        object.__setattr__(settings, "LOCAL_MODEL_NAME", payload.selected_local_model)
    if payload.groq_api_key is not None:
        object.__setattr__(settings, "GROQ_API_KEY", payload.groq_api_key)
        from services.llm_service import llm_service
        if payload.groq_api_key:
            from groq import AsyncGroq
            llm_service.groq_client = AsyncGroq(api_key=payload.groq_api_key)
        else:
            llm_service.groq_client = None
    if payload.qdrant_url is not None:
        object.__setattr__(settings, "QDRANT_URL", payload.qdrant_url)
    if payload.qdrant_api_key is not None:
        object.__setattr__(settings, "QDRANT_API_KEY", payload.qdrant_api_key)
    if payload.qdrant_url is not None or payload.qdrant_api_key is not None:
        if vs and settings.QDRANT_URL and settings.QDRANT_API_KEY:
            from qdrant_client import QdrantClient
            vs.cloud_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
    if payload.ollama_url is not None:
        object.__setattr__(settings, "OLLAMA_BASE_URL", payload.ollama_url)
        if vs:
            from ollama import Client
            vs.ollama_client = Client(host=settings.OLLAMA_BASE_URL)
        from services.llm_service import llm_service
        llm_service._ollama_host = settings.OLLAMA_BASE_URL

    return {"status": "success", "message": "Settings saved to database."}
