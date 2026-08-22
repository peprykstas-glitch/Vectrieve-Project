from typing import Optional
from models.schemas import QueryRequest
from models.sql_models import Space


def resolve_llm_config(request: QueryRequest, space: Optional[Space]) -> None:
    """
    Merges Space-level LLM configuration into a QueryRequest in-place.
    Hard limits (provider/model): space always wins, cannot be bypassed by the client.
    Soft defaults (temperature/max_tokens/top_p): client value wins if explicitly set.
    """
    if space and space.llm_provider:
        request.mode = space.llm_provider
    elif request.mode is None:
        request.mode = "cloud"  # system default

    if space and space.llm_model:
        request.model = space.llm_model

    if request.temperature is None:
        request.temperature = space.temperature if (space and space.temperature is not None) else None
    if request.max_tokens is None:
        request.max_tokens = space.max_tokens if (space and space.max_tokens is not None) else None
    if request.top_p is None:
        request.top_p = space.top_p if (space and space.top_p is not None) else None

    if space and space.system_prompt:
        request.space_system_prompt = space.system_prompt
