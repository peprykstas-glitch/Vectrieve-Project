# Neurach — Enterprise Hybrid RAG & Knowledge Intelligence Platform

**Domain:** `https://neurach.tech` (production)  
**Host Target:** Azure VM `74.248.17.192`

Neurach is a high-throughput, multi-tenant Retrieval-Augmented Generation (RAG) platform and Private Knowledge Intelligence Assistant engineered for enterprise teams. It provides sub-second semantic retrieval across documents, audio meetings, and tabular data with strict workspace isolation and zero data leakage.

---

## 🚀 Key Capabilities

* **Multi-Tenant Workspaces & Granular RBAC:** Complete data isolation by `space_id` with role-based permissions (`OWNER`, `EDITOR`, `VIEWER`), cross-space isolation, and real-time collaboration.
* **Dual-Stage Hybrid Search & Reranking:** Parallel dense vector retrieval (Qdrant) and sparse lexical search (PostgreSQL full-text) reranked by FastEmbed Cross-Encoder models (`ms-marco-MiniLM-L-6-v2`) for pinpoint factual accuracy.
* **Multi-Format Ingestion & Table Chunking:** Intelligent semantic chunking for `.pdf`, `.docx`, `.xlsx`, `.csv`, `.pptx`, `.md`, and `.txt` with streaming disk writes (`NamedTemporaryFile`) preventing memory spikes during multi-megabyte uploads.
* **Audio & Meeting Intelligence (Groq Whisper):** Drag-and-drop ingestion of `.mp3`, `.wav`, `.m4a`, `.mp4`, `.mov`, and `.mkv` files with automated Whisper transcription and executive briefing extraction (Summary, Key Decisions, Action Items, Next Steps).
* **Multimodal Vision OCR:** Automatic diagram, chart, and presentation slide captioning via `llama-3.2-90b-vision-preview`.
* **High-Throughput LPU Inference:** Powered by Groq Cloud LPUs running `openai/gpt-oss-120b` streaming at ~500 tokens/second with Bring-Your-Own-Key (BYOK) support.
* **Full-Surface Localization (i18n):** Complete 4-language support across English (`en` default), Ukrainian (`uk`), Polish (`pl`), and Spanish (`es`).
* **Seamless Identity & Auth:** Argon2 password hashing with JWT HttpOnly cookies alongside one-click Google OAuth2 SSO with automatic duplicate-free account unification.

---

## 🏛️ System Architecture

```
[ Client Browser / Mobile Web ]
             │
             ▼ (HTTPS Port 443 / 80)
 [ Next.js 16 Frontend (Turbopack, React 19) ]
             │
             ▼ (Internal Docker Network / Port 8000)
 [ FastAPI Application Gateway (Python 3.12) ]
      ├── 🔐 Auth & Quota Guard (Argon2 / JWT Cookies / UserSettings Quotas)
      ├── 📄 Multi-Format Ingestion Engine (PDF, DOCX, XLSX, CSV, PPTX, Media)
      ├── 🎙️ Audio Parser & Meeting Intelligence (Groq Whisper Large v3)
      ├── 🧬 FastEmbed ONNX Runtime (BAAI/bge-small / nomic-embed)
      ├── ⚖️ Cross-Encoder Reranker (ms-marco-MiniLM-L-6-v2)
      ├── 🗄️ PostgreSQL 16 (Relational Metadata & Lexical Full-Text Search)
      ├── 🎯 Qdrant Vector Engine (Dense Cosine Similarity Search)
      └── ⚡ Groq Cloud LPU (openai/gpt-oss-120b & llama-3.2-90b-vision)
```

---

## 🛠️ Technical Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (Turbopack), React 19, Tailwind CSS, Lucide Icons | Liquid glass interface, SSE token streaming, i18n localization. |
| **Backend** | FastAPI, Python 3.12, SQLModel / SQLAlchemy (Async), Pydantic v2 | High-concurrency async REST API, background workers, streaming. |
| **Vector Engine** | Qdrant Vector Database | Sub-millisecond dense vector indexing with payload filtering. |
| **Relational DB** | PostgreSQL 16 (with Alembic migrations) | Multi-tenant RBAC, document metadata, full-text lexical search. |
| **Embedding & Reranker**| FastEmbed (ONNX Runtime) | Zero-cost in-container dense embeddings and cross-encoder reranking. |
| **LLM Inference** | Groq Cloud LPU (`openai/gpt-oss-120b`) | Ultra-fast ~500 t/s generation with 131k context window and 4k completion tokens. |
| **Vision & Audio** | `llama-3.2-90b-vision-preview`, `whisper-large-v3` | Diagram/presentation OCR and meeting audio transcription. |

---

## 💻 Getting Started (Local Development)

### Prerequisites
* Docker Desktop installed and running
* Python 3.12+
* Node.js 20+

### 1. Database Infrastructure
Start the PostgreSQL and Qdrant services:
```bash
docker compose up -d db qdrant
```

### 2. Backend Services
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python main.py
# Server starts at http://localhost:8000
```

### 3. Frontend Application
```bash
cd frontend
npm install
npm run dev
# Application starts at http://localhost:3000
```

---

## 🧪 Automated Testing
Execute the complete pytest test suite:
```bash
cd backend
venv/Scripts/python -m pytest
# 92 passing unit & integration tests
```