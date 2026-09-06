"""
Vectrieve - Backup Synchronization Script (Vertex 1 / Vertex 2 -> Vertex 3)
=============================================================================
Author: Vectrieve Core Team
Purpose: Pulls the latest verified database and vector backups from either
         Vertex 1 (Production VM) or Vertex 2 (Cloudflare R2 / AWS S3) to
         Vertex 3 (Local Developer Workstation).

Retention: Preserves the 4 most recent weekly snapshots locally in `backups/`.
Integrity: Validates SHA256 checksums upon download.
=============================================================================
"""

import os
import sys
import argparse
import hashlib
import subprocess
from pathlib import Path
from typing import List, Optional

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
LOCAL_BACKUP_DIR = WORKSPACE_ROOT / "backups"


def calculate_sha256(filepath: Path) -> str:
    """Calculate SHA256 hash of a local file."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


def verify_manifest(manifest_path: Path) -> bool:
    """Verify downloaded files against the manifest_*.sha256 file."""
    if not manifest_path.exists():
        print(f"[WARN] Manifest file {manifest_path.name} not found. Skipping hash verification.")
        return True

    all_passed = True
    print(f"\n[*] Verifying checksums from {manifest_path.name}:")
    with open(manifest_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split(maxsplit=1)
            if len(parts) != 2:
                continue
            expected_hash, filename = parts
            target_file = manifest_path.parent / filename.strip("* ")
            if not target_file.exists():
                print(f"  [FAIL] Missing file: {filename}")
                all_passed = False
                continue

            actual_hash = calculate_sha256(target_file)
            if actual_hash.lower() == expected_hash.lower():
                print(f"  [OK]   {target_file.name} ({target_file.stat().st_size:,} bytes)")
            else:
                print(f"  [FAIL] Hash mismatch for {target_file.name}!")
                print(f"         Expected: {expected_hash}")
                print(f"         Actual:   {actual_hash}")
                all_passed = False

    return all_passed


def rotate_local_backups(keep_count: int = 4):
    """Keep only the latest `keep_count` snapshots locally."""
    dump_files = sorted(LOCAL_BACKUP_DIR.glob("postgres_*.dump"), key=lambda p: p.stat().st_mtime, reverse=True)
    if len(dump_files) > keep_count:
        to_delete = dump_files[keep_count:]
        print(f"\n[*] Pruning {len(to_delete)} old local snapshots (keeping {keep_count} latest)...")
        for old_dump in to_delete:
            # Match related files by timestamp
            ts = "_".join(old_dump.stem.split("_")[-2:])
            related = list(LOCAL_BACKUP_DIR.glob(f"*{ts}*"))
            for rel_file in related:
                print(f"  - Removing old archive: {rel_file.name}")
                rel_file.unlink(missing_ok=True)


def pull_via_scp(host: str, user: str, remote_path: str, key_path: Optional[str] = None) -> bool:
    """Pull backups from production host using scp."""
    print(f"[*] Connecting to Vertex 1 ({user}@{host}:{remote_path})...")
    LOCAL_BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    scp_cmd = ["scp"]
    if key_path:
        scp_cmd.extend(["-i", key_path])

    remote_spec = f"{user}@{host}:{remote_path}/*"
    scp_cmd.extend([remote_spec, str(LOCAL_BACKUP_DIR)])

    print(f"[*] Running: {' '.join(scp_cmd)}")
    try:
        res = subprocess.run(scp_cmd, check=True)
        return res.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] SCP failed with code {e.returncode}")
        return False
    except FileNotFoundError:
        print("[ERROR] `scp` binary not found on local PATH. Ensure OpenSSH client is installed.")
        return False


def pull_via_s3(bucket: str, endpoint_url: Optional[str] = None) -> bool:
    """Pull backups from Vertex 2 (Cloudflare R2 / AWS S3) using AWS CLI or boto3."""
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    # Try boto3 first if keys are available
    if access_key and secret_key:
        try:
            import boto3
            print(f"[*] Syncing from Vertex 2 using boto3 (s3://{bucket}/vectrieve_backups/)...")
            LOCAL_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            s3 = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
            )
            paginator = s3.get_paginator("list_objects_v2")
            pages = paginator.paginate(Bucket=bucket, Prefix="vectrieve_backups/")
            found_any = False
            for page in pages:
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    filename = Path(key).name
                    if not filename:
                        continue
                    target_file = LOCAL_BACKUP_DIR / filename
                    print(f"  [+] Downloading {filename} ({obj['Size']:,} bytes)...")
                    s3.download_file(bucket, key, str(target_file))
                    found_any = True
            if not found_any:
                print("[INFO] No backup objects found under prefix 'vectrieve_backups/'.")
            return True
        except ImportError:
            print("[INFO] boto3 is not installed. Falling back to AWS CLI...")
        except Exception as e:
            print(f"[ERROR] boto3 download failed: {e}")
            return False

    print(f"[*] Syncing from Vertex 2 via AWS CLI (s3://{bucket}/vectrieve_backups/)...")
    LOCAL_BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    aws_cmd = ["aws", "s3", "sync", f"s3://{bucket}/vectrieve_backups/", str(LOCAL_BACKUP_DIR)]
    if endpoint_url:
        aws_cmd.extend(["--endpoint-url", endpoint_url])

    print(f"[*] Running: {' '.join(aws_cmd)}")
    try:
        res = subprocess.run(aws_cmd, check=True)
        return res.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] AWS S3 sync failed with code {e.returncode}")
        return False
    except FileNotFoundError:
        print("[ERROR] Neither `boto3` Python module nor `aws` CLI binary is available.")
        print("        To enable Vertex 2 direct sync, run: pip install boto3")
        return False


def list_local_backups():
    """List existing backups on Vertex 3."""
    dumps = sorted(LOCAL_BACKUP_DIR.glob("postgres_*.dump"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not dumps:
        print(f"[INFO] No database dumps found in {LOCAL_BACKUP_DIR}")
        return

    print(f"\n[+] Local Backups Stored on Workstation (Vertex 3) [{LOCAL_BACKUP_DIR}]:")
    print(f"{'Filename':<45} {'Size (MB)':<12} {'Last Modified':<20}")
    print("-" * 80)
    for dump in dumps:
        size_mb = dump.stat().st_size / (1024 * 1024)
        mtime = dump.stat().st_mtime
        from datetime import datetime
        dt = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"{dump.name:<45} {size_mb:<12.2f} {dt:<20}")


def load_env_backup():
    """Load .env.backup file if present."""
    env_file = WORKSPACE_ROOT / ".env.backup"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip().strip("'\""))


def main():
    load_env_backup()

    parser = argparse.ArgumentParser(
        description="Vectrieve Decentralized Backup Sync (Vertex 1/2 -> Vertex 3)"
    )
    parser.add_argument("--source", choices=["vm", "s3", "r2"], default="vm",
                        help="Backup source to pull from (default: vm)")
    parser.add_argument("--host", default=os.getenv("VECTRIEVE_SSH_HOST", "vectrieve.duckdns.org"),
                        help="Production VM hostname/IP")
    parser.add_argument("--user", default=os.getenv("VECTRIEVE_SSH_USER", "ubuntu"),
                        help="Production VM SSH username")
    parser.add_argument("--key", default=os.getenv("VECTRIEVE_SSH_KEY"),
                        help="Path to private SSH key file")
    parser.add_argument("--remote-dir", default=os.getenv("VECTRIEVE_REMOTE_BACKUP_DIR", "/opt/vectrieve/backups"),
                        help="Remote backup directory path")
    parser.add_argument("--bucket", default=os.getenv("R2_BUCKET_NAME", os.getenv("S3_BUCKET_NAME", "vectrieve-backups")),
                        help="S3 / R2 Bucket name (default: vectrieve-backups)")
    parser.add_argument("--endpoint", default=os.getenv("AWS_ENDPOINT_URL", "https://8eea3ed35f484bc1fdc47cb9a2240bdb.eu.r2.cloudflarestorage.com"),
                        help="Custom S3 endpoint URL (default: Cloudflare R2 endpoint)")
    parser.add_argument("--keep", type=int, default=4,
                        help="Number of weekly snapshots to retain locally (default: 4)")
    parser.add_argument("--list", action="store_true",
                        help="List currently available local backups without downloading")

    args = parser.parse_args()

    if args.list:
        list_local_backups()
        return

    success = False
    if args.source == "vm":
        success = pull_via_scp(args.host, args.user, args.remote_dir, args.key)
    elif args.source in ["s3", "r2"]:
        success = pull_via_s3(args.bucket, args.endpoint)

    if success:
        print("\n[SUCCESS] Backup sync completed.")
        # Find latest manifest
        manifests = sorted(LOCAL_BACKUP_DIR.glob("manifest_*.sha256"), key=lambda p: p.stat().st_mtime, reverse=True)
        if manifests:
            verify_manifest(manifests[0])
        rotate_local_backups(keep_count=args.keep)
        list_local_backups()
    else:
        print("\n[FAILED] Backup synchronization encountered errors.")
        list_local_backups()
        sys.exit(1)


if __name__ == "__main__":
    main()
