from fastapi import APIRouter
import pandas as pd
import os
from app.core.config import settings

router = APIRouter()

@router.get("/analytics")
async def get_analytics():
    if not os.path.exists(settings.LOG_FILE):
        return {"total": 0, "avg_latency": 0}
    
    try:
        df = pd.read_csv(settings.LOG_FILE)
        if df.empty: return {"total": 0}
        
        # (Тут твоя стара логіка аналітики)
        total = len(df)
        avg_lat = df["Latency"].mean() if "Latency" in df else 0
        return {"total": total, "avg_latency": round(float(avg_lat), 2)}
    except Exception:
        return {"error": "Read failed"}