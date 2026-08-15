import contextvars
from typing import Dict, Any, Optional

# ContextVar storing request-scoped RAG latency timings
rag_telemetry: contextvars.ContextVar[Optional[Dict[str, float]]] = contextvars.ContextVar("rag_telemetry", default=None)
