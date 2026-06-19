import sys
import asyncio
from typing import Optional

# Ensure stdout uses UTF-8 so emoji in print() don't crash on Windows (cp1251)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.config import settings
from models.schemas import QueryRequest


class LLMService:
    def __init__(self):
        self.groq_client = None
        self.ollama_available = False
        self._ollama_host = settings.OLLAMA_BASE_URL

        if settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq

                self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                print(f"☁️ Groq Client initialized: {settings.MODEL_NAME}")
            except Exception as e:
                print(f"⚠️ Groq Init Warning: {e}")

        # Just check if the ollama package is importable — don't create a Client here
        # because httpx.Client created inside asyncio event loop can't connect
        try:
            import ollama as _ollama_mod  # noqa: F841
            self.ollama_available = True
            print(f"🔌 Ollama package found. Local mode enabled (host: {self._ollama_host})")
        except ImportError:
            print("⚠️ Ollama package not installed. Local mode disabled.")

    async def generate_response(
        self, request: QueryRequest, context_str: str, history_messages: list = None
    ) -> tuple[str, str]:
        mode_key = (
            request.thinking_mode.lower() if request.thinking_mode else "mentor"
        )
        persona = settings.THINKING_MODES.get(
            mode_key, settings.THINKING_MODES["mentor"]
        )
        temperature = (
            request.temperature
            if request.temperature is not None
            else persona["temp"]
        )

        base_prompt = f"{persona['role']} {persona['instruction']}"
        if context_str:
            if mode_key == "auditor":
                system_prompt = f"{base_prompt} Answer strictly using the CONTEXT below. --- CONTEXT ---\n{context_str}"
            else:
                system_prompt = f"{base_prompt} Use the CONTEXT below as a primary source. --- CONTEXT ---\n{context_str}"
        else:
            system_prompt = f"{base_prompt} No specific context provided."

        messages = [{"role": "system", "content": system_prompt}]
        
        if history_messages:
            for msg in history_messages:
                messages.append(msg)
        else:
            # Fallback if no history passed (e.g. tests)
            for m in request.messages:
                messages.append({"role": m.role, "content": m.content})

        if request.mode == "local":
            return await self._run_local(messages, temperature)
        else:
            if not self.groq_client:
                raise ValueError("Cloud mode selected, but GROQ_API_KEY is missing in .env")
            try:
                return await self._run_cloud(messages, temperature)
            except Exception as e:
                # Do not silently fall back to local to save RAM
                raise ValueError(f"Cloud LLM failed: {e}")

    async def generate_title(self, user_query: str, ai_response: str) -> str:
        prompt = f"Summarize this topic in 3-5 words: User: {user_query} AI: {ai_response}"
        try:
            if self.groq_client:
                completion = await self.groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.3-70b-versatile",
                    temperature=0.3,
                    max_tokens=20,
                )
                return (
                    completion.choices[0].message.content.strip().replace('"', "")
                )
            return "New Chat"
        except Exception:
            return "New Chat"

    async def _run_cloud(self, messages, temperature):
        completion = await self.groq_client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
        )
        return completion.choices[0].message.content, settings.MODEL_NAME

    async def _run_local(self, messages, temperature):
        if not self.ollama_available:
            return (
                "⚠️ No AI backend available. Install the 'ollama' pip package and start Ollama.",
                "none",
            )
        try:
            ollama_host = self._ollama_host

            # Create a FRESH Client inside the worker thread.
            # This is critical: ollama v0.6+ uses httpx internally,
            # and httpx.Client created inside an asyncio event loop
            # cannot make HTTP connections. Creating it in a clean
            # thread avoids this conflict entirely.
            def _sync_ollama_call():
                from ollama import Client
                client = Client(host=ollama_host)
                return client.chat(
                    model=settings.LOCAL_MODEL_NAME,
                    messages=messages,
                    options={"temperature": temperature},
                )

            response = await asyncio.wait_for(
                asyncio.to_thread(_sync_ollama_call),
                timeout=600  # 10 minutes max for local model (allows pulling)
            )
            return response["message"]["content"], settings.LOCAL_MODEL_NAME
        except asyncio.TimeoutError:
            print("⚠️ Ollama request timed out after 600s")
            return "⚠️ Local AI response timed out. The model might be loading. Please try again.", "timeout"
        except Exception as e:
            print(f"⚠️ Ollama error: {e}")
            return f"⚠️ Local AI error: {str(e)}", "error"


# --- Lazy singleton ---
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


class _LazyLLMProxy:
    """Proxy that lazily initializes LLMService on first attribute access."""

    def __getattr__(self, name):
        return getattr(get_llm_service(), name)


llm_service = _LazyLLMProxy()