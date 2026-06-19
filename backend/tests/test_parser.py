import pytest
from unittest.mock import patch, MagicMock
from fastapi import UploadFile
from io import BytesIO
from backend.app.services.pdf_parser import parse_file

# --- ТЕСТИ ДЛЯ ТЕКСТОВИХ ФАЙЛІВ ---

@pytest.mark.asyncio
async def test_parse_simple_text():
    """Перевірка звичайного UTF-8 тексту/коду"""
    content = b"print('Hello Vectrieve')"
    file = UploadFile(filename="script.py", file=BytesIO(content))
    
    result = await parse_file(file)
    assert result == "print('Hello Vectrieve')"

@pytest.mark.asyncio
async def test_parse_encoding_fallback():
    """Перевірка fallback на windows-1251 (кирилиця)"""
    # Рядок "Привіт" у кодуванні windows-1251
    content = "Привіт".encode("windows-1251")
    file = UploadFile(filename="readme.txt", file=BytesIO(content))
    
    result = await parse_file(file)
    assert result == "Привіт"

# --- ТЕСТИ ДЛЯ PDF (З МОКАМИ) ---

@pytest.mark.asyncio
async def test_parse_pdf_success():
    """Імітація успішного читання PDF"""
    # Ми мокаємо pypdf.PdfReader, щоб не створювати справжній PDF файл
    with patch("pypdf.PdfReader") as MockPdfReader:
        # Налаштовуємо поведінку мока
        mock_instance = MockPdfReader.return_value
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Parsed PDF Content"
        mock_instance.pages = [mock_page]

        # Створюємо пустий "файл", бо pypdf ми підмінили
        file = UploadFile(filename="doc.pdf", file=BytesIO(b"fake pdf content"))
        
        result = await parse_file(file)
        
        assert "Parsed PDF Content" in result

@pytest.mark.asyncio
async def test_parse_pdf_error():
    """Імітація битого PDF або помилки бібліотеки"""
    with patch("pypdf.PdfReader") as MockPdfReader:
        # Змушуємо pypdf кинути помилку при спробі читання
        MockPdfReader.side_effect = Exception("Corrupt file")

        file = UploadFile(filename="bad.pdf", file=BytesIO(b"bad content"))
        
        result = await parse_file(file)
        
        # Перевіряємо, що функція повернула наше повідомлення про помилку, а не впала
        assert "[Error parsing PDF: Corrupt file]" in result

# --- ТЕСТИ ДЛЯ НЕПІДТРИМУВАНИХ ФАЙЛІВ ---

@pytest.mark.asyncio
async def test_unsupported_extension():
    """Перевірка файлу, який ми не вміємо читати"""
    file = UploadFile(filename="image.png", file=BytesIO(b"image data"))
    
    result = await parse_file(file)
    
    assert "Unsupported file type" in result
    assert ".png" in result