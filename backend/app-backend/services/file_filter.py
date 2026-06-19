import pathlib
from typing import Optional

def filter_repository_files(
    extracted_files: dict[str, str], 
    allowed_extensions: Optional[set[str]] = None
) -> dict[str, str]:
    """
    Filters a dictionary of file paths and contents based on allowed extensions.
    """
    if allowed_extensions is None:
        allowed_extensions = {".py", ".js", ".ts", ".md", ".txt"}
    else:
        allowed_extensions = {ext.lower() for ext in allowed_extensions}

    filtered_files: dict[str, str] = {}

    for file_path, content in extracted_files.items():
        suffix = pathlib.Path(file_path).suffix.lower()
        if suffix in allowed_extensions:
            filtered_files[file_path] = content

    return filtered_files