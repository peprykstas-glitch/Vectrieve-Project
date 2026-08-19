# 🗺️ Vectrieve Core — Enterprise Product Roadmap & Technical Backlog

> **Vectrieve Core** is a production-grade, multi-tenant Enterprise Hybrid Knowledge & Retrieval-Augmented Generation (RAG) platform designed for organizations with strict data governance, sub-second latency requirements, and high-throughput LPU inference (`openai/gpt-oss-120b`).

---

## 📊 Milestone Execution Matrix

| Phase | Feature / Milestone | Core Capability | Target Layer | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Phase 1** | **Per-Space LLM Configuration** | Multi-model routing, granular hyperparameter control (`temperature`, `max_tokens`, `top_p`) per workspace. | Backend API / Settings UI | `✅ Completed` |
| **Phase 2** | **RBAC Foundation & Telemetry** | Role-based access control, Admin dashboard (`/analytics`) protected via `require_admin`, real-time RAG query latency tracking. | Auth / Telemetry / UI | `✅ Completed` |
| **Phase 3a** | **Document Parsing: Rich Text** | Deep text extraction for `.docx`, `.md`, `.html`, and structured `.txt` with recursive semantic chunking. | Ingestion Pipeline | `✅ Completed` |
| **Phase 3b** | **Document Parsing: Structured Data** | Column/header-preserving row-group chunking for `.csv`, `.xlsx`, and `.json` with robust encoding fallback (`UTF-8`, `Windows-1251`, `Latin-1`). | Ingestion Pipeline | `✅ Completed` |
| **Phase 3c** | **Multimodal Vision & Presentation OCR** | Automatic diagram & chart captioning via Vision LLMs (`llama-3.2-90b-vision-preview`) for `.png`, `.jpg`, scanned PDFs, and `.pptx` slides. | Vision Pipeline / Qdrant | `✅ Completed` |
| **Phase 4a** | **Workspace Sharing: Backend RBAC** | Multi-tenant `SpaceMember` model with strict role boundaries (`Owner`, `Editor`, `Viewer`), cascaded permissions, and Alembic DB migrations. | Database / RBAC Engine | `✅ Completed` |
| **Phase 4b** | **Workspace Sharing: Frontend UI** | Interactive workspace member management modal (`SpaceMembersModal`), email-based invites, dynamic role selector, and instant member removal. | React / Next.js / Tailwind | `✅ Completed` |
| **Phase 5** | **Cloud Model & Hybrid Search** | `openai/gpt-oss-120b` on Groq Cloud, FastEmbed BGE ONNX embeddings, BM25 sparse search, and Cross-Encoder reranking. | Core LLM / Vector Service | `✅ Completed` |
| **Phase 6** | **Internationalization (i18n) & UI Polish** | 100% full-surface localization (`en`, `uk`, `pl`, `es`), dynamic font scaling, smart API key quota detection, feedback modal. | Frontend UI / i18n Context | `✅ Completed` |
| **Phase 7** | **Seamless Identity (Google OAuth2 SSO)** | One-click Google OAuth2 login with automatic account unification (linking existing email accounts without duplicates) and BFF proxy sanitization. | Auth / Database / BFF | `✅ Completed` |
| **Phase 8** | **Audio & Meeting Intelligence Pipeline** | Drag-and-drop meeting audio/video upload (`.mp3`, `.wav`, `.m4a`, `.mp4`, `.mov`, `.mkv`), Groq Whisper transcription, and structured Action-Item extraction. | Ingestion / Media Services | `✅ Completed` |
| **Phase 9** | **Click-to-Seek Audio Waveform Player** | Interactive timestamp seeker `[02:15]` with embedded audio playback in Chat and Document Details view. | Frontend UI / Web Audio | `📋 Next Sprint (Queued)` |
| **Phase 10** | **Deep Research & Multi-Hop Reasoning** | Autonomous iterative multi-document analysis agent for synthesizing complex multi-source inquiries. | Reasoning Agent / RAG | `📋 Next Sprint (Queued)` |
| **Phase 11** | **Enhanced Workspace Collaboration UI** | Email invite modal, live presence indicators, and activity logs across shared spaces. | Collaboration / WebSockets | `📋 Next Sprint (Queued)` |
| **Phase 12** | **One-Click Executive PDF Dossier Export** | Branded corporate report export for chat findings, compliance audits, and meeting minutes. | Export / Reporting | `📋 Next Sprint (Queued)` |
| **Phase 13** | **Interactive Knowledge Graph (2D/3D)** | Visual interactive map of interconnected documents, key entities, companies, and action items. | Graph Engine / Visualization | `📋 Next Sprint (Queued)` |

---

## 🎯 Verification & Automated Quality Metrics

* **Automated Test Suite:** **92 / 92 automated tests passing cleanly** across all units (auth, RBAC, document chunking, audio parsing, meeting intelligence, rate limiting, and vector retrieval).
* **Production Deployment Target:** DigitalOcean VPS `159.89.110.69` (`https://vectrieve.duckdns.org`).
