# 🗺️ Vectrieve AI — Enterprise Product Roadmap & Technical Backlog

> **Vectrieve AI** is a production-grade, local-first Private Knowledge Base and Retrieval-Augmented Generation (RAG) platform designed for teams with strict data sovereignty, low-latency requirements, and hybrid compute flexibility (Local Ollama / Cloud Groq).

---

## 📊 Milestone Execution Matrix

| Phase | Feature / Milestone | Core Capability | Target Layer | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Phase 1** | **Per-Space LLM Configuration** | Multi-model routing (Groq / Ollama), granular hyperparameter control (`temperature`, `max_tokens`, `top_p`) per workspace. | Backend API / Settings UI | `✅ Completed` |
| **Phase 2** | **RBAC Foundation & Telemetry** | Role-based access control, Admin dashboard (`/analytics`) protected via `require_admin`, real-time RAG query latency & connection pool tracking. | Auth / Telemetry / UI | `✅ Completed` |
| **Phase 3a** | **Document Parsing: Rich Text** | Deep text extraction for `.docx`, `.md`, `.html`, and structured `.txt` with recursive semantic chunking. | Ingestion Pipeline | `✅ Completed` |
| **Phase 3b** | **Document Parsing: Structured Data** | Column/header-preserving row-group chunking for `.csv`, `.xlsx`, and `.json` with robust encoding fallback (`UTF-8`, `Windows-1251`, `Latin-1`). | Ingestion Pipeline | `✅ Completed` |
| **Phase 3c** | **Multimodal Vision & Presentation OCR** | Automatic diagram & chart captioning via Vision LLMs for `.png`, `.jpg`, scanned PDFs, and slide-by-slide `.pptx` presentation indexing. | Vision Pipeline / Qdrant | `✅ Completed` |
| **Phase 4a** | **Workspace Sharing: Backend RBAC** | Multi-tenant `SpaceMember` model with strict role boundaries (`Owner`, `Editor`, `Viewer`), cascaded permissions, and Alembic DB migrations. | Database / RBAC Engine | `✅ Completed` |
| **Phase 4b** | **Workspace Sharing: Frontend UI** | Interactive workspace member management modal (`SpaceMembersModal`), email-based invites, dynamic role selector, and instant member removal. | React / Next.js / Tailwind | `✅ Completed` |
| **Phase 5** | **Cloud Model & Hybrid Search** | Llama 3.3 70B on Groq Cloud, FastEmbed BGE ONNX embeddings, BM25 sparse search, and Cross-Encoder reranking. | Core LLM / Vector Service | `✅ Completed` |
| **Phase 6** | **Internationalization (i18n) & UI Polish** | 100% full-surface localization (`en`, `uk`, `pl`, `es`), dynamic font scaling, smart API key quota detection, feedback modal. | Frontend UI / i18n Context | `✅ Completed` |
| **Phase 7** | **Seamless Identity (Google & Microsoft SSO)** | One-click Google/Microsoft OAuth2 login with automatic account unification (linking existing email accounts without duplicates). | Auth / Database / UI | `📋 Planned (Next)` |
| **Phase 8** | **Audio & Meeting Intelligence Pipeline** | Drag-and-drop meeting audio/video upload (`.mp3`, `.wav`, `.m4a`, `.mp4`, `.mov`, `.mkv`), Groq Whisper transcription, action-item extraction. | Ingestion / Media Services | `📋 Planned` |
| **Phase 9** | **Cloud Knowledge Connectors (Google Drive & Notion)** | Scheduled & on-demand sync from Google Drive folders and Notion workspaces directly into designated Workspaces. | Connectors / Celery Tasks | `📋 Planned` |
| **Phase 10** | **Anti-Hallucination & Junior-Safe RAG Mode** | Dual-output formatting (manager brief + ready-to-copy client response), strict groundings, and semantic confidence scoring. | Prompt Engine / RAG | `📋 Planned` |
| **Phase 11** | **Commercial Billing Foundation (Stripe / Paddle)** | Modular subscription schema (`Subscription`, `Plan`, `Customer`), webhook processors for plan limits, prepared without hard paywalls. | Billing / Backend | `📋 Planned` |
| **Phase 12** | **On-Premise Enterprise Box (Air-Gapped)** | Single-tenant self-hosted Docker distribution with local Ollama/vLLM backend for law firms, medical clinics, and financial institutions. | DevOps / Packaging | `📋 Planned` |

---

## 🎯 Detailed Architectural Breakdown for Upcoming Milestones

---

### 🔑 Phase 7: Seamless Identity & OAuth2 (Google & Microsoft SSO)

#### Objective
Enable friction-free one-click authentication while preserving complete database integrity for existing users.

#### Key Architectural Requirements
1. **Google & Microsoft OAuth2 Handshake:**
   - Standard PKCE OAuth2 flow integrated with Next.js `/api/auth/callback/google` and `/api/auth/callback/microsoft`.
   - Client tokens forwarded to FastAPI `/api/v1/auth/oauth/google` for cryptographic JWT token verification.
2. **Smart Account Unification (Anti-Duplicate Engine):**
   - If a user signs in via Google with `pepryk.stas@gmail.com` and that email was previously registered via email/password:
     - The system **links the Google Subject ID (`google_sub`)** to the existing `User` entity.
     - Does **NOT** create a second duplicate account.
     - Preserves all existing workspaces, documents, chat histories, and API key preferences.
   - If the user is new:
     - Creates a new `User` record with `is_approved = true` (or pending based on global admin policy).
3. **Account Conflict & Deletion Management:**
   - Clear UI notices if an email conflict requires password re-verification.
   - Self-service account deletion request workflow for GDPR compliance.

---

### 🎙️ Phase 8: Audio & Meeting Intelligence Pipeline (Groq Whisper)

#### Objective
Transform unstructured meeting audio and video recordings into structured, searchable organizational knowledge.

#### Key Architectural Requirements
1. **Format Handling & FFMPEG Processing:**
   - Support `.mp3`, `.wav`, `.m4a`, `.flac`, `.mp4`, `.mov`, `.mkv`, `.webm` (up to 100MB).
   - Automatic background audio track extraction via `ffmpeg` with normalization to 16kHz mono WAV.
2. **Groq Whisper Transcription (`whisper-large-v3`):**
   - Transcribe full audio in seconds with native multilingual support (Ukrainian, English, Polish, Spanish).
3. **Structured Chunking & Metadata Extraction:**
   - Split transcripts into timestamped dialogue chunks `[00:04:12 - 00:05:30] Speaker: ...`.
   - Automatic generation of:
     - **Executive Summary** (3-5 bullet points).
     - **Action Items & Assigned Tasks**.
     - **Key Decisions Taken**.
   - Embed into Qdrant with `doc_type = "audio_transcript"` for instant semantic search.

---

### ☁️ Phase 9: Cloud Knowledge Connectors (Google Drive & Notion)

#### Objective
Eliminate manual file uploads by allowing teams to connect live Google Drive folders and Notion workspaces.

#### Key Architectural Requirements
1. **Google Drive Integration:**
   - Read-only OAuth scope (`https://www.googleapis.com/auth/drive.readonly`).
   - Folder selector UI allowing users to bind specific Drive folders to specific Vectrieve Workspaces.
   - Automatic conversion and vectorization of Google Docs, Google Slides, and uploaded PDFs.
2. **Notion Integration:**
   - Notion API token connection.
   - Recursive page and database extraction with markdown formatting preservation.
3. **Sync Engine (Scheduled & Manual):**
   - "Sync Now" button in workspace settings.
   - Checksum-based differential updates (only re-indexes files whose `modified_time` or hash changed).

---

### 🛡️ Phase 10: Anti-Hallucination & Intern-Safe Grounding (Customer Support Mode)

#### Objective
Ensure that answers generated by Vectrieve can be safely copied and pasted by junior staff and interns without risk of hallucination.

#### Key Architectural Requirements
1. **Two-Tier Structured Response Format:**
   - **Tier 1 (Internal Manager Brief):** Bullet points of facts found in knowledge base + references.
   - **Tier 2 (Client-Ready Message):** Polished, professional message ready to paste directly into customer support chat, Zendesk, or email.
2. **Strict Grounding Rule (Zero Hallucination Policy):**
   - If the requested policy or fact is not explicitly stated in the retrieved context, the AI must explicitly answer: *"This information is not specified in the current company knowledge base. Please escalate to a supervisor."*
   - Every claim must include clickable reference badges `[Source: Contract_v2.pdf, page 4]`.
3. **Semantic Confidence Score:**
   - Compute aggregate cosine similarity & Cross-Encoder score to display a safety indicator (e.g. `98% Factual Grounding Confidence`).

---

### 💳 Phase 11: Commercial Billing Foundation (Stripe / Paddle)

#### Objective
Lay down the complete billing, customer, and subscription database schema and webhook handlers in code without locking current users behind a paywall.

#### Key Architectural Requirements
1. **Data Models (`Subscription`, `Plan`, `Customer`):**
   - Track plan type: `Free / Trial`, `Pro ($29/mo)`, `Team ($99/mo)`.
   - Track usage counters: `total_queries_month`, `storage_mb_used`, `seats_count`.
2. **Stripe Webhook Pipeline:**
   - `/api/v1/billing/webhook` processing:
     - `checkout.session.completed` ➔ activate plan.
     - `invoice.payment_succeeded` ➔ reset monthly counters.
     - `customer.subscription.deleted` ➔ graceful downgrade to free tier.
3. **Feature-Flagged Activation:**
   - Billing checks are wrapped in a feature flag (`ENABLE_COMMERCIAL_BILLING=false`) so the platform remains fully functional during beta testing.

---

### 🏢 Phase 12: Private Enterprise On-Premise Box (Air-Gapped)

#### Objective
Provide a turn-key, private deployment package for enterprise clients (law firms, medical clinics, accounting agencies) who require 100% data residency on their own servers.

#### Key Architectural Requirements
1. **Self-Contained Docker Compose:**
   - Single-command deployment: `docker compose -f docker-compose.enterprise.yml up -d`.
   - Local embedding (`fastembed` ONNX) and local LLM runtime (Ollama / vLLM with `llama-3.3-70b-instruct` or `qwen-2.5-32b`).
2. **Zero External Network Leaks:**
   - Air-gapped configuration ensuring no telemetry, prompts, or embeddings ever leave the company firewall.

---

## 🧹 Technical Debt & Refactoring Backlog

### 🔴 High Criticality (Monolithic UI Components > 450 Lines)

* [ ] **`frontend/components/chat/AudioBrief.tsx` (930 lines)**:
  * **Target Decomposition**:
    * `frontend/hooks/useAudioPlayer.ts` — Audio context lifecycle, playback state, and WebAudio analyser node.
    * `frontend/components/chat/AudioWaveform.tsx` — Canvas frequency spectrum & waveform animation.
    * `frontend/components/chat/AudioTranscript.tsx` — Timed subtitle cards and speaker active turn highlight.
    * `frontend/components/chat/AudioBrief.tsx` — Clean high-level container orchestration (~120 lines).

* [ ] **`frontend/components/chat/ChatArea.tsx` (452 lines)**:
  * **Target Decomposition**:
    * `frontend/components/chat/WelcomeHero.tsx` — Empty state hero & suggested prompt pills.
    * `frontend/components/chat/TrialModal.tsx` — 20-query trial limit exhausted dialog.
    * `frontend/components/chat/ChatArea.tsx` — Pure message list rendering and auto-scroll control.

---

## 🧪 Automated Test & Quality Assurance Invariants

- **Backend:** `pytest tests/` must maintain 100% green tests across all auth, RBAC, RAG, and parser modules.
- **Frontend:** `npx tsc --noEmit` and `npm run build` must compile with 0 TypeScript and Next.js errors before any deployment.
- **Production Server:** VPS Ubuntu `159.89.110.69` running automated Docker Compose stack (`vectrieve-frontend`, `vectrieve-backend`, `vectrieve-postgres`, `vectrieve-qdrant`).
