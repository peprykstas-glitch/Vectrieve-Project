# Vectrieve AI — Product Roadmap & Future Tasks

This document tracks the long-term development roadmap and feature backlog for Vectrieve AI. It acts as the single source of truth for upcoming architectural, feature, and security enhancements.

---

## Roadmap Overview

| Feature / Milestone | Complexity | Target Component | Status |
| :--- | :--- | :--- | :--- |
| **1. Individual LLM Configuration Per Space** | Medium | Backend API / UI | `[ ] Backlog` |
| **2. Admin-Restricted Performance Analytics** | Medium | Auth / BFF Proxy / UI | `[ ] Backlog` |
| **3. Multi-Format & Audio Document Ingestion** | High | Ingestion / Parser Service | `[ ] Backlog` |
| **4. Workspace Sharing & Collaboration** | Very High | Database / RLS / Auth | `[ ] Backlog` |
| **5. Multimodal Vision RAG & OCR Ingestion** | High | Embedding Pipeline / DB | `[ ] Backlog` |

---

## Detailed Specifications

### 1. Individual LLM Configuration Per Space
Currently, spaces support custom system instructions (`system_prompt`). The goal is to extend this to full LLM profiles per space.
* **Requirements:**
  * Allow users to select LLM providers (e.g., Groq vs. local Ollama) and specific models (e.g., Llama-3-70b vs. Mistral) per space.
  * Allow configuring hyper-parameters (e.g., temperature, max tokens, top-p) per space.
  * Store configurations in the `Space` table and load them dynamically during query generation.

### 2. Admin-Restricted Performance Analytics
The current analytics dashboard is visible to all authenticated users and lacks detailed developer-centric metrics.
* **Requirements:**
  * **RBAC Enforcement:** Restrict the `/analytics` dashboard to accounts verified as admins. Specifically, configure a bootstrap list of admin emails (e.g., `pepryk.stas@gmail.com`). Non-admin requests to analytics endpoints must return a `403 Forbidden` response.
  * **Developer Metrics:** Stop collecting generic metrics and focus on performance telemetry:
    * Vector search latency (dense vs. sparse steps).
    * Rerank processing latency.
    * Model token throughput (tokens per second).
    * Storage and memory consumption of Qdrant and PostgreSQL.
    * User feedback ratios matched to query templates.

### 3. Multi-Format & Audio Document Ingestion
Extend the ingestion engine to process documents beyond standard PDFs and basic TXT files.
* **Requirements:**
  * **Audio Ingestion:** Add Whisper (or similar local/cloud transcribe APIs) to process audio files (`.mp3`, `.wav`, `.m4a`) and automatically parse their text transcripts into Qdrant vector spaces.
  * **Structured Data:** Add native parsers for `.csv`, `.xlsx`, and `.json` to ingest tabular data with row/column context retention.
  * **Rich Text formats:** Support `.docx`, `.md`, and `.html` formatting rules.

### 4. Workspace Sharing & Collaboration
Elevate spaces from single-user environments to team-based workspaces.
* **Requirements:**
  * Add a `SpaceMember` join table linking users to spaces with distinct access roles (e.g., Owner, Editor, Viewer).
  * Update database query filters from `user_id == current_user.id` to verify membership in the requested `space_id`.
  * Support live collaborative RAG chats and shared knowledge base modifications.

### 5. Multimodal Vision RAG & OCR Ingestion
Support documents with rich visual structures such as slide presentations, scanned documents, and embedded charts.
* **Requirements:**
  * Integrate an OCR parser (e.g., Tesseract or cloud Vision API) to extract text from image-only PDFs and standalone image uploads (`.png`, `.jpg`).
  * Process presentation slides (`.pptx`) by treating each slide as a standalone visual/textual chunk.
  * Store image summaries alongside dense vector embeddings to match user queries to graphical content.
