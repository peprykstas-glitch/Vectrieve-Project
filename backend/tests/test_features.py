import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock
from sqlmodel import select

# We need to import our schemas and DB models
from models.user import User
from models.sql_models import ChatSession, ChatHistory
from models.document import Document

pytestmark = pytest.mark.asyncio

# --- MOCK FIXTURES ---

@pytest_asyncio.fixture(autouse=True)
def mock_llm_service():
    """Mocks the LLM service to avoid calling Ollama/Groq during tests."""
    with patch("api.endpoints.chat.llm_service") as mock:
        mock.generate_response = AsyncMock(return_value=("Mocked AI Response", "mock-model"))
        mock.generate_title = AsyncMock(return_value="Mocked Chat Title")
        mock.generate_suggestions = AsyncMock(return_value=["Suggestion 1", "Suggestion 2", "Suggestion 3"])
        yield mock

@pytest_asyncio.fixture(autouse=True)
def mock_vector_service():
    """
    Mock VectorService by patching get_vector_service() to return a MagicMock.
    This avoids touching the _LazyVectorProxy which triggers real Qdrant initialization.
    """
    from main import app
    from services.vector_service import get_vector_service, SearchResult
    mock_vs = MagicMock()
    mock_vs.search = AsyncMock(return_value=[
        SearchResult(filename="test.txt", text="Mocked context from document", score=0.9)
    ])
    
    app.dependency_overrides[get_vector_service] = lambda: mock_vs
    
    with patch("services.vector_service.get_vector_service", return_value=mock_vs):
        yield mock_vs
        
    if get_vector_service in app.dependency_overrides:
        del app.dependency_overrides[get_vector_service]

# --- FEATURE 1: AUTHENTICATION ---

async def test_register_user(client: AsyncClient, test_session):
    # 1. Register a new user
    user_data = {
        "fullName": "Test User",
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "company": "Test Inc"
    }
    response = await client.post("/auth/register", json=user_data)
    assert response.status_code == 201
    assert "is_approved" in response.json()

    # Verify user is in DB
    result = await test_session.execute(select(User).where(User.username == "test@example.com"))
    user = result.scalar_one_or_none()
    assert user is not None

async def test_login_user(client: AsyncClient, test_session):
    # Create user first
    user_data = {"fullName": "Test User", "email": "login@example.com", "password": "SecurePassword123!"}
    await client.post("/auth/register", json=user_data)

    # Approve user in DB
    result = await test_session.execute(select(User).where(User.username == "login@example.com"))
    user = result.scalar_one()
    user.is_approved = True
    test_session.add(user)
    await test_session.commit()

    # Login
    form_data = {"username": "login@example.com", "password": "SecurePassword123!"}
    response = await client.post("/auth/token", data=form_data)
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

# --- FEATURE 2: CHAT & SESSIONS ---

async def test_chat_query_creates_session(client: AsyncClient, test_session):
    query_payload = {
        "messages": [{"role": "user", "content": "Hello AI!"}],
        "thinking_mode": "mentor",
        "mode": "local"
    }
    
    response = await client.post("/chat/query", json=query_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["response_text"] == "Mocked AI Response"
    assert "session_id" in data
    
    session_id = data["session_id"]
    
    # Check DB for session and history
    result = await test_session.execute(select(ChatSession).where(ChatSession.id == session_id))
    db_session = result.scalar_one_or_none()
    assert db_session is not None
    
    hist_result = await test_session.execute(select(ChatHistory).where(ChatHistory.session_id == session_id))
    history = hist_result.scalars().all()
    assert len(history) == 2 # 1 user msg, 1 ai msg

async def test_get_sessions_list(client: AsyncClient, test_session):
    # Create a chat to generate a session
    await client.post("/chat/query", json={
        "messages": [{"role": "user", "content": "Test"}],
        "thinking_mode": "mentor",
        "mode": "local"
    })
    
    response = await client.get("/sessions")
    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) >= 1
    # Sessions have 'id', 'title', 'created_at' fields
    assert "id" in sessions[0]
    assert "title" in sessions[0]

async def test_delete_session(client: AsyncClient, test_session):
    res = await client.post("/chat/query", json={
        "messages": [{"role": "user", "content": "To be deleted"}],
        "thinking_mode": "mentor", "mode": "local"
    })
    session_id = res.json()["session_id"]
    
    delete_res = await client.delete(f"/sessions/{session_id}")
    # 204 No Content on successful delete
    assert delete_res.status_code == 204
    
    # Verify deletion
    result = await test_session.execute(select(ChatSession).where(ChatSession.id == session_id))
    assert result.scalar_one_or_none() is None

# --- FEATURE 3: ANALYTICS ---

async def test_analytics_stats(client: AsyncClient, test_session):
    # Seed a chat message so total_queries > 0
    chat_resp = await client.post("/chat/query", json={
        "messages": [{"role": "user", "content": "Stats test"}],
        "thinking_mode": "mentor",
        "mode": "local",
    })
    assert chat_resp.status_code == 200, chat_resp.text

    # Seed a completed document directly in the test session
    doc = Document(filename="test_stats.pdf", status="COMPLETED", user_id=1, file_size=1024, chunk_count=5)
    test_session.add(doc)
    await test_session.commit()

    # 1. Non-admin request should return 403 Forbidden
    response_denied = await client.get("/analytics/stats")
    assert response_denied.status_code == 403

    # 2. Override get_current_user dependency to return an admin user
    from main import app
    from api.deps import get_current_user
    
    async def override_get_current_user_admin():
        return User(id=1, username="test@example.com", hashed_password="dummy", is_active=True, is_admin=True)

    app.dependency_overrides[get_current_user] = override_get_current_user_admin

    response = await client.get("/analytics/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert "kpi" in data
    assert "chart_data" in data
    # Both values come from data seeded in this test function above
    assert data["kpi"]["total_queries"] >= 1
    assert data["kpi"]["indexed_documents"] >= 1

    # Cleanup overrides to restore regular user for subsequent tests
    async def override_get_current_user_regular():
        return User(id=1, username="test@example.com", hashed_password="dummy", is_active=True)
    app.dependency_overrides[get_current_user] = override_get_current_user_regular
    # Structural checks
    assert isinstance(data["kpi"]["total_users"], int)
    assert isinstance(data["chart_data"], list)

# --- FEATURE 4: EXPORT ---

async def test_export_chat_json_and_csv(client: AsyncClient, test_session):
    res = await client.post("/chat/query", json={
        "messages": [{"role": "user", "content": "Export this chat"}],
        "thinking_mode": "mentor", "mode": "local"
    })
    session_id = res.json()["session_id"]
    
    # JSON export
    json_res = await client.get(f"/export/chat/{session_id}/json")
    assert json_res.status_code == 200
    assert json_res.json()["session_id"] == session_id
    assert len(json_res.json()["messages"]) == 2
    
    # CSV export
    csv_res = await client.get(f"/export/chat/{session_id}/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Export this chat" in csv_res.text

# --- FEATURE 5: UPLOAD (Background tasks mocked) ---

async def test_upload_document(client: AsyncClient):
    with patch("api.endpoints.upload.process_pdf_background") as mock_bg:
        files = {"file": ("test.txt", b"Hello world text", "text/plain")}
        response = await client.post("/upload", files=files)
        
        assert response.status_code == 202
        assert response.json()["filename"] == "test.txt"
        
        # Verify background task was called
        assert mock_bg.called


async def test_chat_query_with_attached_filenames(client: AsyncClient, test_session, mock_vector_service):
    from models.document import Document
    doc = Document(filename="attached_doc.pdf", status="COMPLETED", user_id=1, file_size=1024, chunk_count=5)
    test_session.add(doc)
    await test_session.commit()

    query_payload = {
        "messages": [{"role": "user", "content": "Explain this file!"}],
        "thinking_mode": "mentor",
        "mode": "local",
        "attached_filenames": ["attached_doc.pdf"]
    }
    
    response = await client.post("/chat/query", json=query_payload)
    assert response.status_code == 200
    
    # Verify that the vector service search was called with filenames parameter
    mock_vector_service.search.assert_called_once_with(
        "Explain this file!",
        user_id=1,
        limit=8,
        mode="local",
        filenames=["attached_doc.pdf"],
        space_id=None
    )


async def test_vector_service_search_reranks():
    from services.vector_service import VectorService
    from unittest.mock import MagicMock, patch, AsyncMock
    
    with patch.object(VectorService, "__init__", lambda self: None):
        vs = VectorService()
        vs.collection_name = "test_collection"
        vs.vector_size = 128
        vs.embed_model = "test"
        vs.local_client = MagicMock()
        vs.cloud_client = None
        
        vs._embed_text = MagicMock(return_value=[0.1] * 128)
        
        mock_hit1 = MagicMock()
        mock_hit1.payload = {"text": "apple banana", "filename": "doc1.txt"}
        mock_hit2 = MagicMock()
        mock_hit2.payload = {"text": "cherry peach", "filename": "doc2.txt"}
        
        mock_query_result = MagicMock()
        mock_query_result.points = [mock_hit1, mock_hit2]
        vs.local_client.query_points = MagicMock(return_value=mock_query_result)
        
        mock_reranker = MagicMock()
        mock_reranker.rerank = MagicMock(return_value=[1.0, 5.0])
        vs._get_reranker = MagicMock(return_value=mock_reranker)
        
        with patch("core.database.get_session_factory") as mock_db_factory:
            mock_session = MagicMock()
            
            class FakeResult:
                def all(self):
                    return []
            mock_session.execute = AsyncMock(return_value=FakeResult())
            
            class FakeContext:
                async def __aenter__(self):
                    return mock_session
                async def __aexit__(self, exc_type, exc_val, exc_tb):
                    pass
            mock_db_factory.return_value = FakeContext
            
            results = await vs.search(query="fruit", user_id=1, limit=5)
            
            assert len(results) == 2
            assert results[0].filename == "doc2.txt"
            assert results[0].text == "cherry peach"
            assert results[1].filename == "doc1.txt"
            assert results[1].text == "apple banana"


async def test_space_isolation_end_to_end(client: AsyncClient, test_session):
    from services.vector_service import VectorService
    from models.sql_models import Space
    from models.document import Document, DocumentChunk
    from sqlalchemy.ext.asyncio import AsyncSession
    
    # 1. Populate the test database with Spaces
    space_a = Space(id="space-a-uuid", name="Space A", user_id=1)
    space_b = Space(id="space-b-uuid", name="Space B", user_id=1)
    test_session.add(space_a)
    test_session.add(space_b)
    await test_session.commit()
    
    # 2. Populate Documents
    doc_a = Document(filename="secret_a.txt", user_id=1, space_id="space-a-uuid", status="COMPLETED")
    doc_b = Document(filename="secret_b.txt", user_id=1, space_id="space-b-uuid", status="COMPLETED")
    test_session.add(doc_a)
    test_session.add(doc_b)
    await test_session.commit()
    await test_session.refresh(doc_a)
    await test_session.refresh(doc_b)
    
    # 3. Populate Document Chunks (including a Global Workspace document)
    doc_global = Document(filename="legacy.txt", user_id=1, space_id=None, status="COMPLETED")
    test_session.add(doc_global)
    await test_session.commit()
    await test_session.refresh(doc_global)
    
    chunk_a = DocumentChunk(document_id=doc_a.id, user_id=1, chunk_index=0, content="ALPHA_SECRET_TOKEN")
    chunk_b = DocumentChunk(document_id=doc_b.id, user_id=1, chunk_index=0, content="BETA_SECRET_TOKEN")
    chunk_global = DocumentChunk(document_id=doc_global.id, user_id=1, chunk_index=0, content="LEGACY_TOKEN")
    
    test_session.add(chunk_a)
    test_session.add(chunk_b)
    test_session.add(chunk_global)
    await test_session.commit()
    
    # 4. Instantiate custom VectorService
    with patch.object(VectorService, "__init__", lambda self: None):
        vs = VectorService()
        vs.collection_name = "test_collection"
        vs.vector_size = 128
        vs.embed_model = "test"
        vs.local_client = MagicMock()
        vs.cloud_client = None
        
        vs._embed_text = MagicMock(return_value=[0.1] * 128)
        
        # Mock Qdrant dense query to return empty to isolate sparse test path
        mock_query_result = MagicMock()
        mock_query_result.points = []
        vs.local_client.query_points = MagicMock(return_value=mock_query_result)
        
        # Bypass reranking
        vs._get_reranker = MagicMock(return_value=None)
        
        # Patch session factory to return the active test database session
        class SharedSessionContext:
            async def __aenter__(self):
                return test_session
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
        
        test_session_factory = lambda: SharedSessionContext()
        
        with patch("core.database.get_session_factory", return_value=test_session_factory):
            # 5. Search in Space A
            res_a = await vs.search(query="ALPHA", user_id=1, space_id="space-a-uuid")
            assert len(res_a) == 1
            assert res_a[0].filename == "secret_a.txt"
            assert "ALPHA_SECRET_TOKEN" in res_a[0].text
            
            # 6. Search in Space B
            res_b = await vs.search(query="BETA", user_id=1, space_id="space-b-uuid")
            assert len(res_b) == 1
            assert res_b[0].filename == "secret_b.txt"
            assert "BETA_SECRET_TOKEN" in res_b[0].text
            
            # 7. Search for BETA in Space A (should be empty due to space isolation)
            res_cross = await vs.search(query="BETA", user_id=1, space_id="space-a-uuid")
            assert len(res_cross) == 0
            
            # 8. Search in Global Workspace (space_id=None)
            res_global = await vs.search(query="LEGACY", user_id=1, space_id=None)
            assert len(res_global) == 1
            assert res_global[0].filename == "legacy.txt"
            assert "LEGACY_TOKEN" in res_global[0].text
            
            # 9. Search for ALPHA in Global Workspace (should be empty - no leakage of space docs to global)
            res_global_leak = await vs.search(query="ALPHA", user_id=1, space_id=None)
            assert len(res_global_leak) == 0
            
            # 10. Assert Qdrant filter condition types were passed correctly
            calls = vs.local_client.query_points.call_args_list
            assert len(calls) == 5
            
            # Call 0 (Space A): FieldCondition checking space-a-uuid
            filter_a = calls[0].kwargs["query_filter"]
            space_cond_a = [c for c in filter_a.must if getattr(c, "key", None) == "space_id"][0]
            assert space_cond_a.match.value == "space-a-uuid"
            
            # Call 3 (Global Search): IsEmptyCondition checking space_id is empty
            filter_global = calls[3].kwargs["query_filter"]
            empty_cond = [c for c in filter_global.must if not hasattr(c, "key")][0]
            assert empty_cond.is_empty.key == "space_id"


async def test_resolve_llm_config():
    from models.schemas import QueryRequest, ChatMessage
    from models.sql_models import Space
    from services.llm_config_resolver import resolve_llm_config

    # Test 1: Fallback to defaults when no space is selected and query request is empty
    req1 = QueryRequest(
        messages=[ChatMessage(role="user", content="hello")]
    )
    resolve_llm_config(req1, space=None)
    assert req1.mode == "cloud"
    assert req1.model is None
    assert req1.temperature is None
    assert req1.max_tokens is None
    assert req1.top_p is None

    # Test 2: Space config hard limits override client request limits
    space_w_limits = Space(
        id="space-id",
        name="Space with limits",
        user_id=1,
        llm_provider="local",
        llm_model="llama-local-7b",
        temperature=0.7,
        max_tokens=500
    )
    
    req2 = QueryRequest(
        messages=[ChatMessage(role="user", content="hello")],
        mode="cloud",
        model="gpt-4"
    )
    resolve_llm_config(req2, space=space_w_limits)
    assert req2.mode == "local"
    assert req2.model == "llama-local-7b"
    assert req2.temperature == 0.7
    assert req2.max_tokens == 500

    # Test 3: Client overrides space soft defaults & space prompt propagates
    space_w_prompt = Space(
        id="space-prompt-id",
        name="Space with custom prompt",
        user_id=1,
        system_prompt="You are a legal tax advisor."
    )
    req3 = QueryRequest(
        messages=[ChatMessage(role="user", content="hello")],
        temperature=0.9,
        max_tokens=150,
        top_p=0.95
    )
    resolve_llm_config(req3, space=space_w_prompt)
    assert req3.space_system_prompt == "You are a legal tax advisor."
    assert req3.temperature == 0.9
    assert req3.max_tokens == 150
    assert req3.top_p == 0.95

    # Test prompt blending in LLMService
    from services.llm_service import llm_service
    sys_prompt, temp = llm_service._build_system_prompt(req3, "Some context")
    assert "You are Vectrieve Core's Intelligence Mentor." in sys_prompt
    assert "--- WORKSPACE SPECIFIC INSTRUCTIONS ---" in sys_prompt
    assert "You are a legal tax advisor." in sys_prompt
    assert "Some context" in sys_prompt

    # Test 4: Validation compatibility check
    from pydantic import ValidationError
    from models.schemas import SpaceLLMConfig
    
    # Try invalid combination: cloud model with local provider
    try:
        SpaceLLMConfig(llm_provider="local", llm_model="llama-3.3-70b-versatile")
        assert False, "Should fail compatibility validation"
    except ValidationError:
        pass
        
    # Try invalid combination: local model with cloud provider
    try:
        SpaceLLMConfig(llm_provider="cloud", llm_model="qwen2.5-coder:7b")
        assert False, "Should fail compatibility validation"
    except ValidationError:
        pass

    # Try valid combination
    cfg = SpaceLLMConfig(llm_provider="local", llm_model="qwen2.5-coder:7b")
    assert cfg.llm_provider == "local"
    assert cfg.llm_model == "qwen2.5-coder:7b"


@pytest.mark.asyncio
async def test_require_admin_dependency():
    from api.deps import require_admin
    from models.user import User
    from fastapi import HTTPException
    
    admin_user = User(username="admin@test.com", hashed_password="pwd", is_admin=True)
    regular_user = User(username="user@test.com", hashed_password="pwd", is_admin=False)
    
    # Should pass
    res = await require_admin(admin_user)
    assert res == admin_user
    
    # Should raise 403
    with pytest.raises(HTTPException) as exc_info:
        await require_admin(regular_user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_require_admin_endpoint_denied(client):
    response = await client.get("/analytics/stats")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_require_admin_endpoint_allowed(test_session):
    from main import app
    from api.deps import get_current_user
    from core.database import get_session
    from models.user import User
    from httpx import AsyncClient, ASGITransport

    async def override_get_session():
        yield test_session

    async def override_get_current_user():
        return User(id=1, username="admin@example.com", hashed_password="dummy", is_active=True, is_admin=True)

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        response = await c.get("/analytics/stats")
        assert response.status_code == 200
        data = response.json()
        assert "telemetry" in data
        assert "pool" in data["telemetry"]

    app.dependency_overrides.clear()


async def test_sample_chunks_budget_backstop():
    from services.pdf_parser import _sample_chunks
    chunks = ["chunk_one_medium", "chunk_two_longer_text", "chunk_three_very_long_chunk_here"]
    
    # Check regular sampling
    res_normal = _sample_chunks(chunks, n=3, max_chars=1000)
    assert len(res_normal) == 3

    # Check budget constraints: total chars budget = 30
    res_limited = _sample_chunks(chunks, n=3, max_chars=30)
    assert res_limited == ["chunk_one_medium"]


async def test_pdf_summary_respects_space_hard_limit():
    from services.llm_config_resolver import resolve_llm_config
    from models.schemas import QueryRequest, ChatMessage
    from models.sql_models import Space

    space = Space(id="s1", name="Local-only", user_id=1, llm_provider="local")
    fake_req = QueryRequest(
        messages=[ChatMessage(role="user", content="summarize this")],
        mode="cloud",
    )
    resolve_llm_config(fake_req, space)
    assert fake_req.mode == "local"


async def test_sample_chunks_respects_char_budget():
    from services.pdf_parser import _sample_chunks
    huge_chunks = ["A" * 1000] * 10  # 10 chunks of 1000 chars
    result = _sample_chunks(huge_chunks, n=8, max_chars=3000)
    assert sum(len(c) for c in result) <= 3000
    assert len(result) >= 1  # backstop should not strip everything






