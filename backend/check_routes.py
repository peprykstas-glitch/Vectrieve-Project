import sys
import os

# Додаємо поточну папку в шляхи, щоб Python бачив пакет app
sys.path.append(os.getcwd())

from.main import app
from fastapi.routing import APIRoute

print("\n" + "="*50)
print("🔍 СПИСОК ВСІХ АКТИВНИХ РОУТІВ")
print("="*50)

found_upload = False

for route in app.routes:
    if isinstance(route, APIRoute):
        methods = ", ".join(route.methods)
        print(f"👉 {methods:20} {route.path}")
        if "upload" in route.path:
            found_upload = True

print("="*50)
if not found_upload:
    print("❌ УВАГА: Роут 'upload' ВЗАГАЛІ НЕ ЗНАЙДЕНО!")
    print("Перевір app/api/api.py -> чи є там include_router(upload.router)")
else:
    print("✅ Роут upload знайдено. Порівняй його точну адресу з тим, що в тесті.")
print("="*50 + "\n")