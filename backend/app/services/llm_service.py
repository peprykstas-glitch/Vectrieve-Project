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

        if request.mode == "local" and not self.groq_client:
            return await self._run_local(
                messages,
                temperature,
                model_name=request.model,
                max_tokens=request.max_tokens,
                top_p=request.top_p
            )
        else:
            if not self.groq_client:
                raise ValueError("Cloud mode selected, but GROQ_API_KEY is missing in .env")
            try:
                return await self._run_cloud(
                    messages,
                    temperature,
                    model_name=request.model,
                    max_tokens=request.max_tokens,
                    top_p=request.top_p
                )
            except Exception as e:
                # Do not silently fall back to local to save RAM
                raise ValueError(f"Cloud LLM failed: {e}")

    async def generate_title(self, user_query: str, ai_response: str) -> str:
        prompt = f"Summarize this topic in 3-5 words: User: {user_query} AI: {ai_response}"
        try:
            if self.groq_client:
                completion = await self.groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=settings.MODEL_NAME,
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
                    m_name = model_name or settings.LOCAL_MODEL_NAME
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
                model_to_use = model_name or settings.MODEL_NAME
                completion = await self.groq_client.chat.completions.create(
                    messages=messages,
                    model=model_to_use,
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

    async def _run_cloud(
        self,
        messages: list,
        temperature: float,
        model_name: Optional[str] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None
    ) -> tuple[str, str]:
        model_to_use = model_name if model_name else settings.MODEL_NAME
        max_tokens_to_use = max_tokens if max_tokens is not None else 1024
        
        kwargs = {
            "model": model_to_use,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens_to_use,
        }
        if top_p is not None:
            kwargs["top_p"] = top_p
            
        completion = await self.groq_client.chat.completions.create(**kwargs)
        return completion.choices[0].message.content, model_to_use

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

        if request.mode == "local" and not self.groq_client:
            # Local mode only if Groq is not configured
            text, used_model = await self._run_local(
                messages,
                temperature,
                model_name=request.model,
                max_tokens=request.max_tokens,
                top_p=request.top_p
            )
            for chunk in text.split(" "):
                yield chunk + " "
                await asyncio.sleep(0.01)
        else:
            if not self.groq_client:
                raise ValueError("Cloud mode selected, but GROQ_API_KEY is missing in .env")
            try:
                model_to_use = request.model if request.model else settings.MODEL_NAME
                max_tokens_to_use = request.max_tokens if request.max_tokens is not None else 1024
                
                kwargs = {
                    "model": model_to_use,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens_to_use,
                    "stream": True,
                }
                if request.top_p is not None:
                    kwargs["top_p"] = request.top_p
                    
                stream = await self.groq_client.chat.completions.create(**kwargs)
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
            except Exception as e:
                raise ValueError(f"Cloud LLM streaming failed: {e}")

    async def _run_local(
        self,
        messages: list,
        temperature: float,
        model_name: Optional[str] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None
    ) -> tuple[str, str]:
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
                options = {"temperature": temperature}
                if max_tokens is not None:
                    options["num_predict"] = max_tokens
                if top_p is not None:
                    options["top_p"] = top_p
                return client.chat(
                    model=model_to_use,
                    messages=messages,
                    options=options,
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


    async def describe_image(
        self,
        image_bytes: bytes,
        mode: str = "cloud",
        model_name: Optional[str] = None,
        vision_prompt: str = (
            "Describe all visible text, tables, diagrams, charts, and key visual "
            "elements in this image in detail. If there is text, transcribe it exactly."
        ),
    ) -> str:
        """
        Send a single image to a vision-capable LLM and return a textual description.

        Uses multimodal content blocks (image_url with base64 data URI) as required
        by both Groq and Ollama Vision APIs.

        IMPORTANT: This method deliberately bypasses _trim_history.
        _trim_history calls len(msg.get("content", "")) which works only when
        content is a str. Vision messages use content: list[dict], so calling
        _trim_history on them would return wrong char counts. Since describe_image
        is a single-turn, stateless call with no chat history, bypassing is correct.
        """
        import base64
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        content = [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            {"type": "text", "text": vision_prompt},
        ]
        messages = [{"role": "user", "content": content}]

        if mode == "local":
            return await self._run_local_vision(messages, model_name)
        else:
            if not self.groq_client:
                raise ValueError("Cloud mode selected but GROQ_API_KEY is missing.")
            return await self._run_cloud_vision(messages, model_name)

    async def _run_cloud_vision(
        self, messages: list, model_name: Optional[str] = None
    ) -> str:
        # Default: Groq's best vision-capable model available on free tier.
        # Supports Ukrainian/Polish text recognition without extra language packs.
        model = model_name or "meta-llama/llama-4-scout-17b-16e-instruct"
        completion = await self.groq_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=1024,
        )
        return completion.choices[0].message.content

    async def _run_local_vision(
        self, messages: list, model_name: Optional[str] = None
    ) -> str:
        """
        Call a locally-running Ollama vision model (e.g. llava, llama3.2-vision).

        IMPORTANT: Ollama vision API is structurally different from Groq/OpenAI:
          - Groq expects:  messages[i].content = [{"type": "image_url", ...}, {"type": "text", ...}]
          - Ollama expects: messages[i].images = [base64_str], messages[i].content = "text prompt"

        We convert from the Groq-format messages built in describe_image() to
        the Ollama-native format here — the two must never be mixed.

        Creates a fresh Client in a worker thread — same pattern as _run_local —
        to avoid httpx.Client event-loop conflicts in ollama v0.6+.
        """
        if not self.ollama_available:
            raise RuntimeError(
                "Ollama package not installed. Cannot run local vision inference."
            )
        ollama_host = self._ollama_host
        # Common vision models: llava, llava:13b, llama3.2-vision, moondream
        model = model_name or "llava"

        # Convert Groq-format content blocks → Ollama-native images + content text
        ollama_messages = []
        for msg in messages:
            content_blocks = msg.get("content", [])
            if isinstance(content_blocks, list):
                text_parts = [b["text"] for b in content_blocks if b.get("type") == "text"]
                image_parts = [
                    b["image_url"]["url"].split(",", 1)[1]  # strip "data:image/jpeg;base64,"
                    for b in content_blocks
                    if b.get("type") == "image_url"
                ]
                ollama_messages.append({
                    "role": msg["role"],
                    "content": " ".join(text_parts),
                    "images": image_parts,
                })
            else:
                # Plain text message — pass through unchanged
                ollama_messages.append(msg)

        def _sync_call():
            from ollama import Client
            client = Client(host=ollama_host)
            return client.chat(model=model, messages=ollama_messages)

        # 5-minute timeout — vision inference is significantly slower than text
        response = await asyncio.wait_for(
            asyncio.to_thread(_sync_call),
            timeout=300,
        )
        return response["message"]["content"]


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