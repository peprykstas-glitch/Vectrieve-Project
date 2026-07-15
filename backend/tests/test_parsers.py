import io
import zipfile
from pathlib import Path
import pytest
from services.pdf_parser import extract_text_from_docx, extract_text_from_epub, _sample_chunks


def test_extract_text_from_docx():
    docx_bytes = io.BytesIO()
    with zipfile.ZipFile(docx_bytes, 'w') as z:
        z.writestr('word/document.xml', """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:r>
                <w:t>Hello world from docx paragraph 1.</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>Second paragraph content.</w:t>
            </w:r>
        </w:p>
    </w:body>
</w:document>""")

    text = extract_text_from_docx(docx_bytes.getvalue())
    assert "Hello world from docx paragraph 1." in text
    assert "Second paragraph content." in text


def test_extract_text_from_epub():
    epub_bytes = io.BytesIO()
    with zipfile.ZipFile(epub_bytes, 'w') as z:
        z.writestr('META-INF/container.xml', """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>""")
        z.writestr('OEBPS/content.opf', """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test EPUB</dc:title>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>""")
        z.writestr('OEBPS/chapter1.xhtml', """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chapter 1</title></head>
  <body>
    <h1>Chapter 1 Header</h1>
    <p>This is the first chapter text in the EPUB.</p>
  </body>
</html>""")

    text = extract_text_from_epub(epub_bytes.getvalue())
    assert "Chapter 1 Header" in text
    assert "This is the first chapter text in the EPUB." in text


# --- Bug 5 fix: _sample_chunks tests ---

def test_sample_chunks_small():
    """When chunks <= n, return all chunks unchanged."""
    chunks = ["a", "b", "c"]
    result = _sample_chunks(chunks, n=8)
    assert result == chunks


def test_sample_chunks_distributed():
    """For large doc: samples are spread across the full document, not just the start."""
    chunks = [f"chunk_{i}" for i in range(100)]
    result = _sample_chunks(chunks, n=8)
    assert len(result) == 8
    # First and last chunks must be included (boundary coverage)
    assert result[0] == "chunk_0"
    assert result[-1] == "chunk_99"
    # Samples must NOT just be the first 8 — that was the original bug
    assert result != chunks[:8]


def test_sample_chunks_exact_n():
    """When chunks == n, all chunks returned."""
    chunks = [f"c_{i}" for i in range(8)]
    result = _sample_chunks(chunks, n=8)
    assert result == chunks


# --- Bug 4 fix: _parse_file_sync reads from Path, not bytes ---

def test_parse_file_sync_text(tmp_path):
    """_parse_file_sync correctly reads plain text files from disk."""
    from services.pdf_parser import _parse_file_sync
    p = tmp_path / "test.txt"
    p.write_text("Hello from a text file.", encoding="utf-8")
    result = _parse_file_sync(p, "test.txt")
    assert "Hello from a text file." in result


def test_parse_file_sync_docx(tmp_path):
    """_parse_file_sync correctly parses a DOCX via Path."""
    from services.pdf_parser import _parse_file_sync
    docx_bytes = io.BytesIO()
    with zipfile.ZipFile(docx_bytes, 'w') as z:
        z.writestr('word/document.xml', """<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Docx via path test.</w:t></w:r></w:p>
  </w:body>
</w:document>""")
    p = tmp_path / "test.docx"
    p.write_bytes(docx_bytes.getvalue())
    result = _parse_file_sync(p, "test.docx")
    assert "Docx via path test." in result


def test_parse_file_sync_markdown(tmp_path):
    """_parse_file_sync correctly reads markdown files as plain text."""
    from services.pdf_parser import _parse_file_sync
    p = tmp_path / "test.md"
    p.write_text("# Markdown Title\n- Item 1\n- Item 2", encoding="utf-8")
    result = _parse_file_sync(p, "test.md")
    assert "# Markdown Title" in result
    assert "- Item 1" in result


def test_parse_file_sync_html(tmp_path):
    """_parse_file_sync correctly parses HTML files, stripping tags, head, style, and scripts."""
    from services.pdf_parser import _parse_file_sync
    # Include void elements <meta> and <link> to verify they do not cause infinite text suppression
    html_content = """
    <html>
      <head>
        <title>Ignored Title</title>
        <style>body { color: red; }</style>
        <script>console.log('ignored');</script>
      </head>
      <body>
        <meta charset="utf-8">
        <h1>Heading Content</h1>
        <link rel="stylesheet" href="style.css">
        <p>Paragraph text here.</p>
      </body>
    </html>
    """
    p = tmp_path / "test.html"
    p.write_text(html_content, encoding="utf-8")
    result = _parse_file_sync(p, "test.html")
    # Verify that clean prose text is extracted
    assert "Heading Content" in result
    assert "Paragraph text here." in result
    # Verify that headers, styles, and scripts are stripped
    assert "Ignored Title" not in result
    assert "body { color: red; }" not in result
    assert "console.log" not in result


def test_parse_file_sync_html_windows1251(tmp_path):
    """_parse_file_sync correctly decodes and parses HTML in windows-1251 encoding."""
    from services.pdf_parser import _parse_file_sync
    # Cyrillic text in windows-1251
    html_content = "<html><body><h1>Привіт Світ</h1></body></html>"
    p = tmp_path / "test_1251.html"
    p.write_bytes(html_content.encode("windows-1251"))
    result = _parse_file_sync(p, "test_1251.html")
    assert "Привіт Світ" in result


def test_parse_file_sync_csv(tmp_path):
    """_parse_file_sync correctly parses CSV into row-grouped chunks with headers."""
    from services.pdf_parser import _parse_file_sync
    csv_content = "Name,Role,Salary\nJohn,Sales,100\nJane,Support,150\nBob,Dev,200"
    p = tmp_path / "test.csv"
    p.write_text(csv_content, encoding="utf-8")
    
    chunks = _parse_file_sync(p, "test.csv")
    assert isinstance(chunks, list)
    assert len(chunks) == 1
    assert "=== Source File: test.csv ===" in chunks[0]
    assert "Columns: Name | Role | Salary" in chunks[0]
    assert "Row 1: John | Sales | 100" in chunks[0]
    assert "Row 2: Jane | Support | 150" in chunks[0]
    assert "Row 3: Bob | Dev | 200" in chunks[0]


def test_parse_file_sync_excel(tmp_path):
    """_parse_file_sync correctly parses Excel worksheets into row-grouped chunks with headers."""
    from services.pdf_parser import _parse_file_sync
    import pandas as pd
    
    df = pd.DataFrame({
        "Name": ["John", "Jane"],
        "Role": ["Sales", "Support"]
    })
    
    p = tmp_path / "test.xlsx"
    df.to_excel(p, index=False, engine="openpyxl")
    
    chunks = _parse_file_sync(p, "test.xlsx")
    assert isinstance(chunks, list)
    assert len(chunks) == 1
    assert "=== Source File: test.xlsx (Sheet: Sheet1) ===" in chunks[0]
    assert "Columns: Name | Role" in chunks[0]
    assert "Row 1: John | Sales" in chunks[0]
    assert "Row 2: Jane | Support" in chunks[0]


def test_parse_file_sync_json_list(tmp_path):
    """_parse_file_sync correctly parses flat list-of-dicts JSON into row-grouped chunks."""
    from services.pdf_parser import _parse_file_sync
    import json
    
    data = [
        {"Name": "John", "Role": "Sales"},
        {"Name": "Jane", "Role": "Support"}
    ]
    p = tmp_path / "test.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    
    chunks = _parse_file_sync(p, "test.json")
    assert isinstance(chunks, list)
    assert len(chunks) == 1
    assert "Format: JSON Record Group" in chunks[0]
    assert "Columns: Name | Role" in chunks[0]
    assert "Record 1: John | Sales" in chunks[0]


def test_parse_file_sync_json_nested(tmp_path):
    """_parse_file_sync correctly chunks nested config JSON by top-level keys."""
    from services.pdf_parser import _parse_file_sync
    import json
    
    data = {
        "settings": {"theme": "dark", "version": 1},
        "users": ["user1", "user2"]
    }
    p = tmp_path / "test_nested.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    
    chunks = _parse_file_sync(p, "test_nested.json")
    assert isinstance(chunks, list)
    assert len(chunks) == 2
    
    keys = [c for c in chunks if "Key: settings" in c or "Key: users" in c]
    assert len(keys) == 2


def test_group_rows_with_char_budget():
    """_group_rows_with_char_budget splits records dynamically using a character limit."""
    from services.pdf_parser import _group_rows_with_char_budget
    rows = ["Row 1: " + "A" * 1000, "Row 2: " + "B" * 1000, "Row 3: " + "C" * 1000]
    header = "Header\n---\n"
    
    result = _group_rows_with_char_budget(rows, header, rows_per_group=10, max_chars=2100)
    assert len(result) == 2
    assert result[0] == "Header\n---\nRow 1: " + "A" * 1000 + "\nRow 2: " + "B" * 1000


def test_parse_csv_multiline_field(tmp_path):
    """Regression test: quoted CSV fields containing embedded newlines must be
    kept as a single cell value, not split across multiple rows.
    The old csv.reader(html_str.splitlines()) would have broken this case."""
    from services.pdf_parser import _parse_file_sync
    # Notes column contains a newline inside a quoted field
    csv_content = (
        'Name,Role,Notes\r\n'
        'John Smith,Sales,"Great guest.\nLeft a 5-star review."\r\n'
        'Jane Doe,Marketing,OK\r\n'
    )
    p = tmp_path / "multiline.csv"
    p.write_text(csv_content, encoding="utf-8")

    chunks = _parse_file_sync(p, "multiline.csv")
    assert isinstance(chunks, list)
    # Must be exactly 2 data rows (John and Jane), not 3+ due to the embedded newline
    combined = "\n".join(chunks)
    assert "Row 1: John Smith | Sales | Great guest." in combined
    assert "Row 2: Jane Doe | Marketing | OK" in combined
    # The embedded newline continuation must NOT appear as a separate row
    assert "Row 3:" not in combined


# --- Phase 3c-core: Vision pipeline tests ---

def test_image_sentinel_roundtrip(tmp_path):
    """_parse_file_sync returns a VisionPayload sentinel for image files,
    NOT a string or list — confirming vision processing is deferred to async context."""
    from services.pdf_parser import _parse_file_sync
    from services.vision_pipeline import VisionPayload

    # Minimal 1x1 white JPEG (valid image bytes)
    import struct, zlib
    # Use a tiny valid JPEG (smallest possible)
    tiny_jpeg = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
        b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e>'
        b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00'
        b'\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00'
        b'\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b'
        b'\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04'
        b'\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa'
        b'\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n'
        b'\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xf5\x00\xff\xd9'
    )
    p = tmp_path / "test_image.jpg"
    p.write_bytes(tiny_jpeg)

    result = _parse_file_sync(p, "test_image.jpg")
    assert isinstance(result, VisionPayload), (
        f"Expected VisionPayload sentinel, got {type(result).__name__}"
    )
    assert result.filename == "test_image.jpg"
    assert result.file_bytes == tiny_jpeg


def test_png_sentinel_roundtrip(tmp_path):
    """_parse_file_sync returns VisionPayload for .png files too."""
    from services.pdf_parser import _parse_file_sync
    from services.vision_pipeline import VisionPayload

    # Minimal 1x1 red PNG
    import zlib, struct
    def create_png():
        def chunk(name, data):
            c = name + data
            return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        sig = b'\x89PNG\r\n\x1a\n'
        ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
        raw = b'\x00\xff\x00\x00'  # filter byte + RGB
        idat = chunk(b'IDAT', zlib.compress(raw))
        iend = chunk(b'IEND', b'')
        return sig + ihdr + idat + iend

    p = tmp_path / "test_image.png"
    p.write_bytes(create_png())

    result = _parse_file_sync(p, "test_image.png")
    assert isinstance(result, VisionPayload)


def test_describe_image_bytes_best_effort_on_failure():
    """describe_image_bytes returns '' instead of raising when vision LLM fails.
    This ensures a single bad image never crashes the whole document ingestion."""
    import asyncio
    from unittest.mock import AsyncMock, MagicMock
    from services.vision_pipeline import describe_image_bytes

    mock_llm = MagicMock()
    mock_llm.describe_image = AsyncMock(side_effect=RuntimeError("No vision model available"))

    result = asyncio.run(
        describe_image_bytes(b"fake_image_bytes", mock_llm, mode="local", model_name=None)
    )
    assert result == "", f"Expected empty string on failure, got: {repr(result)}"


def test_process_scanned_pdf_page_limit(tmp_path):
    """process_scanned_pdf truncates to MAX_OCR_PAGES when PDF has more pages."""
    import asyncio
    from unittest.mock import AsyncMock, MagicMock, patch
    from services.vision_pipeline import process_scanned_pdf, MAX_OCR_PAGES

    mock_llm = MagicMock()
    mock_llm.describe_image = AsyncMock(return_value="Page description text.")

    # Create a mock pypdfium2 document with 35 pages (> MAX_OCR_PAGES=30)
    mock_page = MagicMock()
    mock_bitmap = MagicMock()
    mock_pil = MagicMock()

    def fake_save(buf, format, quality):
        buf.write(b"fake_jpeg")
    mock_pil.save = fake_save

    mock_bitmap.to_pil.return_value = mock_pil
    mock_page.render.return_value = mock_bitmap

    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=35)
    mock_doc.__getitem__ = MagicMock(return_value=mock_page)
    mock_doc.close = MagicMock()

    with patch("services.vision_pipeline.pdfium") as mock_pdfium:
        mock_pdfium.PdfDocument.return_value = mock_doc
        chunks = asyncio.run(
            process_scanned_pdf(b"fake_pdf", "scan.pdf", mock_llm, "cloud", None)
        )

    assert len(chunks) <= MAX_OCR_PAGES, (
        f"Expected <= {MAX_OCR_PAGES} chunks, got {len(chunks)}"
    )
    for chunk in chunks:
        assert "Source File: scan.pdf" in chunk
