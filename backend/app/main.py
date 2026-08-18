import sys
import os
from pathlib import Path

# Ensure stdout uses UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure app-backend is on sys.path so bare imports work regardless of cwd
APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api.api import api_router
from core.config import settings
from core.database import init_db, engine
from core.rate_limiter import limiter
import models


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] Initializing Database...")
    await init_db()
    print("[OK] Database ready!")
    yield
    print("[INFO] Shutting down...")
    await engine.dispose()
    print("[OK] Database connection closed.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

# --- Rate limiting (Issue C fix) ---
# Attach limiter state and middleware so @limiter.limit() decorators work
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# --- CORS for Next.js frontend ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.26:3000",  # LAN access — office network
        "http://vectrieve.duckdns.org",
        "https://vectrieve.duckdns.org",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION, "mode": "Refactored 🚀"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
 