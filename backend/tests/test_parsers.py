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
