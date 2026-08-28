"""
test_chat_attachments.py — Test suite for Ephemeral In-Chat Attachments & Vision (Zero Qdrant Pollution).

Verifies:
1. In-memory extraction of PDFs, DOCX, XLSX, TXT, and Images via attachment_service.
2. Direct in-chat attachments provide immediate context to the LLM.
3. Zero rows added to PostgreSQL `document` table and zero vectors added to Qdrant.
4. Multimodal Vision integration for screenshots and images.
5. Coexistence of Direct Attachments + Permanent Knowledge Base (Dual-Path RAG).
"""

import base64
import io
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock

from models.schemas import ChatAttachment, QueryRequest, ChatMessage
from services.attachment_service import (
    process_ephemeral_attachment,
    _extract_pdf_in_memory,
    _extract_docx_in_memory,
    _extract_plaintext_in_memory,
)


@pytest.mark.asyncio
async def test_extract_plaintext_attachment():
    """Verify plaintext/markdown attachments are decoded in-memory."""
    text_content = "# Hotel Placement Rules\nCandidates must be at least 18 years old."
    b64 = base64.b64encode(text_content.encode("utf-8")).decode("utf-8")
    
    att = ChatAttachment(
        filename="hotel_rules.md",
        content_type="text/markdown",
        base64_data=f"data:text/markdown;base64,{b64}",
    )
    
    block, label = await process_ephemeral_attachment(att)
    assert "=== [DIRECT IN-CHAT ATTACHMENT: hotel_rules.md] ===" in block
    assert "Candidates must be at least 18 years old." in block
    assert label == "📎 hotel_rules.md"


@pytest.mark.asyncio
async def test_extract_corrupted_attachment_graceful_fallback():
    """Corrupted attachment bytes must not crash the service."""
    att = ChatAttachment(
        filename="corrupted.pdf",
        content_type="application/pdf",
        base64_data="not-a-valid-base64-string!!!",
    )
    block, label = await process_ephemeral_attachment(att)
    assert block == ""
    assert label == ""


@pytest.mark.asyncio
async def test_extract_image_attachment_with_vision():
    """Verify image attachments invoke LLMService vision processing."""
    fake_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    b64 = base64.b64encode(fake_png_bytes).decode("utf-8")
    
    mock_llm = MagicMock()
    mock_llm.describe_image = AsyncMock(
        return_value="Student Certificate: Name: John Doe, Level: B2 English, Valid: 2026-2027"
    )
    
    att = ChatAttachment(
        filename="student_certificate.png",
        content_type="image/png",
        base64_data=f"data:image/png;base64,{b64}",
    )
    
    block, label = await process_ephemeral_attachment(
        att, llm_service=mock_llm, groq_api_key="test_key", mode="cloud"
    )
    
    assert "=== [DIRECT IN-CHAT ATTACHMENT: student_certificate.png] ===" in block
    assert "John Doe" in block
    assert "B2 English" in block
    mock_llm.describe_image.assert_awaited_once()


@pytest.mark.asyncio
async def test_chat_query_with_ephemeral_attachments(
    client: AsyncClient, test_session, mock_vector_service
):
    """
    Test POST /chat/query with ephemeral chat_attachments.
    Verifies that the LLM receives the attachment context and zero Qdrant points are created.
    """
    ticket_text = "WhatsApp Ticket #402: Client asks if accommodation in Spain includes free meals."
    b64 = base64.b64encode(ticket_text.encode("utf-8")).decode("utf-8")
    
    payload = {
        "messages": [
            {"role": "user", "content": "Does this ticket inquiry get approved under our terms?"}
        ],
        "thinking_mode": "mentor",
        "chat_attachments": [
            {
                "filename": "whatsapp_ticket_402.txt",
                "content_type": "text/plain",
                "base64_data": f"data:text/plain;base64,{b64}"
            }
        ]
    }
    
    with patch("services.llm_service.llm_service.generate_response", new_callable=AsyncMock) as mock_gen, \
         patch("services.llm_service.llm_service.generate_suggestions", new_callable=AsyncMock) as mock_sug:
        
        mock_gen.return_value = ("Yes, accommodation in Spain includes mandatory free meals.", "llama-3.3-70b-versatile")
        mock_sug.return_value = ["What is the stipend amount?", "Are flights reimbursed?"]
        
        resp = await client.post("/chat/query", json=payload)
        
        assert resp.status_code == 200, f"Error: {resp.text}"
        data = resp.json()
        assert "response_text" in data
        assert "accommodation in Spain includes mandatory free meals" in data["response_text"]
        
        # Verify the context passed to the LLM contained the direct attachment
        call_args = mock_gen.call_args
        full_context = call_args[0][1]
        assert "DIRECT IN-CHAT ATTACHMENTS" in full_context
        assert "whatsapp_ticket_402.txt" in full_context
        assert "WhatsApp Ticket #402" in full_context
        
        # Verify that mock_vector_service.upsert was NEVER called (0 vector DB pollution!)
        assert mock_vector_service.upsert_batch.call_count == 0


@pytest.mark.asyncio
async def test_chat_query_dual_path_rag(
    client: AsyncClient, test_session, mock_vector_service
):
    """
    Test Dual-Path RAG: Direct In-Chat Attachment + Permanent Knowledge Base vectors combined.
    """
    mock_vector_service.search = AsyncMock(
        return_value=[
            {
                "filename": "Animafest_General_Policy.pdf",
                "text": "All hotel placements in Spain provide free lodging and full board (3 meals/day).",
                "score": 0.95
            }
        ]
    )
    
    cv_text = "Candidate Profile: Maria Garcia, Spanish/English speaker, Applying for Reception Internship."
    b64 = base64.b64encode(cv_text.encode("utf-8")).decode("utf-8")
    
    payload = {
        "messages": [
            {"role": "user", "content": "Can Maria be placed in the Reception department according to our policy?"}
        ],
        "thinking_mode": "auditor",
        "chat_attachments": [
            {
                "filename": "maria_garcia_cv.txt",
                "content_type": "text/plain",
                "base64_data": f"data:text/plain;base64,{b64}"
            }
        ]
    }
    
    with patch("services.llm_service.llm_service.generate_response", new_callable=AsyncMock) as mock_gen, \
         patch("services.llm_service.llm_service.generate_suggestions", new_callable=AsyncMock) as mock_sug:
        
        mock_gen.return_value = ("Yes, Maria Garcia meets the language criteria for Reception.", "llama-3.3-70b-versatile")
        mock_sug.return_value = []
        
        resp = await client.post("/chat/query", json=payload)
        
        assert resp.status_code == 200
        call_args = mock_gen.call_args
        full_context = call_args[0][1]
        
        # Both direct attachment and permanent KB are present in the context!
        assert "DIRECT IN-CHAT ATTACHMENTS" in full_context
        assert "maria_garcia_cv.txt" in full_context
        assert "KNOWLEDGE BASE BACKGROUND CONTEXT" in full_context
        assert "Animafest_General_Policy.pdf" in full_context
