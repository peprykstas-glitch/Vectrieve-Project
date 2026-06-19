from fastapi import APIRouter

# ПРАВИЛЬНІ ІМПОРТИ (з пробілом і без крапки)
from api.endpoints import auth, export, ws
from api.endpoints import chat, upload, analytics, sessions

api_router = APIRouter()

api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(upload.router, prefix="/upload", tags=["Files"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(export.router, prefix="/export", tags=["Export"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(ws.router, prefix="/ws", tags=["WebSockets"])