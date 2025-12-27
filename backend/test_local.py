from ollama import Client

print("🔌 Connecting to Ollama...")
try:
    # Використовуємо ту саму логіку, що і в новому main.py
    client = Client(host='http://127.0.0.1:11434')
    
    print("🤖 Sending 'Hello' to qwen2.5-coder:7b...")
    response = client.chat(
        model='qwen2.5-coder:7b',
        messages=[{'role': 'user', 'content': 'Hello!'}]
    )
    print(f"\n✅ SUCCESS! Response:\n{response['message']['content']}")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("👉 Porada: Переконайся, що Ollama запущена (ollama serve)")