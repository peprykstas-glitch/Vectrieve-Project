# Vectrieve AI — Product Roadmap & Future Tasks

## Roadmap Overview

| Phase | Feature / Milestone | Complexity | Target Component | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Per-Space LLM Configuration** | Medium | Backend API / UI | `[x] Completed` |
| 2 | **RBAC Foundation + Admin Analytics** | Medium | Auth / User model / UI | `[ ] Backlog` |
| 3a | **Ingestion: Rich Text Formats** (docx/md/html) | Low | Parser Service | `[ ] Backlog` |
| 3b | **Ingestion: Structured Data** (csv/xlsx/json) | Medium | Parser Service / Chunking | `[ ] Backlog` |
| 3c | **Ingestion: Vision/OCR** (images, scanned PDFs, pptx) | Medium–High | Parser Service / Embedding | `[ ] Backlog` |
| 3d | **Ingestion: Audio Transcription** (Whisper) | High | Parser Service / Infra | `[ ] Backlog` |
| 4 | **Workspace Sharing — Static Membership** (Owner/Editor/Viewer, no live sync) | Very High | Database / Auth | `[ ] Backlog` |
| 5 | **Live Collaborative Chat** (realtime sync) | Very High (later) | WebSocket / DB | `[ ] Icebox` |

---

## Detailed Specifications

### 1. Per-Space LLM Configuration
* Users select LLM provider (Groq/Ollama) and model per space.
* Configure hyperparameters (temperature, max_tokens, top_p) per space.
* **Core Rule Configuration:** Space-level settings act as **hard limits** for provider/model selection (preventing unauthorized cost surprises or security risks), and **soft defaults** for temperature/max_tokens (allowing override per-query via `QueryRequest` if needed).
* Store settings in the `Space` table and load them dynamically during LLM RAG prompt generation (`_prepare_rag_context`).
* **Technical Debt / Future Improvement:** Currently, model-provider compatibility is validated using exact match lists and suffix/prefix heuristics to prevent blocking custom/new models (Option 1). Future iterations should implement dynamic validation (Option 2) by querying `ollama_client.list()` for local models and `groq_client.models.list()` for cloud models to verify existence in real-time.

### 2. RBAC Foundation + Admin Analytics
* Add `User.is_admin: bool` (or a minimal `Role` enum) seeded via environment variables, CLI tools, or migration scripts. **Specific personal emails must never be hardcoded in the codebase.**
* Gate `/analytics` endpoints behind a new `is_admin` attribute check, returning `403 Forbidden` for non-admin users.
* Implement this check as a reusable FastAPI dependency (e.g. `Depends(require_admin)`). This creates the foundational role check module to be reused in Phase 4 (Workspace Sharing).
* Telemetry targets: dense/sparse search latency, cross-encoder rerank latency, token throughput per second, DB connection pool health, and thumbs-up/thumbs-down ratio stats matched to query templates.

### 3a. Ingestion: Rich Text Formats
* Support `.docx`, `.md`, and `.html` files.
* Reuse the text extraction patterns (like `extract_text_from_docx`) in `pdf_parser.py`.
* Highest-ratio value for lowest risk: scheduled as the first item of the ingestion overhaul.

### 3b. Ingestion: Structured Data
* Support `.csv`, `.xlsx`, and `.json` files.
* Replace `RecursiveCharacterTextSplitter` with a **row-grouped parser** that chunks tables into logical rows while prefixing or injecting header/column metadata into every chunk to preserve table structure.
* Scope MVP retrieval to standard row-group semantic matching (no natural language text-to-SQL execution in v1).

### 3c. Ingestion: Vision/OCR
* Support images (`.png`, `.jpg`) and scanned image-only PDFs using OCR (e.g. Tesseract or cloud Vision APIs).
* Support presentations (`.pptx`) by chunking slides individually.
* **MVP Strategy:** Process images using a vision model (e.g. Llama-3-Vision) to generate a textual caption/summary, and insert the caption text into the existing dense vector collection using `nomic-embed-text`. CLIP-style multimodal vector spaces are deferred.
* **Technical Debt / Future Improvements:**
  * **Hardcoded Vision Models:** The defaults for vision models (`meta-llama/llama-4-scout-17b-16e-instruct` for Groq, `llava` for Ollama) are hardcoded in `llm_service.py`. These must be verified against current model catalogs before release to prevent silent failures returning empty descriptions.
  * **Simulated Local Streaming:** Currently, local streaming (`mode == 'local'`) in `generate_response_stream` is simulated by fetching the complete response and splitting it by words with a delay. Future versions should implement true token-by-token streaming using Ollama's native streaming (`stream=True` in `ollama.Client.chat()`).
  * **Resource Safety & Event Loop:** Scanned PDF parsing and rendering are offloaded to worker threads via `asyncio.to_thread` with a strict `try/finally` block to release pypdfium2 C-level resources. Ensure these patterns are reused for any future binary parsers.


### 3d. Ingestion: Audio Transcription
* Support `.mp3`, `.wav`, and `.m4a` files using Whisper APIs or local Whisper models.
* Add a `TRANSCRIBING` status to the backend file ingestion state machine.
* Raise client-side polling timeouts in `useChat.ts` (`MAX_POLL_TIME_MS`) to account for longer audio transcribing times.

### 4. Workspace Sharing — Static Membership
* Introduce a `SpaceMember(space_id, user_id, role)` table mapping membership with roles (`Owner`, `Editor`, `Viewer`).
* Refactor database query checks in `chat.py`, `upload.py`, `spaces.py`, `sessions.py`, and `vector_service.py` to check for active workspace membership instead of single ownership (`Space.user_id == current_user.id`).
* **Data Migration:** Create a migration script that automatically populates the `SpaceMember` table by designating the current owner of every existing space as `Owner`.
* Excludes simultaneous live typing collaboration in v1. Members share space chat history sequentially.

### 5. Live Collaborative Chat (Icebox)
* Support real-time chat sessions (concurrent streams, presence indicator, cursor tracking, and collaborative state synchronization via WebSockets).
* Deferred to the Icebox; to be implemented only if Phase 4 telemetry reveals team demand for simultaneous RAG editing sessions.
