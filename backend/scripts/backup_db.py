import shutil
import os
from datetime import datetime

# Налаштування
DB_FILE = "vectrieve.db"
BACKUP_DIR = "backups"

def create_backup():
    if not os.path.exists(DB_FILE):
        print(f"❌ Database file '{DB_FILE}' not found.")
        return

    # Створюємо папку для бекапів, якщо немає
    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Генеруємо ім'я з датою: vectrieve_2023-10-27_14-30.db
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"vectrieve_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    try:
        shutil.copy2(DB_FILE, backup_path)
        print(f"✅ Backup successful: {backup_path}")
    except Exception as e:
        print(f"⚠️ Backup failed: {e}")

if __name__ == "__main__":
    create_backup()