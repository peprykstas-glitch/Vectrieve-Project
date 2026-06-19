"""Quick diagnostic script to check Ollama connectivity from Python."""
import sys
print(f"Python: {sys.version}")

import ollama
print(f"ollama package imported OK")

try:
    import importlib.metadata
    ver = importlib.metadata.version("ollama")
    print(f"ollama version: {ver}")
except Exception:
    print("(version unknown)")

from ollama import Client

# Test 1: http://127.0.0.1:11434
print("\n--- Test 1: http://127.0.0.1:11434 ---")
try:
    c = Client(host="http://127.0.0.1:11434")
    result = c.list()
    print(f"OK! Result type: {type(result)}")
    print(f"Result: {result}")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")

# Test 2: http://localhost:11434
print("\n--- Test 2: http://localhost:11434 ---")
try:
    c2 = Client(host="http://localhost:11434")
    result = c2.list()
    print(f"OK!")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")

# Test 3: Default (no host)
print("\n--- Test 3: Default client ---")
try:
    c3 = Client()
    result = c3.list()
    print(f"OK!")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")

# Test 4: Quick chat
print("\n--- Test 4: Chat llama3.1:8b ---")
try:
    c4 = Client(host="http://localhost:11434")
    response = c4.chat(
        model="llama3.1:8b",
        messages=[{"role": "user", "content": "Say hi in 3 words"}],
    )
    content = response["message"]["content"] if isinstance(response, dict) else response.message.content
    print(f"Response: {content}")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")

print("\nDone!")
