from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

class TelemetryLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query_id: str = Field(index=True)
    user_id: int = Field(index=True)
    dense_latency: float
    sparse_latency: float
    rerank_latency: float
    llm_latency: float
    total_latency: float
    tokens_generated: int
    tokens_per_second: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
