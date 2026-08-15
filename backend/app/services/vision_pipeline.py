"""
vision_pipeline.py — Vision/OCR ingestion helpers for Vectrieve AI.

Provides:
  - VisionPayload / ScannedPDFPayload / PPTXPayload — sentinel dataclasses returned by
    _parse_file_sync when a file requires async vision-LLM processing.
    The sync parser cannot await llm_service.describe_image(), so it returns
    a sentinel; process_pdf_background handles the actual vision call.
  - _resize_image_bytes — resizes an image to cap its longest side at
    MAX_IMAGE_SIDE pixels before base64 encoding. Prevents multi-MB payloads
    to Groq/Ollama APIs on high-resolution uploads (phone photos, HQ scans).
  - _render_page_to_jpeg — CPU-bound: renders one PDF page to JPEG bytes
    using pypdfium2. Designed for asyncio.to_thread() to avoid blocking the
    event loop. Applies the same resize cap as _resize_image_bytes.
  - describe_image_bytes — best-effort wrapper: returns "" on any failure
    instead of raising, so a single bad image never kills the whole document.
  - process_scanned_pdf — renders each page of a scanned PDF with pypdfium2
    (pure-Python, no Poppler required) and calls describe_image_bytes per page,
    capped at MAX_OCR_PAGES to prevent indefinite background-task hangs.
    Returns (chunks, truncation_warning) — warning is non-None when the file
    was truncated, so the caller can write it to doc.error_log / UI.
"""

from __future__ import annotations

import asyncio
import io
import pypdfium2 as pdfium
from dataclasses import dataclass
from typing import TYPE_CHECKING, List, Optional, Tuple

if TYPE_CHECKING:
    from services.llm_service import LLMService

# ---------------------------------------------------------------------------
# Hard limit — prevents a 200-page scanned PDF from running the background
# task for hours. Pages beyond this limit are dropped with an explicit warning
# written to doc.error_log so the user knows the document was truncated.
# ---------------------------------------------------------------------------
MAX_OCR_PAGES = 30

# ---------------------------------------------------------------------------
# Image resize cap — longest side in pixels before base64 encoding.
# A 12 MP photo (4000×3000) at 150 DPI scan produces ~3.5 MB raw; after
# thumbnail(1920) it becomes ~0.2 MB JPEG — still more than sufficient
# for vision-model OCR quality, and within API payload limits.
# ---------------------------------------------------------------------------
MAX_IMAGE_SIDE = 1920


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


@dataclass
class PPTXSlidePayload:
    """
    Carries slide text and extracted raw image blobs from a single PPTX slide
    to be described via vision LLM in the background task.
    """
    slide_index: int
    slide_text: str
    images: List[bytes]


@dataclass
class PPTXPayload:
    """
    Returned by _parse_file_sync when a PPTX presentation contains images
    and must be processed in the async vision pipeline.
    """
    filename: str
    slides: List[PPTXSlidePayload]


# ---------------------------------------------------------------------------
# Sync helpers — designed for asyncio.to_thread()
# ---------------------------------------------------------------------------

def _resize_image_bytes(image_bytes: bytes, max_side: int = MAX_IMAGE_SIDE) -> bytes:
    """
    Resize image bytes so the longest side is at most max_side pixels, then
    re-encode as JPEG quality=85.

    This is a sync, CPU-bound function — call it via asyncio.to_thread() in
    an async context.

    Rationale: A 4000×3000 phone photo encodes to ~4 MB base64 payload.
    Groq has a ~4 MB per-request limit; Ollama is slower with larger inputs.
    thumbnail(1920) keeps OCR quality high while staying well within limits.
    """
    from PIL import Image as PILImage
    img = PILImage.open(io.BytesIO(image_bytes))
    # thumbnail() preserves aspect ratio and never upscales
    img.thumbnail((max_side, max_side), PILImage.LANCZOS)
    buf = io.BytesIO()
    # Convert RGBA/P modes (PNG with transparency) to RGB for JPEG compatibility
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _render_page_to_jpeg(doc: pdfium.PdfDocument, page_index: int, max_side: int = MAX_IMAGE_SIDE) -> bytes:
    """
    Render one PDF page to a JPEG bytes object using pypdfium2.

    CPU-bound: calls pdfium's C-level renderer synchronously.
    Must be called via asyncio.to_thread() to avoid blocking the event loop.

    Renders at 150 DPI (scale = 150/72 ≈ 2.08×), then resizes to cap the
    longest side at max_side pixels — same quality/size tradeoff as
    _resize_image_bytes.
    """
    from PIL import Image as PILImage
    page = doc[page_index]
    bitmap = page.render(scale=150 / 72)
    pil_image = bitmap.to_pil()
    pil_image.thumbnail((max_side, max_side), PILImage.LANCZOS)
    if pil_image.mode not in ("RGB", "L"):
        pil_image = pil_image.convert("RGB")
    buf = io.BytesIO()
    pil_image.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Async helpers
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
) -> Tuple[List[str], Optional[str]]:
    """
    Render each page of a scanned PDF to JPEG with pypdfium2 and describe it
    via vision LLM.

    pypdfium2 is a pure-Python binding to PDFium — no Poppler system package
    required, works on Windows/Linux/macOS without extra setup.

    IMPORTANT — event loop safety:
    Page rendering (pdfium C-level) is CPU-bound. Each page is rendered in a
    worker thread via asyncio.to_thread(_render_page_to_jpeg) so the event
    loop is never blocked during rasterization. The subsequent LLM call is
    network I/O and is awaited normally in the async context.

    Returns (chunks, truncation_warning):
      - chunks: List of text chunks, one per successfully described page.
      - truncation_warning: non-None string if the file exceeded MAX_OCR_PAGES;
        the caller should write this to doc.error_log so the user is informed.

    Individual page failures are skipped (best-effort); the document still
    gets indexed with whatever pages succeeded.
    """
    # Open the document and measure its length in a worker thread —
    # pdfium.PdfDocument() parses the PDF cross-reference table (CPU-bound C code).
    # len(doc) is a cheap attribute read but is included here to keep all
    # pdfium calls off the event loop, consistent with the to_thread contract.
    def _open_doc() -> tuple:
        d = pdfium.PdfDocument(file_bytes)
        return d, len(d)

    doc, total_pages = await asyncio.to_thread(_open_doc)
    truncation_warning: Optional[str] = None

    if total_pages > MAX_OCR_PAGES:
        truncation_warning = (
            f"⚠️ Document truncated: processed {MAX_OCR_PAGES} of {total_pages} pages "
            f"due to size limits (MAX_OCR_PAGES={MAX_OCR_PAGES}). "
            f"The remaining {total_pages - MAX_OCR_PAGES} pages were not indexed."
        )
        print(f"⚠️ '{filename}': {truncation_warning}")
        page_indices = range(MAX_OCR_PAGES)
    else:
        page_indices = range(total_pages)

    chunks: List[str] = []
    try:
        for i in page_indices:
            # Offload CPU-bound render+resize to a worker thread.
            # This keeps the event loop free for other requests during rasterization.
            image_bytes_page = await asyncio.to_thread(_render_page_to_jpeg, doc, i)

            description = await describe_image_bytes(image_bytes_page, llm_service, mode, model_name)
            if description:
                chunks.append(
                    f"=== Source File: {filename} (Page {i + 1}) ===\n"
                    f"Visual Content Description:\n{description}"
                )
    finally:
        # Always release the native pdfium C-level object.
        # Without try/finally, an exception on a damaged page mid-loop would
        # bypass this call and leak the pdfium document handle indefinitely.
        doc.close()

    return chunks, truncation_warning
