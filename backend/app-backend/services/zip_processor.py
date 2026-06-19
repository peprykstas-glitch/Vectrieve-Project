import io
import zipfile

def extract_and_validate_zip(zip_bytes: bytes) -> dict[str, str]:
    buffer = io.BytesIO(zip_bytes)
    extracted_files = {}

    with zipfile.ZipFile(buffer) as zip_ref:
        for file_path in zip_ref.namelist():
            # Security Validation: Check for traversal or absolute paths
            if "../" in file_path or ".." in file_path or file_path.startswith("/") or file_path.startswith("\\"):
                raise ValueError(f"Malicious archive detected. Invalid path: {file_path}")

            # Skip directories
            if file_path.endswith("/"):
                continue

            # Read and process valid files
            with zip_ref.open(file_path) as file_obj:
                file_bytes = file_obj.read()
                
                try:
                    # Attempt to decode as UTF-8 string
                    decoded_string = file_bytes.decode("utf-8")
                    extracted_files[file_path] = decoded_string
                except UnicodeDecodeError:
                    # Silently skip binary, image, or non-UTF-8 files
                    continue

    return extracted_files