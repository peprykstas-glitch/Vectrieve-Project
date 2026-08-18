# GEMINI.md - Core AI System Instructions & Project Invariants

> This file is automatically loaded into the AI assistant's context on every interaction.

## 0. Project Overview & Architectural Standards

**Project:** Vectrieve Core (Private AI Knowledge & Hybrid RAG Assistant)
- **Frontend:** Next.js 16 (Turbopack, TypeScript, Tailwind CSS, Lucide Icons, i18n Context).
- **Backend:** FastAPI (Python 3.12, SQLModel, Alembic, PostgreSQL, Qdrant Vector DB).
- **Inference Mode:** Cloud Enterprise (Groq Cloud API `llama-3.3-70b-versatile` / FastEmbed BGE ONNX embeddings).
- **Production Server:** Ubuntu VPS `159.89.110.69` (Docker Compose `docker-compose.prod.yml`).

---

## 1. Non-Negotiable Project Invariants

1. **Default Platform Language:**
   - **English (`en`) MUST ALWAYS be the platform-wide default language** across all views, initial states, and fallback contexts.
   - Ukrainian (`uk`), Polish (`pl`), and Spanish (`es`) are full-featured selectable languages stored in `localStorage`.
2. **Enterprise Polish & No Emoji Clutter:**
   - Do NOT use emoji decorations in transcripts, buttons, headings, tables, or toast alerts.
   - Use clean, professional Lucide vector icons and crisp typography.
3. **Admin Route & Header Layout:**
   - The admin/telemetry view is named **Admin** (`/analytics`).
   - Floating AI Persona selectors (`Mentor Mode`, `Auditor Mode`, `Architect Mode`) are strictly isolated to the Chat page (`/`) and must NOT collide with or render on other pages (`/files`, `/settings`, `/analytics`).
4. **API Key Status vs Trial Quota:**
   - When a user has configured their personal Groq API key, hide the 20-query trial limit bar and display the **Personal API Key Connected** status badge.

---

# AI & Developer Instructions: Change Safety, Backup & Rollback Protocol

**Purpose:**
This document defines the mandatory safety protocol for AI coding assistants (Antigravity, Claude Code, Codex, Cursor agents, etc.) and human developers working on this project.

The goal is simple:
> **A high-risk change must always have a verified recovery point before the first modification is made.**

This protocol is intentionally conservative around Git history, databases, authentication, ownership, BFF infrastructure, and other changes that can be difficult or impossible to undo safely.

When an AI agent is operating independently, these rules are **hard constraints**, not suggestions.

---

## 2. Core Safety Principles

### Principle 1 — Inspect first, modify second
The agent may inspect the repository, read files, inspect Git status, inspect migrations, inspect configuration, run non-destructive tests, and determine the risk class of a requested change.

The agent **MUST NOT modify files, schemas, databases, authentication logic, production services, or running data volumes before the required safety checkpoint has been completed.**

### Principle 2 — Never destroy user work
The agent must never overwrite, discard, stage, commit, reset, stash, or otherwise alter pre-existing user changes unless explicitly authorized.
A dirty working tree is not permission to "clean it up."

If unrelated user changes already exist:
1. Do not include them in the safety checkpoint.
2. Do not modify them.
3. Do not run destructive Git commands against them.
4. Stop and report the dirty state unless a safe strategy for isolating the requested work is available.

**Never create a checkpoint by blindly running `git add -A` on an unknown dirty repository.**

### Principle 3 — Git is not a database backup
A Git commit protects source code. It does **not** protect:
* PostgreSQL data
* Qdrant collections
* Docker volumes
* generated artifacts
* secrets
* external service state
* production configuration
* user-uploaded files

Database and persistent-volume changes require an appropriate data backup in addition to Git.

### Principle 4 — Roll back before attempting emergency repair
When a high-risk operation fails unexpectedly:
> **Stop → preserve the failed state → roll back → diagnose → re-attempt in smaller steps.**

Do not repeatedly edit a broken migration, authentication system, database configuration, or BFF while the system is already in an unknown state.

### Principle 5 — Tests are evidence, not authorization
Passing tests does not automatically mean a high-risk change is accepted.
For changes involving:
* authentication
* authorization
* ownership
* production schema
* real user data
* destructive data operations

the final acceptance requires explicit human approval from **Stas**, unless the project owner has explicitly designated another approver.

---

## 3. Risk Classification

### 🟢 LOW RISK — Normal Workflow
These changes normally do **not** require the full safety checkpoint:
* New API endpoints that do not modify security-critical authorization logic
* New parsers / service functions
* UI components, styling, and text translations
* Tests and documentation
* Non-destructive refactors
* Additive configuration that has no impact on production infrastructure

If an apparently routine change unexpectedly touches authentication, ownership, real data, persistent storage, or infrastructure, the agent must immediately reclassify it as high risk.

### 🔴 HIGH RISK — Mandatory Safety Checkpoint
A safety checkpoint is mandatory before editing files for:
* **Database schema changes:** dropping tables/columns, type changes, foreign keys, destructive migrations.
* **Database connection architecture:** changing drivers, pooling, `core/database.py`, session behavior.
* **Authentication / authorization:** `api/deps.py`, `require_admin`, `get_current_user`, middleware, token validation, `Space.user_id`, `SpaceMember`, cross-user isolation.
* **LLM / security configuration:** `resolve_llm_config`, API keys, secret handling.
* **BFF / proxy infrastructure:** `/api/proxy/*`, token forwarding, `core/rate_limiter.py`.
* **Persistent data infrastructure:** PostgreSQL / Qdrant Docker volumes, index rebuilds.

### ⚫ IRREVERSIBLE / DESTRUCTIVE OPERATIONS
* Deleting production data or persistent volumes
* Dropping production tables or columns
* Changing ownership semantics or mass data rewrites

> **The agent MUST NOT execute the destructive operation without explicit human approval immediately before execution.**

---

## 4. Mandatory Pre-Change & Checkpoint Workflow

1. **Step 1 — Inspect:**
   ```bash
   git status
   git branch --show-current
   git log -5 --oneline
   ```
2. **Step 2 — Verify Clean State:** Ensure unrelated user changes are not destroyed.
3. **Step 3 — Create Git Checkpoint & Tag (for High-Risk):**
   ```bash
   git add -A
   git commit -m "chore: pre-[change-name] stable checkpoint"
   git tag stable-pre-[change-name]-$(date +%Y%m%d-%H%M%S)
   ```
4. **Step 4 — Database Dump (when schema/data affected):**
   ```bash
   pg_dump --format=custom --file="backups/postgres_pre_[change-name]_[timestamp].dump" <DATABASE_NAME>
   ```

---

## 5. Definition of Done
A task is complete only when:
- [ ] Code is implemented cleanly without breaking adjacent modules.
- [ ] Automated build (`npm run build` / backend tests) succeeds with 0 errors.
- [ ] No regression in UI/UX (layout collisions, responsiveness, scrolling).
- [ ] Changes are verified and deployed to production where requested.
