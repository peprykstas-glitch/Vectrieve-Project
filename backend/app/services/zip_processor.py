import io
import zipfile

# Security limits to prevent Zip Bomb (DoS) attacks
MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024   # 25 MB per file
MAX_TOTAL_BYTES = 100 * 1024 * 1024         # 100 MB total uncompressed
READ_CHUNK_SIZE = 65536                     # 64 KB read chunk


def extract_and_validate_zip(zip_bytes: bytes) -> dict[str, str]:
    """
    Extracts UTF-8 text files from a ZIP archive with strict security limits.

    Raises ValueError if:
    - A file path contains directory traversal sequences.
    - A single extracted file exceeds MAX_SINGLE_FILE_BYTES.
    - The total uncompressed content exceeds MAX_TOTAL_BYTES.
    """
    buffer = io.BytesIO(zip_bytes)
    extracted_files = {}
    total_bytes_read = 0

    with zipfile.ZipFile(buffer) as zip_ref:
        for file_path in zip_ref.namelist():
            # Security Validation: Check for traversal or absolute paths
            if "../" in file_path or ".." in file_path or file_path.startswith("/") or file_path.startswith("\\"):
                raise ValueError(f"Malicious archive detected. Invalid path: {file_path}")

            # Skip directories
            if file_path.endswith("/"):
                continue

            # Read file content in chunks to enforce size limits (Zip Bomb protection)
            with zip_ref.open(file_path) as file_obj:
                file_data = io.BytesIO()
                file_bytes_read = 0

                while True:
                    chunk = file_obj.read(READ_CHUNK_SIZE)
                    if not chunk:
                        break

                    file_bytes_read += len(chunk)
                    total_bytes_read += len(chunk)

                    if file_bytes_read > MAX_SINGLE_FILE_BYTES:
                        raise ValueError(
                            f"Security: File '{file_path}' exceeds the maximum allowed "
                            f"uncompressed size of {MAX_SINGLE_FILE_BYTES // (1024 * 1024)} MB."
                        )

                    if total_bytes_read > MAX_TOTAL_BYTES:
                        raise ValueError(
                            f"Security: Total uncompressed archive size exceeds the limit of "
                            f"{MAX_TOTAL_BYTES // (1024 * 1024)} MB. Possible Zip Bomb detected."
                        )

                    file_data.write(chunk)

                file_bytes = file_data.getvalue()

            try:
                # Attempt to decode as UTF-8 string
                decoded_string = file_bytes.decode("utf-8")
                extracted_files[file_path] = decoded_string
            except UnicodeDecodeError:
                # Silently skip binary, image, or non-UTF-8 files
                continue

    return extracted_files