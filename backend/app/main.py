import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router  # Ми створимо цей файл нижче

# 1. Sentry Init
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=1.0,
    _experiments={"profiles_sample_rate": 1.0},
    send_default_pii=True
)

# 2. App Setup
app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# 3. Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Include Routes (Ось де магія модульності)
app.include_router(api_router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION, "mode": "Refactored 🚀"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)