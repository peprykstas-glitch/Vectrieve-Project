from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session, engine
from models.sql_models import ChatHistory, ChatSession, FeedbackLog
from models.document import Document
from models.user import User
from models.telemetry_log import TelemetryLog
from api.deps import require_admin, get_current_user
from collections import defaultdict
import calendar
import datetime
from datetime import timezone
from typing import Optional

router = APIRouter()

# Track server startup time for uptime reporting
_SERVER_START_TIME = datetime.datetime.now(timezone.utc)


def _period_cutoff(period: str) -> Optional[datetime.datetime]:
    """Return the UTC cutoff datetime for the given period string."""
    now = datetime.datetime.now(timezone.utc)
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
    period: str = Query(default="30d", pattern="^(7d|30d|90d|all)$"),
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
    today_key = datetime.datetime.now(timezone.utc).strftime("%Y-%m-%d")
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
    uptime_seconds = int((datetime.datetime.now(timezone.utc) - _SERVER_START_TIME).total_seconds())

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
        "chart_data": daily_series,
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


# ── ADMIN USER MANAGEMENT ─────────────────────────────────────────────
@router.get("/users")
async def get_all_users_for_admin(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """List all registered users with their approval status and usage."""
    users_stmt = select(User).order_by(User.id.desc())
    result = await session.execute(users_stmt)
    users = result.scalars().all()

    # Get document counts per user
    docs_stmt = select(Document.user_id, func.count(Document.id)).group_by(Document.user_id)
    doc_counts = dict((await session.execute(docs_stmt)).all())

    user_list = []
    for u in users:
        user_list.append({
            "id": u.id,
            "username": u.username,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "is_approved": getattr(u, "is_approved", True),
            "documents_count": doc_counts.get(u.id, 0),
        })

    return {"users": user_list}


@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """Approve a pending user registration and trigger confirmation email."""
    statement = select(User).where(User.id == user_id)
    user = (await session.execute(statement)).scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    user.is_approved = True
    session.add(user)
    await session.commit()

    # Dispatch approval email
    try:
        from services.email_service import send_user_approved_email
        import asyncio
        asyncio.create_task(send_user_approved_email(user.username))
    except Exception as ex:
        print(f"⚠️ Failed to queue approval email: {ex}")

    return {"message": f"User {user.username} approved successfully.", "is_approved": True}


@router.post("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """Toggle user active/suspended state."""
    if user_id == current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot deactivate your own admin account")

    statement = select(User).where(User.id == user_id)
    user = (await session.execute(statement)).scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    session.add(user)
    await session.commit()
    return {"message": f"User {user.username} is now {'active' if user.is_active else 'suspended'}.", "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """Delete a user account and their associated records."""
    if user_id == current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    statement = select(User).where(User.id == user_id)
    user = (await session.execute(statement)).scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    await session.delete(user)
    await session.commit()
    return {"message": f"User {user.username} deleted successfully."}


# ── USER FEEDBACK & FEATURE REQUESTS ─────────────────────────────────
from pydantic import BaseModel
from models.sql_models import Feedback, FeedbackType, FeedbackStatus

class FeedbackCreate(BaseModel):
    type: FeedbackType = FeedbackType.IDEA
    message: str

class FeedbackStatusUpdate(BaseModel):
    status: FeedbackStatus


@router.post("/feedback")
async def submit_user_feedback(
    payload: FeedbackCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit user feature idea or bug report."""
    if not payload.message.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")

    feedback = Feedback(
        user_id=current_user.id,
        user_email=current_user.username,
        type=payload.type,
        message=payload.message.strip(),
        status=FeedbackStatus.NEW,
    )
    session.add(feedback)
    await session.commit()
    await session.refresh(feedback)
    return {"status": "success", "id": feedback.id, "message": "Feedback recorded. Thank you!"}


@router.get("/feedback")
async def get_all_user_feedback(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """Admin view: List all submitted feedback and bug reports."""
    stmt = select(Feedback).order_by(Feedback.id.desc())
    result = await session.execute(stmt)
    feedback_items = result.scalars().all()
    return {"feedback": feedback_items}


@router.patch("/feedback/{feedback_id}")
async def update_feedback_status(
    feedback_id: int,
    payload: FeedbackStatusUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """Admin action: update feedback status (NEW, IN_PROGRESS, RESOLVED)."""
    stmt = select(Feedback).where(Feedback.id == feedback_id)
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Feedback not found")

    item.status = payload.status
    session.add(item)
    await session.commit()
    return {"status": "success", "feedback": item}


@router.delete("/feedback/{feedback_id}")
async def delete_feedback_entry(
    feedback_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """Admin action: delete feedback entry."""
    stmt = select(Feedback).where(Feedback.id == feedback_id)
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Feedback not found")

    await session.delete(item)
    await session.commit()
    return {"status": "success", "message": "Feedback deleted successfully."}