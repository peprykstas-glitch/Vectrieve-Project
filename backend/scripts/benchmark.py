import time
import requests
import psutil
import statistics
import os

# Налаштування
API_URL = "http://127.0.0.1:8000"
ENDPOINTS = {
    "Health Check": "/health",
    # Можна додати інші ендпоінти, наприклад аналітику
    "Analytics": "/analytics" 
}
ITERATIONS = 10  # Кількість запитів для усереднення

def get_server_memory_usage():
    """Знаходить процес, який слухає порт 8000, і повертає його RAM (MB)."""
    for proc in psutil.process_iter(['pid', 'name', 'memory_info']):
        try:
            for conn in proc.net_connections(kind='inet'):
                if conn.laddr.port == 8000:
                    mem_usage = proc.memory_info().rss / (1024 * 1024) # Конвертація в MB
                    return mem_usage, proc.name()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return None, None

def measure_latency(url):
    """Міряє час відповіді сервера."""
    start = time.time()
    try:
        response = requests.get(url)
        response.raise_for_status()
        return (time.time() - start) * 1000  # Конвертація в мілісекунди (ms)
    except Exception as e:
        print(f"❌ Помилка запиту до {url}: {e}")
        return None

def run_benchmark():
    print(f"🚀 Запуск бенчмарку Vectrieve AI...")
    print(f"📡 API URL: {API_URL}")
    print("-" * 40)

    # 1. Вимірювання пам'яті
    ram_usage, proc_name = get_server_memory_usage()
    if ram_usage:
        print(f"💾 RAM Usage (Process '{proc_name}'): {ram_usage:.2f} MB")
    else:
        print("⚠️ Не вдалося знайти процес сервера на порту 8000. Переконайся, що сервер запущений!")
        ram_usage = 0

    print("-" * 40)

    # 2. Вимірювання затримки (Latency)
    results = {}
    
    for name, endpoint in ENDPOINTS.items():
        url = f"{API_URL}{endpoint}"
        latencies = []
        print(f"⏱️  Тестування '{name}' ({ITERATIONS} запитів)...", end="", flush=True)
        
        for _ in range(ITERATIONS):
            lat = measure_latency(url)
            if lat:
                latencies.append(lat)
            time.sleep(0.1) # Невелика пауза між запитами
        
        if latencies:
            avg_lat = statistics.mean(latencies)
            max_lat = max(latencies)
            min_lat = min(latencies)
            results[name] = avg_lat
            print(f" ✅ Avg: {avg_lat:.2f}ms")
        else:
            print(" ❌ Failed")

    # 3. Генерація звіту для Markdown
    print("\n📝 Скопіюй цей блок у docs/benchmarks.md:")
    print("=" * 40)
    print(f"## Benchmark Report ({time.strftime('%Y-%m-%d %H:%M')})")
    print(f"- **RAM Usage:** {ram_usage:.2f} MB")
    print("\n| Endpoint | Avg Latency (ms) | Min (ms) | Max (ms) |")
    print("|---|---|---|---|")
    for name, endpoint in ENDPOINTS.items():
        url = f"{API_URL}{endpoint}"
        # Повторний прогін для точних цифр у таблиці або використання попередніх
        # Для простоти виведемо середні, які вже порахували (тут спрощено)
        print(f"| {name} | {results.get(name, 0):.2f} | - | - |")
    print("=" * 40)

if __name__ == "__main__":
    run_benchmark()