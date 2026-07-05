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
    mock_vs = MagicMock()
    mock_vs.search = AsyncMock(return_value=[
        {"filename": "test.txt", "text": "Mocked context from document", "score": 0.9}
    ])
    with patch("services.vector_service.get_vector_service", return_value=mock_vs), \
         patch("api.endpoints.chat.vector_service", mock_vs):
        yield mock_vs

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
    assert response.json()["message"] == "Workspace successfully provisioned"

    # Verify user is in DB
    result = await test_session.execute(select(User).where(User.username == "test@example.com"))
    user = result.scalar_one_or_none()
    assert user is not None

async def test_login_user(client: AsyncClient, test_session):
    # Create user first
    user_data = {"fullName": "Test User", "email": "login@example.com", "password": "SecurePassword123!"}
    await client.post("/auth/register", json=user_data)

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

    response = await client.get("/analytics/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert "kpi" in data
    assert "chart_data" in data
    # Both values come from data seeded in this test function above
    assert data["kpi"]["total_queries"] >= 1
    assert data["kpi"]["indexed_documents"] >= 1
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
