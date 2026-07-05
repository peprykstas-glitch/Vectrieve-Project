from fastapi import APIRouter

from api.endpoints import auth, export, ws, status, podcast
from api.endpoints import chat, upload, analytics, sessions, settings_endpoint

api_router = APIRouter()

api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(upload.router, prefix="/upload", tags=["Files"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(export.router, prefix="/export", tags=["Export"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(ws.router, prefix="/ws", tags=["WebSockets"])
api_router.include_router(settings_endpoint.router, prefix="/settings", tags=["Settings"])
api_router.include_router(podcast.router, prefix="/podcast", tags=["Podcast"])
api_router.include_router(status.router, tags=["Status"])