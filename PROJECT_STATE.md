# Vectrieve AI — Project State & Technical Factsheet

**Document Version:** 1.0.0  
**Last Full Verification Pass:** 16 August 2026  
**Host Target:** DigitalOcean VPS (`159.89.110.69`), Ubuntu 24.04 LTS

---

## 1. Architecture Summary

Vectrieve AI is a multi-tenant, Retrieval-Augmented Generation (RAG) platform designed for private enterprise knowledge bases. The application runs as an isolated, containerized stack composed of four independent services orchestrated via Docker Compose:

1. **Frontend Presentation Tier:** Next.js 16 (Turbopack, React 19, Tailwind CSS) deployed in standalone mode, providing a single-page chat interface, space management, document explorer, telemetry dashboard, and audio synthesis controls.
2. **Application & Ingestion Tier:** FastAPI application server (Python 3.12, AsyncSQLAlchemy, Pydantic v2) handling authentication, multi-format file parsing, vectorization, prompt assembly, and SSE (Server-Sent Events) streaming.
3. **Relational Data Tier:** PostgreSQL 16 managing relational entities (`users`, `user_settings`, `spaces`, `space_members`, `documents`, `document_chunks`, `chat_sessions`, `chat_history`, `telemetry_logs`, `feedback_logs`).
4. **Vector Retrieval Tier:** Qdrant v1.7 storing 768-dimensional dense semantic vectors with payload metadata filtering by `space_id` and `user_id`.

```
[Client Browser]
       │
       ▼ (HTTP Port 80)
[Next.js 16 Frontend Proxy]
       │
       ▼ (Internal Docker Network / HTTP Port 8000)
[FastAPI Backend Gateway]
   ├── 🔐 Auth & Quota Guard (Argon2 / JWT Cookies / UserSettings Quotas)
   ├── 📄 Multi-Format Ingestion Engine (PDF, DOCX, XLSX, CSV, PPTX, MD, TXT)
   ├── 🧬 FastEmbed ONNX Runtime (nomic-embed-text-v1.5, 768-dim)
   ├── ⚖️ Cross-Encoder Reranker (ms-marco-MiniLM-L-6-v2)
   ├── 🗄️ PostgreSQL 16 (Relational Metadata & Lexical Full-Text Search)
   ├── 🎯 Qdrant v1.7 (Dense Cosine Similarity Search)
   └── ⚡ Groq Cloud API (openai/gpt-oss-120b & llama-3.3-70b-versatile)
```

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router, Turbopack) | `16.1.1` | User interface, SSR, API route proxying, and client-side state. |
| **UI Components** | React, Tailwind CSS, Lucide React, Framer Motion | `19.0.0` | Liquid glass interface, animated components, modal dialogs. |
| **Backend Framework** | FastAPI, Uvicorn, AsyncIO | `0.115.0+` | REST API, SSE streaming endpoints, background task workers. |
| **ORM & DB Client** | SQLAlchemy (Async), SQLModel, AsyncPG | `2.0+` | Asynchronous relational schema management and queries. |
| **Relational Database** | PostgreSQL | `16-alpine` | Persistent relational storage, RBAC, full-text search. |
| **Vector Engine** | Qdrant | `1.7.4` | Cosine similarity vector search with JSON payload filters. |
| **Embedding Engine** | FastEmbed (ONNX Runtime) | `0.4.1` | Local in-process 768-dim dense embedding generation (`nomic-embed-text-v1.5`). |
| **Reranker Model** | TextCrossEncoder (`ms-marco-MiniLM-L-6-v2`) | HuggingFace | Cross-encoder contextual relevance reranking. |
| **LLM Inference** | Groq Cloud LPU API | API v1 | `openai/gpt-oss-120b` (Chat/RAG), `llama-3.3-70b-versatile` (Titles/Briefings). |
| **Audio Synthesis** | Edge-TTS (Microsoft Neural Voices) | `6.1.3` | Multi-speaker podcast and overview audio generation (`uk-UA`, `en-US`). |

---

## 3. Verified Metrics & Ground-Truth Benchmarks

All metrics in this section were directly measured on the production deployment environment on **16 August 2026**.

### 3.1 Host Hardware & Operating System
* **Provider & Instance:** DigitalOcean Standard Droplet (DO-Regular).
* **CPU:** 4 vCPUs @ 2.0 GHz (`pc-i440fx-6.1`, 4 cores, 1 thread/core) — *measured via `lscpu` on 16 Aug 2026*.
* **Physical RAM:** 7,941 MiB (~8.0 GB physical memory) — *measured via `free -m` on 16 Aug 2026*.
* **Configured Swap:** 4,095 MiB (~4.0 GB swapfile) — *measured via `free -m` on 16 Aug 2026*.
* **Storage:** 160 GB NVMe SSD (25 GB used, 129 GB available, 17% utilization) — *measured via `df -h /` on 16 Aug 2026*.

### 3.2 Live Container Memory & Resource Footprint
*Measured via `docker stats --no-stream` on 16 Aug 2026 during active server state:*

| Container Name | Memory Usage | Memory % of Host | CPU % (Idle) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `vectrieve-backend` | **1.676 GiB** | 21.61% | 0.28% | FastAPI + ONNX Runtime (FastEmbed model weights loaded). |
| `vectrieve-frontend` | **50.37 MiB** | 0.63% | 0.00% | Next.js 16 standalone server. |
| `vectrieve-qdrant` | **46.03 MiB** | 0.58% | 0.13% | Vector DB with 740 indexed vectors in RAM. |
| `vectrieve-postgres` | **29.57 MiB** | 0.37% | 0.00% | PostgreSQL 16 engine. |
| **Host Aggregate** | **2,842 MiB used / 5,098 MiB free** | **35.7% total** | — | Host memory with 100 MiB swap consumed. |

### 3.3 Vector Embedding Latency Benchmark
*Measured via `time.perf_counter()` inside the `vectrieve-backend` container on 16 Aug 2026 using model `nomic-ai/nomic-embed-text-v1.5` (768 dimensions) on 4 vCPUs:*
* **Single Text Chunk (10-run average):** **179.50 ms** (Min: 162.28 ms, Max: 205.64 ms).
* **Batch of 16 Chunks:** **2,903.37 ms total** (**181.46 ms per chunk**).

### 3.4 Data Ingestion & Indexing Scale
* **Indexed Documents:** 38 corporate documents (PDF, DOCX, XLSX, CSV, TXT, MD) — *measured via SQL `SELECT count(*) FROM documents` on 16 Aug 2026*.
* **Indexed Vector Chunks:** 740 points in Qdrant collection `Vectrieve_knowledge` — *measured via Qdrant collection info API on 16 Aug 2026*.

### 3.5 Test Suite Execution
* **Backend Unit & Integration Tests:** 83 tests passed in 12.17 seconds (0 failures, 0 errors) — *measured via `pytest tests/` in backend virtualenv on 15 Aug 2026*.
* **Frontend Static Type Check:** 0 TypeScript errors — *measured via `npx tsc --noEmit` on 16 Aug 2026*.

### 3.6 Security & Port Exposure
*Measured via `ss -tulpn` on 16 Aug 2026:*
* **Publicly Exposed Ports:**
  * `0.0.0.0:80` (HTTP reverse proxy to Next.js frontend).
  * `0.0.0.0:22` (SSH daemon with public-key authentication).
* **Internal / Localhost Bound Ports (Closed to External Network):**
  * `127.0.0.1:5432` (PostgreSQL 16).
  * `127.0.0.1:6333` (Qdrant vector engine).
  * `127.0.0.1:8000` (FastAPI backend service).

### 3.7 Actual Tested Concurrency Scale
* **Concurrent Users Tested:** 1 to 3 simultaneous users performing document uploads, RAG queries, and SSE streaming sessions.
* **Tested Query Workload:** Sequential and low-concurrency interactive querying. (No synthetic high-load stress testing e.g., 100+ requests/second, has been performed).

---

## 4. Design Targets & Unverified Estimates

The following figures are theoretical architecture targets or cloud provider specifications that have **not** been measured via independent load-testing scripts on this deployment:

* **Inference Speed:** ~180–220 tokens/sec (Based on Groq Cloud LPU published specifications for `openai/gpt-oss-120b` and `llama-3.3-70b-versatile`; exact client-side network jitter has not been benchmarked via automated harness).
* **Time to First Token (TTFT):** < 400 ms (Target design latency over Groq Cloud API; varies depending on client WAN location).
* **Theoretical System Concurrency Capacity:** 25–50 concurrent streaming users before connection pool exhaustion (Calculated based on SQLAlchemy pool size of 20 connections + 10 overflow, unverified by synthetic load testing).

---

## 5. Known Issues & Technical Backlog

1. **Lack of Automated Rate Limiting by IP on HTTP Port 80:** While user-level quotas exist (`trial_queries_used < 20`), unauthenticated registration and endpoint flooding are not currently throttled by a reverse proxy (e.g. Nginx or Cloudflare WAF).
2. **Memory Growth During Bulk Document Uploads:** Uploading more than 50 large PDF documents simultaneously in a single space can cause temporary CPU spikes on 4 vCPUs during ONNX embedding inference; mitigated by `batch_size=16` but requires a persistent background queue (e.g. Celery / Redis) for enterprise-scale ingestion.
3. **Hardcoded Persona Modes vs Custom Presets:** Predefined modes (*Mentor*, *Auditor*, *Architect*) have hardcoded prompt definitions; team-customizable behavioral presets (Google Gems style) are queued in the roadmap.

---

## 6. Not Yet Implemented / Known Gaps

The following capabilities are explicitly outside the current implementation:

1. **Audio File Vector Ingestion (Whisper Pipeline):** Direct upload of `.mp3`, `.wav`, or `.m4a` files for automatic transcription and indexing into vector chunks is not implemented.
2. **Cross-Workspace Global Search:** Queries cannot span across multiple isolated spaces simultaneously; search is strictly isolated to the active `space_id`.
3. **Graph-Based Entity Exploration:** No visual 2D/3D knowledge graph representing relationships between extracted document entities.
4. **HTTPS / SSL Certificate Provisioning:** The live server currently operates over HTTP on port 80; Let's Encrypt SSL / automated certbot renewal is not yet provisioned.
5. **SSO / SAML Enterprise Identity Providers:** Authentication is limited to local email/password (Argon2 hash) with JWT session cookies; Google/Microsoft OAuth2 and SAML 2.0 are not implemented.

---

## 7. Verification Audit Sign-Off

* **Auditor / Verifier:** Automated System Diagnostic Inspection & Live Server Telemetry Pass.
* **Verification Date:** 16 August 2026.
* **Verification Environment:** DigitalOcean Droplet `159.89.110.69`, Ubuntu 24.04, Docker 27.x.
* **Codebase Commit Reference:** `b0a80209` (branch `main`).
