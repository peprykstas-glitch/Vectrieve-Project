from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.config import settings
from api.deps import get_current_user
from models.user import User

router = APIRouter()

class SettingsUpdate(BaseModel):
    selected_local_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    qdrant_url: Optional[str] = None
    qdrant_api_key: Optional[str] = None
    ollama_url: Optional[str] = None

@router.get("")
async def get_settings(
    current_user: User = Depends(get_current_user)
):
    return {
        "selected_local_model": settings.LOCAL_MODEL_NAME,
        "groq_api_key": settings.GROQ_API_KEY,
        "qdrant_url": settings.QDRANT_URL,
        "qdrant_api_key": settings.QDRANT_API_KEY,
        "ollama_url": settings.OLLAMA_BASE_URL
    }

@router.post("")
async def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    updates = {}
    if payload.selected_local_model is not None:
        updates["LOCAL_MODEL_NAME"] = payload.selected_local_model
    if payload.groq_api_key is not None:
        updates["GROQ_API_KEY"] = payload.groq_api_key
    if payload.qdrant_url is not None:
        updates["QDRANT_URL"] = payload.qdrant_url
    if payload.qdrant_api_key is not None:
        updates["QDRANT_API_KEY"] = payload.qdrant_api_key
    if payload.ollama_url is not None:
        updates["OLLAMA_BASE_URL"] = payload.ollama_url

    # Write to .env file
    try:
        from pathlib import Path
        env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
        if not env_path.exists():
            env_path = Path(__file__).resolve().parent.parent.parent / ".env"
            
        lines = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                
        env_keys = {}
        for i, line in enumerate(lines):
            if "=" in line and not line.strip().startswith("#"):
                parts = line.split("=", 1)
                if len(parts) == 2:
                    env_keys[parts[0].strip()] = i
                
        for k, v in updates.items():
            if k in env_keys:
                idx = env_keys[k]
                lines[idx] = f"{k}={v}\n"
            else:
                lines.append(f"{k}={v}\n")
                
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
            
        # Update settings in-memory
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
            from services.vector_service import get_vector_service
            vs = get_vector_service()
            if vs:
                from qdrant_client import QdrantClient
                if settings.QDRANT_URL and settings.QDRANT_API_KEY:
                    vs.cloud_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
                else:
                    vs.cloud_client = None
        if payload.ollama_url is not None:
            object.__setattr__(settings, "OLLAMA_BASE_URL", payload.ollama_url)
            from services.vector_service import get_vector_service
            vs = get_vector_service()
            if vs:
                from ollama import Client
                vs.ollama_client = Client(host=settings.OLLAMA_BASE_URL)
                vs._ollama_host = settings.OLLAMA_BASE_URL
                from services.llm_service import llm_service
                llm_service._ollama_host = settings.OLLAMA_BASE_URL
                
        return {"status": "success", "message": "Settings updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings file: {e}")
