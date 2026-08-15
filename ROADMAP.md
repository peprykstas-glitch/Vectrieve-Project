# 🗺️ Vectrieve AI — Enterprise Product Roadmap & Execution Status

> **Vectrieve AI** is a production-grade, local-first Private Knowledge Base and Retrieval-Augmented Generation (RAG) platform designed for teams with strict data sovereignty, low-latency requirements, and hybrid compute flexibility (Local Ollama / Cloud Groq).

---

## 📊 Milestone Execution Matrix

| Phase | Feature / Milestone | Core Capability | Target Layer | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Phase 1** | **Per-Space LLM Configuration** | Multi-model routing (Groq / Ollama), granular hyperparameter control (`temperature`, `max_tokens`, `top_p`) per workspace. | Backend API / Settings UI | `✅ Completed` |
| **Phase 2** | **RBAC Foundation & Telemetry** | Role-based access control, `/analytics` dashboard protected via `require_admin`, real-time RAG query latency & connection pool tracking. | Auth / Telemetry / UI | `✅ Completed` |
| **Phase 3a** | **Document Parsing: Rich Text** | Deep text extraction for `.docx`, `.md`, `.html`, and structured `.txt` with recursive semantic chunking. | Ingestion Pipeline | `✅ Completed` |
| **Phase 3b** | **Document Parsing: Structured Data** | Column/header-preserving row-group chunking for `.csv`, `.xlsx`, and `.json` with robust encoding fallback (`UTF-8`, `Windows-1251`, `Latin-1`). | Ingestion Pipeline | `✅ Completed` |
| **Phase 3c** | **Multimodal Vision & Presentation OCR** | Automatic diagram & chart captioning via Vision LLMs for `.png`, `.jpg`, scanned PDFs, and slide-by-slide `.pptx` presentation indexing. | Vision Pipeline / Qdrant | `✅ Completed` |
| **Phase 4a** | **Workspace Sharing: Backend RBAC** | Multi-tenant `SpaceMember` model with strict role boundaries (`Owner`, `Editor`, `Viewer`), cascaded permissions, and Alembic DB migrations. | Database / RBAC Engine | `✅ Completed` |
| **Phase 4b** | **Workspace Sharing: Frontend UI** | Interactive workspace member management modal (`SpaceMembersModal`), email-based invites, dynamic role selector, and instant member removal. | React / Next.js / Tailwind | `✅ Completed` |
| **Phase 5** | **Cloud Model Upgrade (120B)** | Seamless migration to `openai/gpt-oss-120b` on Groq Cloud, eliminating deprecated endpoints and maximizing reasoning accuracy. | Core LLM Service | `✅ Completed` |
| **Phase 6** | **Audio Ingestion & Transcription** | Automatic transcription of uploaded audio files (`.mp3`, `.wav`, `.m4a`) into vector knowledge spaces via Whisper models. | Ingestion / Media Services | `📋 Backlog` |

---

## 🏗️ Architectural Decisions & Verified Invariants

### 1. Multi-Tenant Workspace Sharing & Privacy Isolation
* **Membership Model (`SpaceMember`)**: Workspaces support multi-user collaboration with explicit RBAC:
  * **Owner**: Full administrative rights (invite/remove members, modify system prompts, change LLM models, delete space).
  * **Editor**: Upload documents, manage files, and chat with all workspace knowledge.
  * **Viewer**: Read-only query access with cited source verification.
* **Isolated Private Chat Sessions**: Each user maintains their own private conversation history within shared spaces. Shared documents provide common truth; individual interactions remain strictly private to the session creator.

### 2. Hybrid Sparse + Dense Vector Search Engine
* **Dense Semantic Retrieval**: Powered by `nomic-embed-text` (768-dim) vectors stored in **Qdrant**.
* **Sparse Lexical Filtering**: PostgreSQL full-text search integrated with metadata filters (`space_id`, `user_id`, document tags).
* **Cross-Encoder Reranking**: Sub-second reranking using `Xenova/ms-marco-MiniLM-L-6-v2` (`TextCrossEncoder`) to eliminate hallucinations and prioritize authoritative passages.

### 3. Resilient Multi-Format Document Ingestion
* **Table & Spreadsheet Preservation**: `.csv` and `.xlsx` files are parsed into logical row groups with header schemas injected into every vector chunk, ensuring table relationships are preserved during vector search.
* **Multilingual Encoding Fallback**: Automatic encoding resolution (`UTF-8` ➔ `UTF-8-SIG` ➔ `Windows-1251` Cyrillic ➔ `Latin-1`) eliminates byte-decoding crashes when uploading legacy enterprise documents.
* **Asynchronous Offloading**: Heavy OCR (pypdfium2 / Tesseract) and Vision LLM descriptions run in dedicated thread workers (`asyncio.to_thread`) with strict resource teardowns to prevent event-loop blocking on 8GB RAM machines.

### 4. Zero-Friction Network Deployment (LAN / Office Hub)
* **Central Hub Architecture**: One office machine acts as the host running Dockerized databases (PostgreSQL, Qdrant), FastAPI backend, and Next.js frontend bound to `0.0.0.0`.
* **Dynamic WebSocket Protocol Conversion**: Real-time file processing indicators and streaming responses dynamically resolve `ws://` / `wss://` origins, allowing instant collaboration across the entire office local network.

---

## 🧪 Automated Test & Quality Assurance

The Vectrieve platform is backed by a comprehensive automated test suite covering authentication, RBAC boundaries, file parsers, vector embeddings, telemetry, and API routes.

```bash
# Run full backend test suite
cd backend
.\venv\Scripts\python.exe -m pytest tests/
# Output: 83 passed in 12.17s (100% Green)

# Run frontend TypeScript typecheck
cd frontend
npx tsc --noEmit
# Output: 0 errors
```

---

## 🚀 Future Enhancements (Post-MVP Roadmap)

* [ ] **Phase 6: Audio Transcription Pipeline**: Ingestion of raw voice notes (`.mp3`, `.m4a`, `.wav`) transcribed directly into vector chunks using Whisper.
* [ ] **Cross-Workspace Global Search**: Federated multi-space queries for users managing separate departmental spaces (e.g. HR, Sales, Legal).
* [ ] **Interactive Visual Graph Explorer**: Entity and citation relationship graph visualizing cross-document connections in 2D/3D.
