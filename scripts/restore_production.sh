#!/usr/bin/env bash
# ==============================================================================
# Vectrieve - Disaster Recovery / Database Restore Script
# ==============================================================================
# Usage:
#   ./scripts/restore_production.sh <PATH_TO_POSTGRES_DUMP> [PATH_TO_DATA_TAR]
#
# Examples:
#   ./scripts/restore_production.sh backups/postgres_vectrievedb_20260906_120000.dump
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_postgres_dump> [path_to_backend_data_tar]"
  exit 1
fi

DUMP_PATH="$1"
DATA_TAR="${2:-}"

if [ ! -f "${DUMP_PATH}" ]; then
  echo "[ERROR] Dump file not found: ${DUMP_PATH}"
  exit 1
fi

POSTGRES_CONTAINER="vectrieve-postgres"
DB_USER="vectrieve"
DB_NAME="vectrievedb"
TMP_CONTAINER_DUMP="/tmp/restore_target.dump"

echo "[INFO] Starting Vectrieve disaster restore process..."
echo "[INFO] Source dump: ${DUMP_PATH}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  echo "[ERROR] Container '${POSTGRES_CONTAINER}' is not running. Start the stack first: docker compose -f docker-compose.prod.yml up -d db"
  exit 1
fi

# Copy dump into container
echo "[INFO] Copying dump into database container..."
docker cp "${DUMP_PATH}" "${POSTGRES_CONTAINER}:${TMP_CONTAINER_DUMP}"

# Restore PostgreSQL database using pg_restore
echo "[INFO] Executing pg_restore (clean, if-exists, custom format)..."
set +e
docker exec "${POSTGRES_CONTAINER}" pg_restore \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v "${TMP_CONTAINER_DUMP}"
RESTORE_STATUS=$?
set -e

# Cleanup container temp dump
docker exec "${POSTGRES_CONTAINER}" rm -f "${TMP_CONTAINER_DUMP}"

# Code 0 (clean) or Code 1 (warnings/notices) are standard for pg_restore
if [ ${RESTORE_STATUS} -gt 1 ]; then
  echo "[ERROR] pg_restore failed with critical error code ${RESTORE_STATUS}!"
  exit ${RESTORE_STATUS}
fi

echo "[INFO] Database restored successfully. Verifying tables and records..."

# Verification queries
docker exec "${POSTGRES_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
SELECT 
  (SELECT count(*) FROM users) as users_count,
  (SELECT count(*) FROM user_settings) as settings_count,
  (SELECT count(*) FROM spaces) as spaces_count,
  (SELECT count(*) FROM spacemember) as members_count,
  (SELECT count(*) FROM documents) as documents_count,
  (SELECT count(*) FROM chat_sessions) as chats_count,
  (SELECT count(*) FROM chat_history) as messages_count;
"

# Optional: Restore backend data archive
if [[ -n "${DATA_TAR}" ]] && [[ -f "${DATA_TAR}" ]]; then
  echo "[INFO] Extracting uploaded files from ${DATA_TAR}..."
  PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  tar -xzf "${DATA_TAR}" -C "${PROJECT_DIR}"
  echo "[INFO] Backend data files restored."
fi

echo "[SUCCESS] Vectrieve disaster recovery completed successfully."
