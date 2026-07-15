"""
vision_pipeline.py — Vision/OCR ingestion helpers for Vectrieve AI.

Provides:
  - VisionPayload / ScannedPDFPayload — sentinel dataclasses returned by
    _parse_file_sync when a file requires async vision-LLM processing.
    The sync parser cannot await llm_service.describe_image(), so it returns
    a sentinel; process_pdf_background handles the actual vision call.
  - describe_image_bytes — best-effort wrapper: returns "" on any failure
    instead of raising, so a single bad image never kills the whole document.
  - process_scanned_pdf — renders each page of a scanned PDF with pypdfium2
    (pure-Python, no Poppler required) and calls describe_image_bytes per page,
    capped at MAX_OCR_PAGES to prevent indefinite background-task hangs.
"""

from __future__ import annotations

import io
import pypdfium2 as pdfium
from dataclasses import dataclass
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
    from services.llm_service import LLMService

# ---------------------------------------------------------------------------
# Hard limit — prevents a 200-page scanned PDF from running the background
# task for hours. Pages beyond this limit are silently dropped with a warning.
# ---------------------------------------------------------------------------
MAX_OCR_PAGES = 30


# ---------------------------------------------------------------------------
# Sentinel dataclasses
# ---------------------------------------------------------------------------

@dataclass
class VisionPayload:
    """
    Returned by _parse_file_sync for standalone image files (.png/.jpg/.jpeg/.webp).
    Carries raw bytes to be passed to describe_image_bytes in the async context.
    """
    file_bytes: bytes
    filename: str


@dataclass
class ScannedPDFPayload:
    """
    Returned by _parse_file_sync when a PDF yields no extractable text
    (i.e. it is a scanned / image-only document).
    Carries raw bytes for page-by-page vision rendering in process_pdf_background.
    """
    file_bytes: bytes
    filename: str


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

async def describe_image_bytes(
    image_bytes: bytes,
    llm_service: "LLMService",
    mode: str,
    model_name: Optional[str],
) -> str:
    """
    Best-effort vision description.
    Returns the textual description on success, or "" on any failure.

    The caller (process_pdf_background) decides what to do with an empty string:
    - For standalone images: raise ValueError (no content at all → FAILED)
    - For individual pages of a scanned PDF: skip silently (other pages may succeed)
    """
    try:
        return await llm_service.describe_image(
            image_bytes, mode=mode, model_name=model_name
        )
    except Exception as e:
        print(f"⚠️ Vision inference failed (best-effort): {e}")
        return ""


async def process_scanned_pdf(
    file_bytes: bytes,
    filename: str,
    llm_service: "LLMService",
    mode: str,
    model_name: Optional[str],
) -> List[str]:
    """
    Render each page of a scanned PDF to JPEG with pypdfium2 and describe it
    via vision LLM.

    pypdfium2 is a pure-Python binding to PDFium — no Poppler system package
    required, works on Windows/Linux/macOS without extra setup.

    Pages beyond MAX_OCR_PAGES are truncated with a log warning.
    Individual page failures are skipped (best-effort); the document still
    gets indexed with whatever pages succeeded.
    """

    doc = pdfium.PdfDocument(file_bytes)
    total_pages = len(doc)

    if total_pages > MAX_OCR_PAGES:
        print(
            f"⚠️ '{filename}': {total_pages} pages exceeds MAX_OCR_PAGES={MAX_OCR_PAGES}. "
            f"Only the first {MAX_OCR_PAGES} pages will be processed."
        )
        page_indices = range(MAX_OCR_PAGES)
    else:
        page_indices = range(total_pages)

    chunks: List[str] = []
    for i in page_indices:
        page = doc[i]
        # Render at 150 DPI — good balance between OCR quality and memory usage
        bitmap = page.render(scale=150 / 72)
        pil_image = bitmap.to_pil()

        buf = io.BytesIO()
        pil_image.save(buf, format="JPEG", quality=85)
        image_bytes = buf.getvalue()

        description = await describe_image_bytes(image_bytes, llm_service, mode, model_name)
        if description:
            chunks.append(
                f"=== Source File: {filename} (Page {i + 1}) ===\n"
                f"Visual Content Description:\n{description}"
            )

    doc.close()
    return chunks
