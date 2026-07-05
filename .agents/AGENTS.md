# AI Agent Guidelines & Safety Instructions

This document contains critical rules and safety guidelines for any AI coding assistant or developer agent analyzing, refactoring, or modifying this codebase. You MUST strictly adhere to these instructions.

---

## 🚨 CRITICAL RULE: Pre-Migration Backup Protocol

Before performing any major, high-risk architectural changes or transitions, you **MUST** create a full system backup and maintain a stable rollback copy.

### 1. Identify High-Risk Updates
High-risk updates include, but are not limited to:
* **Packaging / Desktop wrappers**: Attempting to migrate the web app to a downloadable desktop application format (e.g., Electron, PyInstaller, Tauri, neutralinojs).
* **Database migrations**: Rewriting database models, RLS schemas, or changing DB backends (e.g., SQLite vs PostgreSQL configurations).
* **BFF Proxy Overhauls**: Changing core frontend API routing hooks, tokens, or security middleware.

### 2. Backup Execution
Prior to changing any files for a major update, you must:
1. **Commit current stable work**: Ensure the working directory is clean and commit the stable version using Git.
2. **Tag the stable version**: Create a local Git tag or a dedicated backup branch (e.g., `git branch stable-web-backup-before-electron`) to act as an instant restore point.
3. **Backup local database directories**: Copy `postgres_data/` and `qdrant_data/` to a safe location if you are altering database configurations, to avoid user data loss.

### 3. Keep a 1-to-1 Stable Version Ready
Never delete files or dependencies of a stable working version unless the new system is fully verified, type-safe, and approved by the user. Always keep a working copy of the previous version on standby.
