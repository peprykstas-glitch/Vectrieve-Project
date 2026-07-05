from fastapi import APIRouter, Depends
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from models.sql_models import ChatHistory, ChatSession
from models.document import Document
from models.user import User
from api.deps import get_current_user
from collections import defaultdict
import calendar

router = APIRouter()

@router.get("/stats")
async def get_analytics_stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # 1. Total queries
    statement = select(func.count(ChatHistory.id)).where(ChatHistory.role == "user")
    result = await session.execute(statement)
    total_queries = result.scalar() or 0

    # 2. Total indexed documents
    statement_docs = select(func.count(Document.id)).where(Document.status == "COMPLETED")
    result_docs = await session.execute(statement_docs)
    indexed_documents = result_docs.scalar() or 0

    # 3. Total Users
    statement_users = select(func.count(User.id))
    result_users = await session.execute(statement_users)
    total_users = result_users.scalar() or 0

    # 4. Avg Queries per Session
    statement_sessions = select(func.count(ChatSession.id))
    result_sessions = await session.execute(statement_sessions)
    total_sessions = result_sessions.scalar() or 0
    avg_queries = round(total_queries / total_sessions, 1) if total_sessions > 0 else 0

    # 5. Storage and Vector usage
    statement_storage = select(func.sum(Document.file_size), func.sum(Document.chunk_count)).where(Document.status == "COMPLETED")
    result_storage = await session.execute(statement_storage)
    storage_row = result_storage.first()
    total_bytes = storage_row[0] if storage_row and storage_row[0] else 0
    total_vectors = storage_row[1] if storage_row and storage_row[1] else 0
    
    total_storage_mb = round(total_bytes / (1024 * 1024), 2)

    # 6. Formatting Chart Data
    chat_statement = select(ChatHistory.timestamp).where(ChatHistory.role == "user")
    chat_result = await session.execute(chat_statement)
    chat_timestamps = chat_result.scalars().all()

    docs_statement = select(Document.upload_timestamp).where(Document.status == "COMPLETED")
    docs_result = await session.execute(docs_statement)
    doc_timestamps = docs_result.scalars().all()

    grouped_data = defaultdict(lambda: {"queries": 0, "docs": 0})

    for ts in chat_timestamps:
        if ts:
            month_name = calendar.month_abbr[ts.month]
            grouped_data[month_name]["queries"] += 1

    for ts in doc_timestamps:
        if ts:
            month_name = calendar.month_abbr[ts.month]
            grouped_data[month_name]["docs"] += 1

    import datetime
    current_month_abbr = calendar.month_abbr[datetime.datetime.utcnow().month]
    if not grouped_data:
        grouped_data[current_month_abbr] = {"queries": 0, "docs": 0}

    chart_data = []
    for month, counts in grouped_data.items():
        chart_data.append({
            "month": month,
            "queries": counts["queries"],
            "docs": counts["docs"]
        })

    return {
        "kpi": {
            "total_queries": total_queries,
            "indexed_documents": indexed_documents,
            "total_users": total_users,
            "avg_queries_per_session": avg_queries,
            "total_storage_mb": total_storage_mb,
            "total_vectors": total_vectors
        },
        "chart_data": chart_data
    }