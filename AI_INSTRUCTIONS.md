# AI & Developer Instructions: Change Safety, Backup & Rollback Protocol

**Purpose:**
This document defines the mandatory safety protocol for AI coding assistants (Antigravity, Claude Code, Codex, Cursor agents, etc.) and human developers working on this project.

The goal is simple:

> **A high-risk change must always have a verified recovery point before the first modification is made.**

This protocol is intentionally conservative around Git history, databases, authentication, ownership, BFF infrastructure, and other changes that can be difficult or impossible to undo safely.

It applies to both AI agents and humans.
When an AI agent is operating independently, these rules are **hard constraints**, not suggestions.

---

## 0. Core Safety Principles

### Principle 1 — Inspect first, modify second

The agent may inspect the repository, read files, inspect Git status, inspect migrations, inspect configuration, run non-destructive tests, and determine the risk class of a requested change.

The agent **MUST NOT modify files, schemas, databases, authentication logic, production services, or running data volumes before the required safety checkpoint has been completed.**

---

### Principle 2 — Never destroy user work

The agent must never overwrite, discard, stage, commit, reset, stash, or otherwise alter pre-existing user changes unless explicitly authorized.

A dirty working tree is not permission to "clean it up."

If unrelated user changes already exist:

1. Do not include them in the safety checkpoint.
2. Do not modify them.
3. Do not run destructive Git commands against them.
4. Stop and report the dirty state unless a safe strategy for isolating the requested work is available.

**Never create a checkpoint by blindly running `git add -A` on an unknown dirty repository.**

---

### Principle 3 — Git is not a database backup

A Git commit protects source code.

It does **not** protect:

* PostgreSQL data
* Qdrant collections
* Docker volumes
* generated artifacts
* secrets
* external service state
* production configuration
* user-uploaded files

Database and persistent-volume changes require an appropriate data backup in addition to Git.

---

### Principle 4 — Roll back before attempting emergency repair

When a high-risk operation fails unexpectedly:

> **Stop → preserve the failed state → roll back → diagnose → re-attempt in smaller steps.**

Do not repeatedly edit a broken migration, authentication system, database configuration, or BFF while the system is already in an unknown state.

---

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

# 1. Risk Classification

Before changing anything, classify the requested work into one of the following categories.

---

## 🟢 LOW RISK — Normal Workflow

These changes normally do **not** require the full safety checkpoint:

* New API endpoints that do not modify security-critical authorization logic
* New parsers
* New service functions
* UI components
* Styling
* Tests
* Documentation
* Non-destructive refactors
* New frontend pages
* New isolated utility functions
* Additive configuration that has no impact on production infrastructure
* Routine additive migrations that have already been validated against a disposable development database with successful rollback

Low risk does **not** mean zero risk.

If an apparently routine change unexpectedly touches authentication, ownership, real data, persistent storage, or infrastructure, the agent must immediately reclassify it as high risk.

---

# 2. 🔴 HIGH RISK — Mandatory Safety Checkpoint

A safety checkpoint is mandatory before editing files for any of the following.

## Desktop packaging / deployment architecture

* Electron
* Tauri
* PyInstaller
* Neutralino
* other desktop wrappers
* major packaging/runtime changes

---

## Database schema changes

Especially:

* dropping tables
* dropping columns
* changing column types
* changing constraints
* changing foreign keys
* changing indexes with production implications
* data migrations
* backfills
* destructive migrations
* migrations touching real user data

Routine additive migrations are exempt only when they have already been successfully validated against a disposable development database.

---

## Database backend or connection architecture

Examples:

* PostgreSQL → SQLite
* SQLite → PostgreSQL
* changing database drivers
* changing pooling configuration
* modifying `core/database.py`
* changing transaction/session behavior
* changing database connection lifecycle
* changing replication or persistence configuration

---

## Authentication / authorization

Mandatory checkpoint for changes to:

* `api/deps.py`
* `require_admin`
* `get_current_user`
* authentication middleware
* session/token validation
* permission checks
* role resolution
* ownership validation
* `Space.user_id`
* `SpaceMember`
* workspace sharing
* access-control boundaries

Any change that can potentially allow one user to access another user's data is automatically high risk.

---

## LLM configuration / security-sensitive configuration

Examples:

* `resolve_llm_config`
* provider credentials handling
* API key handling
* secret loading
* model access permissions
* per-user/per-space model configuration
* security-sensitive environment configuration

---

## BFF / proxy infrastructure

Mandatory checkpoint for changes to:

* `/api/proxy/*`
* token forwarding
* upstream routing
* proxy authentication
* request signing
* request filtering
* `core/rate_limiter.py`
* rate-limit semantics
* proxy security boundaries

---

## Persistent data infrastructure

Mandatory checkpoint for:

* PostgreSQL persistent volumes
* Qdrant persistent volumes
* storage layout changes
* index rebuilds
* destructive collection operations
* database migrations against real data

---

# 3. ⚫ IRREVERSIBLE / DESTRUCTIVE OPERATIONS

Some operations require an additional approval gate even after the backup checkpoint.

These include:

* deleting production data
* dropping production tables or columns
* destructive data transformations
* deleting persistent volumes
* recreating databases
* replacing authentication/authorization architecture
* changing ownership semantics
* mass data rewrites
* irreversible migrations
* destructive index/collection operations

For these operations:

> **The agent MUST NOT execute the destructive operation without explicit human approval immediately before execution.**

A backup does not constitute permission to perform a destructive operation.

---

# 4. Mandatory Pre-Change Workflow

For every high-risk change, follow this exact order.

---

## Step 1 — Inspect and classify

Before modifying anything:

```bash
git status
git branch --show-current
git log -5 --oneline
```

Then inspect the relevant files, configuration, migrations, Docker configuration, and tests.

Determine:

```text
Risk level: LOW / HIGH / IRREVERSIBLE
Requires Git checkpoint: YES / NO
Requires database backup: YES / NO
Requires persistent-volume backup: YES / NO
Requires explicit approval before execution: YES / NO
```

The agent must know what needs protection before touching it.

---

# 5. Working Tree Safety

Before creating the checkpoint:

```bash
git status --short
```

### If the working tree is clean

Proceed normally.

### If the working tree contains existing changes

The agent must determine whether those changes belong to the requested task.

### Existing changes belonging to the current task

They may be included in the checkpoint **only if their ownership is unambiguous**.

### Existing unrelated changes

Do **not**:

```bash
git add -A
git reset --hard
git clean -fd
git checkout .
git restore .
```

Do not stage or commit unrelated work.

Instead, preserve it untouched and isolate the requested change using a safe strategy.

If isolation cannot be performed safely, stop before modifying anything.

---

# 6. Create the Git Recovery Point

Once the tree is verified as safe to checkpoint:

```bash
git add -A
git commit -m "chore: pre-[change-name] stable checkpoint"
```

Then create an immutable recovery tag with sufficient uniqueness:

```bash
git tag stable-pre-[change-name]-$(date +%Y%m%d-%H%M%S)
```

Verify the tag:

```bash
git show --stat --oneline stable-pre-[change-name]-<timestamp>
git status
```

The working tree should now be clean.

Record the exact tag name.

Example:

```text
stable-pre-auth-rewrite-20260815-182412
```

The tag is the canonical source-code recovery point for this change.

---

# 7. Database Backup Protocol

A Git checkpoint is insufficient when real data may be affected.

The backup method depends on the database.

---

## PostgreSQL

For logical recovery, create a database dump using PostgreSQL-native tooling appropriate to the project's environment.

Example:

```bash
pg_dump \
  --format=custom \
  --file="backups/postgres_pre_[change-name]_[timestamp].dump" \
  <DATABASE_NAME>
```

For restoration:

```bash
pg_restore \
  --clean \
  --if-exists \
  --dbname=<DATABASE_NAME> \
  "backups/postgres_pre_[change-name]_[timestamp].dump"
```

The exact connection arguments must come from the project's existing configuration or environment.

**Never invent credentials, hostnames, database names, or ports.**

After creating the backup, verify that the file exists and is non-empty:

```bash
ls -lh backups/
```

Where practical, perform a restore test against a disposable database.

---

## PostgreSQL physical-volume backup

A copy of `postgres_data/` is **not automatically considered a valid PostgreSQL backup**.

Filesystem-level PostgreSQL backups should only be used according to a PostgreSQL-consistent backup procedure.

If the project uses Docker volumes, prefer a controlled snapshot/backup procedure rather than blindly copying an actively changing database directory.

Never assume that:

```bash
cp -r postgres_data/ ...
```

constitutes a valid production backup.

---

## Qdrant

If Qdrant data may be affected, use Qdrant's supported snapshot/backup mechanism where available.

The agent must not assume that copying a live Qdrant storage directory produces a fully consistent backup.

A raw volume copy may be used as an additional emergency safeguard only when it is performed in a controlled state.

---

## 7.1 Decentralized "Backup Triangle" Architecture & Disaster Recovery Protocol

### Historical Incident & Context
In an earlier production deployment, DigitalOcean suddenly locked account and droplet access due to a billing issue, permanently wiping out all customer accounts, chat histories, uploaded knowledge documents, and telemetry logs. To guarantee that no single point of failure (SPOF) can ever destroy project data again, **Vectrieve operates under a decentralized 3-vertex backup topology**.

A single cloud provider (whether Azure, AWS, or DigitalOcean) can experience account suspensions, billing lockouts, or regional disasters. The system state must be fully restorable on a clean server within 15 minutes using independent, off-site data.

```
                  ┌───────────────────────────────┐
                  │   Vertex 1: Production Host   │
                  │         (Azure VM)            │
                  │   • Daily pg_dump & snapshots │
                  │   • Local 7-day retention     │
                  └──────────────┬────────────────┘
                                 │
                 Push Daily Dumps│(Automated S3/R2 API)
                                 ▼
                  ┌───────────────────────────────┐
                  │ Vertex 2: Independent Cloud   │
                  │   (Cloudflare R2 / AWS S3)    │
                  │   • Zero Azure dependency     │
                  │   • 30-day rolling archive    │
                  └──────────────┬────────────────┘
                                 │
               Weekly Sync / Pull│(scripts/sync_backups.py)
                                 ▼
                  ┌───────────────────────────────┐
                  │ Vertex 3: Local Workstation   │
                  │     (Stas's Laptop / PC)      │
                  │   • Offline physical storage  │
                  │   • 4 weekly snapshots        │
                  └───────────────────────────────┘
```

### The Three Vertices Specification

1. **Vertex 1: Production Host (Azure VM)**
   - **Path:** `/opt/vectrieve/backups/` (or `./backups/`).
   - **Trigger:** Daily cron job (`0 3 * * *`) executing `scripts/backup_production.sh`.
   - **Payload:**
     - PostgreSQL custom format dump (`pg_dump -F c -b -v -d vectrievedb`).
     - Qdrant collection snapshots (via REST API `POST /collections/{name}/snapshots`).
     - Compressed archive of user files and knowledge manuals (`backend_data/`).
     - Generated `SHA256SUMS` file.
   - **Retention:** Last 7 daily backups retained locally; older archives auto-pruned.

2. **Vertex 2: Independent Off-site Cloud Storage (Cloudflare R2 / AWS S3)**
   - **Rule:** Must **never** share billing, credentials, or organizational accounts with primary host Azure.
   - **Recommended:** Cloudflare R2 (S3-compatible API, $0 egress fees, 10GB free tier).
   - **Trigger:** Auto-uploaded immediately after creation by `scripts/backup_production.sh`.
   - **Retention:** 30 daily archives + monthly historical milestones.
   - **Security:** Encrypted at rest (AES-256) and in transit (TLS 1.3).

3. **Vertex 3: Local Workstation (Stas's PC / Laptop)**
   - **Path:** `c:\Projects\Vectrieve\backups\` (ignored by git in `.gitignore`).
   - **Trigger:** Weekly cron/scheduled task or single-command manual execution (`python scripts/sync_backups.py`).
   - **Function:** Pulls the newest verified bundle from Vertex 1 (via SSH/SCP) or Vertex 2 (via S3/R2 fallback).
   - **Retention:** Keeps the 4 most recent weekly snapshots locally on physical drive.
   - **Guarantee:** Air-gapped physical copy immune to any cloud vendor action.

### Disaster Recovery Time & Objectives
- **RPO (Recovery Point Objective):** $\le$ 24 hours in a worst-case complete provider destruction scenario; $\le$ 1 hour during operational server incidents.
- **RTO (Recovery Time Objective):** $\le$ 15 minutes to spin up a complete replacement stack on a new VPS using `docker-compose.prod.yml` and `scripts/restore_production.sh`.

### Verification Standard
A backup is invalid until verified:
1. File size must be non-zero and within expected ranges (> 100KB for DB dump).
2. SHA256 checksums must validate successfully.
3. Logical integrity must be validated periodically by performing a dry-run test restore into a disposable PostgreSQL test container.

# 8. Docker / Persistent Storage Safety

When persistent volumes are involved, determine whether the relevant service is actively writing data.

Before taking a filesystem-level snapshot, use the project's normal controlled shutdown procedure when appropriate:

```bash
docker compose stop <service>
```

Then perform the snapshot/backup.

After the backup:

```bash
docker compose up -d
```

Do not stop unrelated services unnecessarily.

Do not delete Docker volumes as part of a routine recovery attempt.

---

# 9. Migration Validation Protocol

## Development / disposable database

For a new migration, validate it against a disposable database before touching real data.

Recommended cycle:

```text
clean disposable DB
        ↓
upgrade head
        ↓
verify schema
        ↓
downgrade -1
        ↓
verify rollback
        ↓
upgrade head
        ↓
verify schema again
```

Example:

```bash
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

This verifies that:

* the migration applies
* the migration can roll back
* the migration can be reapplied
* the resulting schema is valid

---

## Real / production data

**Never use the development rollback cycle as a casual production rollback test.**

Do not execute:

```text
production upgrade
→ production downgrade
→ production upgrade
```

merely to prove that `downgrade()` works.

A production downgrade may destroy newly-created data or otherwise produce an unsafe state.

For real data:

1. Test the migration on a disposable/staging database first.
2. Inspect the generated SQL and migration logic.
3. Create the appropriate production backup.
4. Apply the migration once.
5. Verify the result.
6. Roll back only using a deliberate incident/recovery procedure.

---

# 10. Migration-Specific Requirements

Every non-trivial migration must be reviewed for:

* nullable vs non-nullable transitions
* existing rows
* foreign-key constraints
* unnamed constraints
* index compatibility
* data backfills
* default values
* downgrade data loss
* SQLModel/SQLAlchemy imports
* application/schema compatibility
* ordering dependencies
* long-running table locks
* transaction behavior

Do not assume that a migration is safe because Alembic generated it successfully.

If a migration has previously failed because of missing imports, constraint naming, SQLModel behavior, or similar issues, the relevant validation must be repeated after the fix.

---

# 11. Backup Verification

Creating a backup is not enough.

Before beginning the high-risk change, verify:

### Git

```bash
git status
git tag --list "stable-pre-[change-name]-*"
```

### Database

Verify the backup exists, is readable, and is associated with the correct database/environment.

### Persistent storage

Verify the snapshot/backup exists and corresponds to the intended environment.

The agent must be able to state:

```text
Git recovery point: VERIFIED
PostgreSQL backup: VERIFIED / NOT REQUIRED
Qdrant backup: VERIFIED / NOT REQUIRED
Explicit destructive-operation approval: REQUIRED / NOT REQUIRED
```

Only after this checkpoint is complete may the agent modify files.

---

# 12. During the Change

High-risk changes should be performed in the smallest independently verifiable steps possible.

The agent should:

1. Make one logical change.
2. Run the narrowest relevant tests.
3. Inspect the resulting state.
4. Continue only if the result is expected.
5. Avoid unrelated refactors.
6. Avoid opportunistic cleanup.
7. Avoid changing multiple safety-critical systems simultaneously unless required.

A high-risk task is not permission to rewrite adjacent code.

---

# 13. Unexpected Failure Protocol

If anything unexpected happens:

> **STOP.**

Do not continue changing files blindly.

Examples:

* migration fails
* database connection becomes inconsistent
* authentication tests unexpectedly fail
* users can see resources they should not see
* ownership checks behave unexpectedly
* proxy requests are routed incorrectly
* Docker storage behaves unexpectedly
* application startup breaks
* data appears missing or corrupted

Immediately preserve the current state before destructive rollback.

Create a rescue reference when necessary:

```bash
git branch rescue-[change-name]-$(date +%Y%m%d-%H%M%S)
```

or:

```bash
git tag rescue-[change-name]-$(date +%Y%m%d-%H%M%S)
```

Then roll back to the known-good checkpoint.

---

# 14. Safe Git Rollback

Only after the current state has been preserved:

```bash
git reset --hard stable-pre-[change-name]-<timestamp>
```

Do not use `git reset --hard` against an unverified repository state.

Before executing destructive Git rollback:

```bash
git status
git branch
git tag
```

Confirm that no recoverable user work will be destroyed.

Never use:

```bash
git clean -fdx
```

as a routine recovery command.

That command can permanently destroy ignored files, local environments, generated assets, and other untracked data.

---

# 15. Database Restore

If database state must be restored:

1. Stop the affected application/services if necessary.
2. Prevent additional writes.
3. Verify the correct backup.
4. Restore using the database's supported restore method.
5. Verify schema and data integrity.
6. Restart services.
7. Run application-level verification.
8. Do not resume the original high-risk change until the system is known-good.

Never restore a backup into an uncertain target database.

The agent must explicitly verify:

```text
backup source
target database
environment
timestamp
expected schema
```

before restoration.

---

# 16. Authentication / Authorization Safety

Authentication and authorization changes receive special treatment.

For any change involving:

```text
require_admin
get_current_user
Space.user_id
SpaceMember
workspace sharing
role checks
ownership checks
token/session validation
```

the agent must test at least:

```text
unauthenticated user
authenticated normal user
authenticated owner
authenticated non-owner
admin
cross-space access
invalid token/session
```

The fundamental invariant is:

> **A user must never gain access to another user's private data because of a refactor, missing ownership check, fallback, or routing mistake.**

If this invariant cannot be demonstrated, the change is not complete.

---

# 17. BFF / Proxy Safety

Changes to `/api/proxy/*` or `core/rate_limiter.py` must verify at minimum:

* authentication propagation
* token handling
* upstream routing
* request filtering
* response handling
* rate limiting
* unauthorized requests
* malformed requests
* upstream failures
* timeout behavior
* cross-user isolation

A proxy rewrite should not silently change security semantics.

---

# 18. Definition of Done

A high-risk change is complete only when **all applicable conditions** are satisfied.

### Code

* [ ] Requested functionality is implemented.
* [ ] No unrelated changes were introduced.
* [ ] Relevant tests pass.
* [ ] Full test suite passes where practical.

### Runtime

* [ ] Application starts successfully.
* [ ] Relevant functionality has been manually exercised.
* [ ] No unexpected runtime errors are present.

### Database

* [ ] Migration succeeds on the intended environment.
* [ ] Migration was validated on disposable/staging data.
* [ ] Schema matches expectations.
* [ ] No unintended data loss occurred.

### Security

* [ ] Authentication behavior is correct.
* [ ] Authorization behavior is correct.
* [ ] Ownership boundaries are preserved.
* [ ] Cross-user / cross-space access is explicitly checked where relevant.

### Backup / recovery

* [ ] Original stable Git tag still exists.
* [ ] Required database backup still exists.
* [ ] Required persistent-storage backup still exists.
* [ ] Recovery path is known and usable.

### Human acceptance

* [ ] **Stas explicitly confirms that the high-risk change is accepted.**

For security-critical or destructive changes, this final approval is mandatory regardless of test results.

---

# 19. Backup Retention

Do not delete the pre-change tag, branch, database backup, or storage snapshot immediately after the code appears to work.

The recovery point may be removed only after:

* the change is merged into `main`;
* the new code has been exercised successfully;
* the full relevant test suite passes;
* database validation succeeds where applicable;
* security/ownership checks pass where applicable;
* the application has completed at least one full successful manual-use session;
* **Stas has explicitly accepted the change**.

Until all applicable conditions are satisfied:

> **Keep the recovery point.**

---

# 20. Production-Safety Rule

If the environment cannot be confidently identified as disposable/development/staging, treat it as containing valuable data.

Do not assume:

* "this is probably dev"
* "there probably isn't real data"
* "Docker volume is temporary"
* "we can recreate it"
* "the migration is reversible"
* "Git is enough"

When environment identity is uncertain, the agent must operate under the safer assumption.

---

# 21. Forbidden AI Behaviors

An AI coding agent working on this project must never:

* modify high-risk files before the required checkpoint;
* commit unrelated user changes;
* discard pre-existing user work;
* run destructive Git commands casually;
* delete Docker volumes as a shortcut;
* test a production downgrade merely for convenience;
* assume a filesystem copy is a valid PostgreSQL backup;
* invent database credentials or infrastructure details;
* silently bypass authentication or ownership checks;
* weaken security checks to make tests pass;
* continue improvising after a high-risk failure;
* declare a high-risk task complete solely because tests pass;
* delete recovery points immediately after a successful change;
* perform an explicitly destructive operation without the required human approval.

---

# 22. AI Decision Rule

Before every high-risk operation, the agent should mentally evaluate:

```text
1. What can this change damage?
2. What data or behavior would be difficult to recreate?
3. What recovery point protects it?
4. Has that recovery point actually been verified?
5. Am I about to modify anything before the checkpoint?
6. Could this operation destroy newly-created data?
7. Is the environment definitely disposable, staging, or production?
8. Does this operation require explicit human approval?
9. Can I test the risky part on disposable infrastructure first?
10. What is the smallest reversible step I can perform next?
```

If any answer is uncertain, prefer the safer path.

---

# 23. Golden Rule

> **Never trade recoverability for speed.**

A five-minute backup is cheaper than a day of reconstructing user data.

A clean checkpoint is cheaper than debugging an AI-generated chain of emergency fixes.

A deliberate rollback is cheaper than trying to repair an unknown state while it is still changing.

For AI agents especially:

> **Preserve first. Change second. Verify continuously. Roll back cleanly when necessary. Obtain human approval for irreversible consequences.**

This protocol exists so that the agent can move quickly **without turning a small engineering task into an unrecoverable incident.**
