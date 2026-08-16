from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session, engine
from models.sql_models import ChatHistory, ChatSession, FeedbackLog
from models.document import Document
from models.user import User
from models.telemetry_log import TelemetryLog
from api.deps import require_admin
from collections import defaultdict
import calendar
import datetime
from typing import Optional

router = APIRouter()

# Track server startup time for uptime reporting
_SERVER_START_TIME = datetime.datetime.utcnow()


def _period_cutoff(period: str) -> Optional[datetime.datetime]:
    """Return the UTC cutoff datetime for the given period string."""
    now = datetime.datetime.utcnow()
    if period == "7d":
        return now - datetime.timedelta(days=7)
    elif period == "30d":
        return now - datetime.timedelta(days=30)
    elif period == "90d":
        return now - datetime.timedelta(days=90)
    else:
        return None  # "all" — no filter


@router.get("/stats")
async def get_analytics_stats(
    period: str = Query(default="30d", regex="^(7d|30d|90d|all)$"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    cutoff = _period_cutoff(period)

    # ── 1. Total queries in period ─────────────────────────────────────────
    q_stmt = select(func.count(ChatHistory.id)).where(ChatHistory.role == "user")
    if cutoff:
        q_stmt = q_stmt.where(ChatHistory.timestamp >= cutoff)
    total_queries = (await session.execute(q_stmt)).scalar() or 0

    # ── 2. Active users in period (distinct users who sent a message) ──────
    au_stmt = select(func.count(distinct(ChatHistory.user_id))).where(ChatHistory.role == "user")
    if cutoff:
        au_stmt = au_stmt.where(ChatHistory.timestamp >= cutoff)
    active_users = (await session.execute(au_stmt)).scalar() or 0

    # ── 3. Total Users (all time) ─────────────────────────────────────────
    total_users = (await session.execute(select(func.count(User.id)))).scalar() or 0

    # ── 4. Indexed Documents (all time, completed) ────────────────────────
    docs_stmt = select(func.count(Document.id)).where(Document.status == "COMPLETED")
    indexed_documents = (await session.execute(docs_stmt)).scalar() or 0

    # ── 5. Avg Queries per Session in period ──────────────────────────────
    sessions_stmt = select(func.count(distinct(ChatHistory.session_id))).where(ChatHistory.role == "user")
    if cutoff:
        sessions_stmt = sessions_stmt.where(ChatHistory.timestamp >= cutoff)
    sessions_in_period = (await session.execute(sessions_stmt)).scalar() or 0
    avg_queries = round(total_queries / sessions_in_period, 1) if sessions_in_period > 0 else 0

    # ── 6. Storage and Vector usage ───────────────────────────────────────
    storage_stmt = select(func.sum(Document.file_size), func.sum(Document.chunk_count)).where(Document.status == "COMPLETED")
    storage_row = (await session.execute(storage_stmt)).first()
    total_bytes = storage_row[0] if storage_row and storage_row[0] else 0
    total_vectors = storage_row[1] if storage_row and storage_row[1] else 0
    total_storage_mb = round(total_bytes / (1024 * 1024), 2)

    # ── 7. Satisfaction rate (thumbs up / total feedback) ─────────────────
    thumbs_up = (await session.execute(select(func.count(FeedbackLog.id)).where(FeedbackLog.rating == 1))).scalar() or 0
    thumbs_down = (await session.execute(select(func.count(FeedbackLog.id)).where(FeedbackLog.rating == -1))).scalar() or 0
    total_feedback = thumbs_up + thumbs_down
    satisfaction_rate = round((thumbs_up / total_feedback) * 100, 1) if total_feedback > 0 else None

    # ── 8. Telemetry averages for period ──────────────────────────────────
    tel_stmt = select(
        func.avg(TelemetryLog.dense_latency),
        func.avg(TelemetryLog.sparse_latency),
        func.avg(TelemetryLog.rerank_latency),
        func.avg(TelemetryLog.llm_latency),
        func.avg(TelemetryLog.total_latency),
        func.avg(TelemetryLog.tokens_per_second),
        func.sum(TelemetryLog.tokens_generated)
    )
    if cutoff:
        tel_stmt = tel_stmt.where(TelemetryLog.timestamp >= cutoff)
    tel_row = (await session.execute(tel_stmt)).first()

    dense_avg   = round(tel_row[0] or 0.0, 3) if tel_row else 0.0
    sparse_avg  = round(tel_row[1] or 0.0, 3) if tel_row else 0.0
    rerank_avg  = round(tel_row[2] or 0.0, 3) if tel_row else 0.0
    llm_avg     = round(tel_row[3] or 0.0, 3) if tel_row else 0.0
    total_avg   = round(tel_row[4] or 0.0, 3) if tel_row else 0.0
    tps_avg     = round(tel_row[5] or 0.0, 1) if tel_row else 0.0
    tokens_total = tel_row[6] or 0 if tel_row else 0

    # ── 9. Daily series (queries + docs per day) for the period ───────────
    chat_ts_stmt = select(ChatHistory.timestamp).where(ChatHistory.role == "user")
    if cutoff:
        chat_ts_stmt = chat_ts_stmt.where(ChatHistory.timestamp >= cutoff)
    chat_timestamps = (await session.execute(chat_ts_stmt)).scalars().all()

    docs_ts_stmt = select(Document.upload_timestamp).where(Document.status == "COMPLETED")
    if cutoff:
        docs_ts_stmt = docs_ts_stmt.where(Document.upload_timestamp >= cutoff)
    doc_timestamps = (await session.execute(docs_ts_stmt)).scalars().all()

    daily: dict = defaultdict(lambda: {"queries": 0, "docs": 0})
    for ts in chat_timestamps:
        if ts:
            day_key = ts.strftime("%Y-%m-%d")
            daily[day_key]["queries"] += 1
    for ts in doc_timestamps:
        if ts:
            day_key = ts.strftime("%Y-%m-%d")
            daily[day_key]["docs"] += 1

    # Ensure today always appears even if zero
    today_key = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    if today_key not in daily:
        daily[today_key] = {"queries": 0, "docs": 0}

    daily_series = sorted(
        [{"date": k, "queries": v["queries"], "docs": v["docs"]} for k, v in daily.items()],
        key=lambda x: x["date"]
    )

    # ── 10. Database Connection Pool Health ───────────────────────────────
    pool = engine.pool
    pool_stats = {
        "size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow()
    }

    # ── 11. Server uptime ─────────────────────────────────────────────────
    uptime_seconds = int((datetime.datetime.utcnow() - _SERVER_START_TIME).total_seconds())

    return {
        "period": period,
        "kpi": {
            "total_queries": total_queries,
            "active_users": active_users,
            "total_users": total_users,
            "indexed_documents": indexed_documents,
            "avg_queries_per_session": avg_queries,
            "total_storage_mb": total_storage_mb,
            "total_vectors": total_vectors,
            "satisfaction_rate": satisfaction_rate,
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
        },
        "daily_series": daily_series,
        "telemetry": {
            "dense_avg_sec": dense_avg,
            "sparse_avg_sec": sparse_avg,
            "rerank_avg_sec": rerank_avg,
            "llm_avg_sec": llm_avg,
            "total_avg_sec": total_avg,
            "tokens_per_second_avg": tps_avg,
            "tokens_generated_total": tokens_total,
            "pool": pool_stats,
        },
        "server": {
            "uptime_seconds": uptime_seconds,
            "started_at": _SERVER_START_TIME.isoformat() + "Z",
        }
    }