import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import io


# ---------------------------------------------------------------------------
# Tests for zip_processor (Zip Bomb protection)
# ---------------------------------------------------------------------------

from services.zip_processor import extract_and_validate_zip, MAX_SINGLE_FILE_BYTES, MAX_TOTAL_BYTES
import zipfile


def _make_zip(files: dict[str, bytes]) -> bytes:
    """Helper: create an in-memory ZIP archive."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buf.getvalue()


def test_zip_extract_simple_text():
    """Valid UTF-8 text file is extracted correctly."""
    zip_bytes = _make_zip({"hello.txt": b"Hello Vectrieve"})
    result = extract_and_validate_zip(zip_bytes)
    assert "hello.txt" in result
    assert result["hello.txt"] == "Hello Vectrieve"


def test_zip_extract_skips_binary():
    """Binary (non-UTF-8) files are silently skipped."""
    zip_bytes = _make_zip({"image.png": b"\x89PNG\r\n\x1a\n\x00\x00"})
    result = extract_and_validate_zip(zip_bytes)
    assert "image.png" not in result


def test_zip_traversal_attack_rejected():
    """Path traversal attacks raise ValueError."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        # Manually add a dangerous path since ZipFile validates on write
        info = zipfile.ZipInfo("../etc/passwd")
        zf.writestr(info, "root:x:0:0")
    with pytest.raises(ValueError, match="Malicious archive detected"):
        extract_and_validate_zip(buf.getvalue())


def test_zip_bomb_single_file_limit():
    """A file exceeding MAX_SINGLE_FILE_BYTES raises ValueError."""
    # Create content that triggers the per-file limit
    over_limit = b"A" * (MAX_SINGLE_FILE_BYTES + 1)
    zip_bytes = _make_zip({"big.txt": over_limit})
    with pytest.raises(ValueError, match="exceeds the maximum allowed"):
        extract_and_validate_zip(zip_bytes)


# ---------------------------------------------------------------------------
# Tests for code_chunker
# ---------------------------------------------------------------------------

from services.code_chunker import chunk_codebase


def test_chunk_small_file():
    """A file smaller than chunk_size produces a single chunk."""
    files = {"main.py": "x = 1"}
    result = chunk_codebase(files, chunk_size=1000, overlap=100)
    assert len(result) == 1
    assert "main.py" in result[0]["content"]
    assert "x = 1" in result[0]["content"]


def test_chunk_empty_file():
    """An empty file produces a single chunk with just the header."""
    files = {"empty.py": ""}
    result = chunk_codebase(files, chunk_size=1000, overlap=100)
    assert len(result) == 1
    assert result[0]["content"].startswith("### FILE: empty.py ###")


def test_chunk_large_file_splits():
    """A file larger than chunk_size is split into multiple chunks."""
    content = "a" * 2500
    files = {"big.py": content}
    result = chunk_codebase(files, chunk_size=1000, overlap=100)
    assert len(result) > 1


def test_chunk_overlap_invalid():
    """Overlap >= chunk_size raises ValueError."""
    with pytest.raises(ValueError):
        chunk_codebase({"f.py": "x"}, chunk_size=100, overlap=100)


# ---------------------------------------------------------------------------
# Tests for file_filter
# ---------------------------------------------------------------------------

from services.file_filter import filter_repository_files


def test_filter_allows_py_files():
    files = {"main.py": "code", "data.csv": "a,b"}
    result = filter_repository_files(files)
    assert "main.py" in result
    assert "data.csv" not in result


def test_filter_custom_extensions():
    files = {"doc.pdf": "...", "notes.md": "notes"}
    result = filter_repository_files(files, allowed_extensions={".md"})
    assert "notes.md" in result
    assert "doc.pdf" not in result