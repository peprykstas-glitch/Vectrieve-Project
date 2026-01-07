from fastapi import APIRouter
from app.api.endpoints import chat, upload, analytics

api_router = APIRouter()

# Підключаємо окремі файли з роутами
api_router.include_router(chat.router, tags=["Chat"])
api_router.include_router(upload.router, tags=["Files"])
api_router.include_router(analytics.router, tags=["Analytics"])