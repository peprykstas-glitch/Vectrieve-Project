import io
import os
from fastapi import UploadFile
import pypdf
import pytesseract  # 👈 Бібліотека для зв'язку з Tesseract
from PIL import Image # 👈 Бібліотека для обробки зображень

# ==========================================================
# ⚙️ НАЛАШТУВАННЯ TESSERACT (Тільки для Windows)
# ==========================================================
# Вказуємо шлях до .exe файлу, який ти встановив.
# Якщо не працює - перевір, чи існує цей файл у тебе на диску.
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

async def parse_file(file: UploadFile) -> str:
    """
    Визначає тип файлу (PDF, TXT, IMG) та витягує з нього текст.
    """
    content = ""
    filename = file.filename.lower()

    # Читаємо файл у пам'ять
    file_bytes = await file.read()
    
    print(f"📄 Parsing file: {filename}")
    
    try:
        # 1. Обробка PDF (текстовий шар)
        if filename.endswith(".pdf"):
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_list = []
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_list.append(text)
            content = "\n".join(text_list)
            
            # Якщо PDF порожній (це скан), можна було б додати OCR для PDF, 
            # але це складніше. Поки що повертаємо те, що є.
            
        # 2. Обробка тексту
        elif filename.endswith((".txt", ".md")):
            content = file_bytes.decode("utf-8")
        
        # 3. Обробка Зображень (OCR) 👁️
        elif filename.endswith((".png", ".jpg", ".jpeg", ".bmp", ".tiff")):
            content = parse_image(file_bytes)
            
        else:
            raise ValueError("Unsupported file type. Please upload .pdf, .txt, .md, .png or .jpg")
            
    except Exception as e:
        print(f"❌ Error parsing file {filename}: {e}")
        return f"Error parsing file: {e}"

    return content

def parse_image(file_bytes):
    """
    Витягує текст з картинки за допомогою Tesseract OCR.
    """
    try:
        # Відкриваємо картинку з байтів
        image = Image.open(io.BytesIO(file_bytes))
        
        # Запускаємо розпізнавання (англійська + українська)
        # Tesseract сам спробує знайти текст обома мовами
        text = pytesseract.image_to_string(image, lang='eng+ukr')
        
        if not text.strip():
            print("⚠️ OCR finished but found no text.")
            return "[OCR: No text found in image]"
            
        print(f"✅ OCR Success! Extracted {len(text)} characters.")
        return text
        
    except pytesseract.TesseractNotFoundError:
        return "❌ Error: Tesseract is not installed or path is wrong in parser.py"
    except Exception as e:
        return f"❌ OCR Error: {str(e)}"