import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from core.config import settings
from services.llm_service import LLMService
from models.schemas import QueryRequest, ChatMessage

@pytest.mark.asyncio
async def test_persona_instructions_have_ukrainian_polish_rules():
    """Verify that settings.THINKING_MODES contains appropriate guidelines for Ukrainian and Polish."""
    for mode in ["mentor", "auditor", "architect"]:
        instruction = settings.THINKING_MODES[mode]["instruction"]
        assert "Ukrainian" in instruction or "same language" in instruction
        assert "Polish" in instruction or "same language" in instruction
        assert "Grounding" in instruction
        assert "Linguistic Style" in instruction

@pytest.mark.asyncio
async def test_rag_prompt_assembly_with_file_grounding():
    """Verify that generate_response builds prompts using our updated instructions."""
    service = LLMService()
    # Mock groq client response
    service.groq_client = AsyncMock()
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = "Grounding test response"
    service.groq_client.chat.completions.create.return_value = mock_completion

    request = QueryRequest(
        messages=[ChatMessage(role="user", content="Analyze the presentation")],
        thinking_mode="mentor",
        mode="cloud"
    )
    context_str = "=== Source File: П'ять мов Годлевська.pptx ===\n[Segment 1]\nSlide content here"
    
    response, model = await service.generate_response(request, context_str, history_messages=None)
    
    # Assert call arguments
    args, kwargs = service.groq_client.chat.completions.create.call_args
    system_message = kwargs["messages"][0]
    
    assert system_message["role"] == "system"
    assert "Source File: П'ять мов Годлевська.pptx" in system_message["content"]
    assert "Linguistic Style" in system_message["content"]
    assert "Grounding" in system_message["content"]
    assert response == "Grounding test response"

@pytest.mark.asyncio
async def test_generate_suggestions_language_adaptive():
    """Verify that generate_suggestions dynamically instructs the model to use the conversation's language."""
    service = LLMService()
    service.groq_client = AsyncMock()
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    # Mocking returning a valid JSON string as the assistant response
    mock_completion.choices[0].message.content = '["Питання 1?", "Питання 2?", "Питання 3?"]'
    service.groq_client.chat.completions.create.return_value = mock_completion

    # 1. Test Ukrainian query
    suggestions = await service.generate_suggestions(
        user_query="Опиши різновиди книг",
        ai_response="Ось опис різновидів книг...",
        request_mode="cloud"
    )
    
    args, kwargs = service.groq_client.chat.completions.create.call_args
    prompt_text = kwargs["messages"][0]["content"]
    
    assert "Detect the language" in prompt_text
    assert "If Ukrainian" in prompt_text
    assert "Respond ONLY with a raw JSON list of strings" in prompt_text
    assert len(suggestions) == 3
    assert suggestions[0] == "Питання 1?"
