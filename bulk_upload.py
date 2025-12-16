import os
import requests
import time

# Налаштування
FOLDER_PATH = "books_to_test"  # Папка з книгами
API_URL = "http://127.0.0.1:8000/upload"

def bulk_upload():
    if not os.path.exists(FOLDER_PATH):
        print(f"❌ Папка {FOLDER_PATH} не знайдена!")
        return

    files = [f for f in os.listdir(FOLDER_PATH) if f.endswith(('.pdf', '.txt', '.md'))]
    print(f"📦 Знайдено файлів: {len(files)}")
    print("-" * 30)

    total_start = time.time()
    
    for filename in files:
        file_path = os.path.join(FOLDER_PATH, filename)
        print(f"🚀 Завантажую: {filename}...", end=" ", flush=True)
        
        file_start = time.time()
        try:
            with open(file_path, 'rb') as f:
                response = requests.post(API_URL, files={"file": f})
                
            if response.status_code == 200:
                duration = time.time() - file_start
                data = response.json()
                # ТУТ БУЛА ПОМИЛКА: тепер ми беремо chunks_count
                chunks = data.get("chunks_count", "N/A")
                print(f"✅ OK! (Chunks: {chunks}) [Час: {duration:.2f}s]")
            else:
                print(f"❌ Помилка: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Critical Error: {e}")

    total_time = time.time() - total_start
    print("-" * 30)
    print(f"🏁 Стрес-тест завантаження завершено за {total_time:.2f}s")

if __name__ == "__main__":
    bulk_upload()