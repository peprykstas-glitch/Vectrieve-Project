import sys
import asyncio
import json
from typing import Optional, AsyncGenerator, List

# Ensure stdout uses UTF-8 so emoji in print() don't crash on Windows (cp1251)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.config import settings
from models.schemas import QueryRequest

# ---------------------------------------------------------------------------
# Token budget guard — sliding window history trimmer
# ---------------------------------------------------------------------------
# Rough heuristic: 1 token ≈ 4 characters (works for English and Ukrainian).
# We do NOT add tiktoken as a dependency to keep the footprint minimal.
_CHARS_PER_TOKEN = 4
_MAX_CONTEXT_TOKENS = 6000  # safe for all common local models (4K–8K window)


def _trim_history(history_messages: list, system_prompt: str, max_tokens: int = _MAX_CONTEXT_TOKENS) -> list:
    """
    Trim chat history so the total prompt (system + history) stays within
    the token budget. Always preserves the system message and the last user
    message. Removes oldest messages first (sliding window).
    """
    if not history_messages:
        return []

    budget_chars = max_tokens * _CHARS_PER_TOKEN
    # Account for system prompt overhead
    used_chars = len(system_prompt)
    # Always keep the last user message
    last_msg = history_messages[-1]
    used_chars += len(last_msg.get("content", ""))

    kept = [last_msg]
    # Walk backwards through history (excluding last), adding messages while budget allows
    for msg in reversed(history_messages[:-1]):
        msg_chars = len(msg.get("content", ""))
        if used_chars + msg_chars > budget_chars:
            break  # budget exhausted — drop this and all older messages
        used_chars += msg_chars
        kept.append(msg)

    # Restore chronological order
    kept.reverse()
    trimmed_count = len(history_messages) - len(kept)
    if trimmed_count > 0:
        print(f"📏 Token guard: trimmed {trimmed_count} old messages to stay within {max_tokens}-token budget.")
    return kept


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

        # Issue B fix: trim history to stay within token budget before sending to LLM
        safe_history = _trim_history(history_messages or [], system_prompt) if history_messages else None

        if safe_history:
            for msg in safe_history:
                messages.append(msg)
        else:
            # Fallback if no history passed (e.g. tests)
            for m in request.messages:
                messages.append({"role": m.role, "content": m.content})

        if request.mode == "local":
            return await self._run_local(messages, temperature, model_name=request.model)
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

    async def generate_suggestions(
        self, user_query: str, ai_response: str, request_mode: str = "cloud", model_name: str = None
    ) -> List[str]:
        prompt = f"""
You are Vectrieve Core, an advanced RAG assistant.
Based on the user's query and your intelligence response below, generate exactly 3 engaging, short (max 8-10 words each) follow-up questions.
CRITICAL: Detect the language of the user query and response (e.g., Ukrainian, Polish, English) and write the follow-up questions in the SAME language.
- If the conversation is in Ukrainian, the suggestions MUST be in Ukrainian.
- If the conversation is in Polish, the suggestions MUST be in Polish.
- If the conversation is in English, the suggestions MUST be in English.

User Query: "{user_query}"
Response: "{ai_response[:1000]}"

Respond ONLY with a raw JSON list of strings. Do not add any markdown formatting, backticks, or extra text.

Examples:
- If Ukrainian: ["Які ключові зобов'язання у розділі 4?", "Як ми можемо оптимізувати цей шаблон?", "Які основні ризики згадуються у тексті?"]
- If Polish: ["Jakie są kluczowe zobowiązania w sekcji 4?", "Jak możemy zoptymalizować ten szablon?", "Jakie główne ryzyka są wymienione w tekście?"]
- If English: ["What are the key liabilities in section 4?", "How can we optimize this onboarding template?", "Is there a penalty for contract breach?"]
"""
        messages = [{"role": "user", "content": prompt}]
        try:
            if request_mode == "local":
                def _ollama_call():
                    import ollama
                    client = ollama.Client(host=self._ollama_host)
                    m_name = model_name or "qwen2.5-coder:7b"
                    res = client.chat(
                        model=m_name,
                        messages=messages,
                        options={"temperature": 0.3, "num_predict": 100}
                    )
                    return res["message"]["content"]
                response_text = await asyncio.to_thread(_ollama_call)
            else:
                if not self.groq_client:
                    return []
                completion = await self.groq_client.chat.completions.create(
                    messages=messages,
                    model="llama-3.3-70b-versatile",
                    temperature=0.3,
                    max_tokens=120,
                )
                response_text = completion.choices[0].message.content

            text = response_text.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                text = "\n".join(lines).strip()
            
            prompts = json.loads(text)
            if isinstance(prompts, list):
                return [str(p)[:100] for p in prompts[:3]]
        except Exception as e:
            print(f"⚠️ Failed to generate dynamic suggestions: {e}")
        
        return [
            "Can you summarize the key findings?",
            "What are the next operational steps?",
            "Analyze potential risks in the context."
        ]

    async def _run_cloud(self, messages, temperature):
        completion = await self.groq_client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
        )
        return completion.choices[0].message.content, settings.MODEL_NAME

    async def generate_response_stream(
        self, request, context_str: str, history_messages: list = None
    ) -> AsyncGenerator[str, None]:
        """Yield response text as chunks for SSE streaming."""
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
        # Issue B fix: trim history to stay within token budget
        safe_history = _trim_history(history_messages or [], system_prompt) if history_messages else None
        if safe_history:
            for msg in safe_history:
                messages.append(msg)
        else:
            for m in request.messages:
                messages.append({"role": m.role, "content": m.content})

        if request.mode == "local":
            # Local mode doesn't support streaming — fall back to full response
            text, used_model = await self._run_local(messages, temperature, model_name=request.model)
            for chunk in text.split(" "):
                yield chunk + " "
                await asyncio.sleep(0.01)
        else:
            if not self.groq_client:
                raise ValueError("Cloud mode selected, but GROQ_API_KEY is missing in .env")
            try:
                stream = await self.groq_client.chat.completions.create(
                    model=settings.MODEL_NAME,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=1024,
                    stream=True,
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
            except Exception as e:
                raise ValueError(f"Cloud LLM streaming failed: {e}")

    async def _run_local(self, messages, temperature, model_name: str = None):
        if not self.ollama_available:
            return (
                "⚠️ No AI backend available. Install the 'ollama' pip package and start Ollama.",
                "none",
            )
        try:
            ollama_host = self._ollama_host
            model_to_use = model_name if model_name else settings.LOCAL_MODEL_NAME

            # Create a FRESH Client inside the worker thread.
            # This is critical: ollama v0.6+ uses httpx internally,
            # and httpx.Client created inside an asyncio event loop
            # cannot make HTTP connections. Creating it in a clean
            # thread avoids this conflict entirely.
            def _sync_ollama_call():
                from ollama import Client
                client = Client(host=ollama_host)
                return client.chat(
                    model=model_to_use,
                    messages=messages,
                    options={"temperature": temperature},
                )

            response = await asyncio.wait_for(
                asyncio.to_thread(_sync_ollama_call),
                timeout=600  # 10 minutes max for local model (allows pulling)
            )
            return response["message"]["content"], model_to_use
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