# Vectrieve AI (v2.0)

Vectrieve is a secure, local Retrieval-Augmented Generation (RAG) Knowledge Assistant designed for developers and product teams. It enables precise, isolated context retrieval from documents, source code, and custom workspaces with zero data leakage.

---

## Key Capabilities

* **Multi-Tenant Workspace Isolation (Spaces):** Partition files, chat histories, and system prompts into separate workspaces. Data never bleeds between spaces in either vector (dense) or database (sparse) search steps.
* **Codebase & Document Intelligence:** Index and analyze project files (`.py`, `.js`, `.tsx`, `.ts`) alongside large text files and PDFs using optimized Qdrant vector storage.
* **Granular LLM Directives:** Set custom system prompts per workspace to align model behavior, formatting rules, and constraints for specific task domains.
* **Performance Telemetry:** Real-time feedback, latency tracking, and model usage analytics.

---

## System Architecture

The application is structured into isolated backend and frontend services, coordinated via Docker Compose:

```
[ Frontend: Next.js 14 / TS ] ---> [ BFF Proxy / API Gateway ]
                                              |
                                              v
                                   [ Backend: FastAPI ]
                                     /             \
                                    v               v
                         [ Postgres DB ]     [ Qdrant Vector DB ]
```

---

## Technical Stack

* **Large Language Models:** Groq Cloud APIs (e.g., Llama-3-70b) and local Ollama integrations.
* **Vector Engine:** Qdrant (deployed inside Docker).
* **Database & Migration:** PostgreSQL, SQLite (testing), SQLAlchemy/SQLModel, and Alembic.
* **Backend Framework:** Python 3.12, FastAPI, PyPDF2/PDFPlumber, Pydantic v2.
* **Frontend Application:** TypeScript, Next.js 14, Tailwind CSS, Shadcn UI.

---

## Getting Started

### Prerequisites
* Docker Desktop installed and running
* Python 3.12+
* Node.js 18+

### 1. Database Infrastructure
Spin up Qdrant and PostgreSQL databases:
```bash
docker-compose up -d
```

### 2. Backend Services
Navigate to the backend directory, initialize your virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Run database migrations to initialize tables and indices:
```bash
alembic upgrade head
```

Launch the FastAPI dev server:
```bash
python main.py
# Server starts at http://localhost:8000
```

### 3. Frontend Application
Navigate to the frontend directory, install dependencies, and start the development server:
```bash
cd vectrieve-frontend
npm install
npm run dev
# Application starts at http://localhost:3000
```

---

## Running Integration Tests
Execute the pytest suite to verify database schemas, workspace isolation bounds, and API route security:
```bash
cd backend
venv/Scripts/python -m pytest
```