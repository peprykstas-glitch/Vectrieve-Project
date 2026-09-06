#!/usr/bin/env bash
# ==============================================================================
# Vectrieve - Production Backup Script (Vertex 1 -> Vertex 2)
# ==============================================================================
# Automates:
#  1. PostgreSQL custom binary logical dump (pg_dump -F c)
#  2. Qdrant vector database snapshots (REST API)
#  3. Uploaded documents and manuals archive (backend_data)
#  4. SHA256 checksum manifest generation
#  5. Local 7-day retention rotation
#  6. Off-site push to Cloudflare R2 / AWS S3 (Vertex 2)
# ==============================================================================

set -euo pipefail

# Configuration & Paths
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
POSTGRES_CONTAINER="vectrieve-postgres"
QDRANT_CONTAINER="vectrieve-qdrant"
DB_USER="vectrieve"
DB_NAME="vectrievedb"

# Create local backup directory
mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Starting Vectrieve production backup..."

# 1. PostgreSQL Custom-Format Logical Dump
echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Dumping PostgreSQL database (${DB_NAME})..."
PG_DUMP_NAME="postgres_${DB_NAME}_${TIMESTAMP}.dump"
PG_TMP_PATH="/tmp/${PG_DUMP_NAME}"

docker exec "${POSTGRES_CONTAINER}" pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F c -b -v \
  -f "${PG_TMP_PATH}"

docker cp "${POSTGRES_CONTAINER}:${PG_TMP_PATH}" "${BACKUP_DIR}/${PG_DUMP_NAME}"
docker exec "${POSTGRES_CONTAINER}" rm -f "${PG_TMP_PATH}"

# Verify DB dump size
DB_DUMP_SIZE=$(wc -c < "${BACKUP_DIR}/${PG_DUMP_NAME}")
if [ "${DB_DUMP_SIZE}" -le 1024 ]; then
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [ERROR] PostgreSQL dump is unexpectedly small (${DB_DUMP_SIZE} bytes). Aborting."
  exit 1
fi
echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] PostgreSQL dump created: ${PG_DUMP_NAME} (${DB_DUMP_SIZE} bytes)"

# 2. Qdrant Collection Snapshots
echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Requesting Qdrant collection snapshots..."
QDRANT_SNAPSHOT_ARCHIVE="qdrant_snapshots_${TIMESTAMP}.tar.gz"
QDRANT_TEMP_DIR="${BACKUP_DIR}/qdrant_tmp_${TIMESTAMP}"
mkdir -p "${QDRANT_TEMP_DIR}"

COLLECTIONS_JSON=$(curl -s "http://127.0.0.1:6333/collections" || echo "")
if [[ -n "${COLLECTIONS_JSON}" ]] && [[ "${COLLECTIONS_JSON}" == *"\"result\""* ]]; then
  # Parse collection names (supports jq or simple grep)
  if command -v jq >/dev/null 2>&1; then
    COLLECTION_NAMES=$(echo "${COLLECTIONS_JSON}" | jq -r '.result.collections[].name')
  else
    COLLECTION_NAMES=$(echo "${COLLECTIONS_JSON}" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  fi

  for COL in ${COLLECTION_NAMES}; do
    echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Creating snapshot for Qdrant collection: ${COL}"
    SNAP_RES=$(curl -s -X POST "http://127.0.0.1:6333/collections/${COL}/snapshots")
    SNAP_NAME=$(echo "${SNAP_RES}" | grep -o '"name":"[^"]*"' | head -n1 | cut -d'"' -f4 || echo "")
    if [[ -n "${SNAP_NAME}" ]]; then
      curl -s -o "${QDRANT_TEMP_DIR}/${COL}_${SNAP_NAME}" "http://127.0.0.1:6333/collections/${COL}/snapshots/${SNAP_NAME}"
    fi
  done

  tar -czf "${BACKUP_DIR}/${QDRANT_SNAPSHOT_ARCHIVE}" -C "${QDRANT_TEMP_DIR}" .
  rm -rf "${QDRANT_TEMP_DIR}"
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Qdrant snapshots bundled: ${QDRANT_SNAPSHOT_ARCHIVE}"
else
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [WARN] Qdrant API not reachable or empty. Skipping live snapshot API."
  rm -rf "${QDRANT_TEMP_DIR}"
fi

# 3. Compress Uploaded Files and Manuals (backend_data)
echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Archiving backend uploaded documents..."
DATA_ARCHIVE="backend_data_${TIMESTAMP}.tar.gz"
if [ -d "${PROJECT_DIR}/backend_data" ]; then
  tar -czf "${BACKUP_DIR}/${DATA_ARCHIVE}" -C "${PROJECT_DIR}" backend_data
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Uploaded data archived: ${DATA_ARCHIVE}"
fi

# 4. Generate SHA256 Checksums
MANIFEST_FILE="${BACKUP_DIR}/manifest_${TIMESTAMP}.sha256"
echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Generating SHA256 checksum manifest..."
(cd "${BACKUP_DIR}" && sha256sum *"${TIMESTAMP}"* > "${MANIFEST_FILE}")
echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Manifest generated: ${MANIFEST_FILE}"

# 5. Local Retention Pruning (Keep last 7 days)
echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Pruning local backups older than 7 days..."
find "${BACKUP_DIR}" -type f \( -name "*.dump" -o -name "*.tar.gz" -o -name "*.sha256" \) -mtime +7 -delete

# Source optional backup environment file
if [ -f "${PROJECT_DIR}/.env.backup" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_DIR}/.env.backup"
  set +a
fi

# 6. Vertex 2: Push to Off-Site Cloud Storage (Cloudflare R2 / AWS S3)
BUCKET_TARGET="${R2_BUCKET_NAME:-${S3_BUCKET_NAME:-vectrieve-backups}}"
ENDPOINT_TARGET="${AWS_ENDPOINT_URL:-https://8eea3ed35f484bc1fdc47cb9a2240bdb.eu.r2.cloudflarestorage.com}"

if [[ -n "${BUCKET_TARGET}" ]] && [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && command -v aws >/dev/null 2>&1; then
  ENDPOINT_FLAG="--endpoint-url ${ENDPOINT_TARGET}"

  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Replicating backup to off-site storage (s3://${BUCKET_TARGET}/)..."
  aws s3 sync "${BACKUP_DIR}/" "s3://${BUCKET_TARGET}/vectrieve_backups/" \
    ${ENDPOINT_FLAG} \
    --exclude "*" \
    --include "*${TIMESTAMP}*"

  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Off-site sync complete."
elif [[ -n "${BUCKET_TARGET}" ]] && [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && python3 -c "import boto3" >/dev/null 2>&1; then
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Replicating backup via Python boto3 to ${BUCKET_TARGET}..."
  BACKUP_DIR="${BACKUP_DIR}" TIMESTAMP="${TIMESTAMP}" python3 - << 'PYEOF'
import os, boto3
from pathlib import Path

endpoint = os.environ.get("AWS_ENDPOINT_URL", "https://8eea3ed35f484bc1fdc47cb9a2240bdb.eu.r2.cloudflarestorage.com")
bucket = os.environ.get("R2_BUCKET_NAME", "vectrieve-backups")
access_key = os.environ.get("AWS_ACCESS_KEY_ID")
secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
backup_dir = Path(os.environ.get("BACKUP_DIR", "backups"))
ts = os.environ.get("TIMESTAMP", "")

s3 = boto3.client("s3", endpoint_url=endpoint, aws_access_key_id=access_key, aws_secret_access_key=secret_key, region_name="auto")
for f in backup_dir.glob(f"*{ts}*"):
    key = f"vectrieve_backups/{f.name}"
    print(f"  Uploading {f.name} -> s3://{bucket}/{key}...")
    s3.upload_file(str(f), bucket, key)
print("[INFO] Python boto3 replication complete.")
PYEOF
elif [[ -n "${RCLONE_REMOTE:-}" ]] && command -v rclone >/dev/null 2>&1; then
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] Replicating via rclone to ${RCLONE_REMOTE}..."
  rclone copy "${BACKUP_DIR}/" "${RCLONE_REMOTE}:vectrieve_backups/" --include "*${TIMESTAMP}*"
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [INFO] rclone replication complete."
else
  echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [NOTICE] Off-site storage credentials or tools not found. Backup stored locally on Vertex 1."
fi

echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] [SUCCESS] Backup finished successfully."
