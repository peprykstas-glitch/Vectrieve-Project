import sys
import asyncio
import json
import re
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

    def _build_system_prompt(self, request: QueryRequest, context_str: str) -> tuple[str, float]:
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

        # If space defines custom domain instructions, seamlessly blend them without identity clash
        if getattr(request, "space_system_prompt", None) and request.space_system_prompt.strip():
            base_prompt += f"\n\n--- WORKSPACE SPECIFIC INSTRUCTIONS ---\n{request.space_system_prompt.strip()}\n---------------------------------------"

        if context_str:
            if mode_key == "auditor":
                system_prompt = f"{base_prompt}\n\nAnswer strictly using the CONTEXT below. --- CONTEXT ---\n{context_str}"
            else:
                system_prompt = f"{base_prompt}\n\nUse the CONTEXT below as a primary source. --- CONTEXT ---\n{context_str}"
        else:
            system_prompt = f"{base_prompt}\n\nNo specific context provided."

        return system_prompt, temperature

    async def generate_response(
        self, request: QueryRequest, context_str: str, history_messages: list = None,
        groq_api_key: Optional[str] = None
    ) -> tuple[str, str]:
        system_prompt, temperature = self._build_system_prompt(request, context_str)

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

        # Determine which Groq client to use:
        # 1. If a per-request key is supplied (user's own key) — use it.
        # 2. Otherwise fall back to the server's global client (trial key).
        effective_client = None
        if groq_api_key:
            from groq import AsyncGroq
            effective_client = AsyncGroq(api_key=groq_api_key)
        elif self.groq_client:
            effective_client = self.groq_client
        else:
            raise ValueError("No Groq API key available. Please add your key in Settings.")
        try:
            return await self._run_cloud(
                messages,
                temperature,
                model_name=request.model,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                groq_client=effective_client
            )
        except Exception as e:
            raise ValueError(f"Cloud LLM failed: {e}")

    async def generate_title(
        self, user_query: str, ai_response: str, groq_api_key: Optional[str] = None
    ) -> str:
        # Fast deterministic heuristic first to save tokens
        clean_q = re.sub(r'^(привіт|hello|hi|buenos días|buenas tardes|dzień dobry|siemanko|por favor|please|proszę)\b[\s,]*', '', user_query.strip(), flags=re.IGNORECASE).strip()
        words = [w.strip() for w in clean_q.split() if w.strip()]
        if words and len(words) <= 5:
            return " ".join(words[:4]).capitalize()

        prompt = f"""Generate a 2 to 4 word title in the user's language without quotes or punctuation:
Query: "{user_query[:200]}"
"""
        client = None
        if groq_api_key:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_api_key)
        elif self.groq_client:
            client = self.groq_client

        if client:
            try:
                # Use lightweight 8B model to save 120B daily token quota
                completion = await client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.1-8b-instant",
                    temperature=0.2,
                    max_tokens=20,
                )
                raw_title = completion.choices[0].message.content.strip()
                cleaned = re.sub(r'^(title|тема|subject|topic):\s*', '', raw_title, flags=re.IGNORECASE)
                cleaned = cleaned.replace('"', '').replace("'", "").replace("`", "").strip()
                cleaned = re.sub(r'[\.\!\?]+$', '', cleaned).strip()
                if cleaned and len(cleaned) <= 45:
                    return cleaned
            except Exception as e:
                print(f"⚠️ Title generation LLM error: {e}")

        # Intelligent fallback
        if not words:
            return "New Chat"
        return " ".join(words[:4]).capitalize()

    async def generate_suggestions(
        self, user_query: str, ai_response: str, request_mode: str = "cloud", model_name: str = None,
        groq_api_key: Optional[str] = None
    ) -> List[str]:
        prompt = f"""You are Vectrieve Core, an advanced RAG assistant.
Based on the user's query and your intelligence response below, generate exactly 3 engaging, short (max 8-10 words each) follow-up questions tailored specifically to the topics and documents discussed.

CRITICAL: Detect the language of the user query and response (e.g., Ukrainian, Polish, English, Spanish) and write the follow-up questions in the SAME language.
- If Ukrainian: write in Ukrainian.
- If Polish: write in Polish.
- If Spanish: write in Spanish.
- If English: write in English.

User Query: "{user_query}"
Response: "{ai_response[:1000]}"

Respond ONLY with a raw JSON list of strings or a JSON object with a "questions" list, e.g. ["Question 1?", "Question 2?", "Question 3?"]."""

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
                        options={"temperature": 0.3, "num_predict": 120}
                    )
                    return res["message"]["content"]
                response_text = await asyncio.to_thread(_ollama_call)
            else:
                client = self._get_groq_client(groq_api_key)
                if not client:
                    client = self.groq_client
                if not client:
                    return self._get_language_fallback_suggestions(user_query, ai_response)

                # Use ultra-fast 8B model with 500k+ TPD quota so we do NOT burn 120B quota
                completion = await client.chat.completions.create(
                    messages=messages,
                    model="llama-3.1-8b-instant",
                    temperature=0.35,
                    max_tokens=150,
                    response_format={"type": "json_object"}
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
            
            try:
                data = json.loads(text)
                if isinstance(data, dict):
                    # Check for common keys like "questions", "suggestions", "follow_ups"
                    for key in ["questions", "suggestions", "follow_ups", "prompts", "items"]:
                        if key in data and isinstance(data[key], list) and len(data[key]) > 0:
                            return [str(q).strip()[:100] for q in data[key][:3] if str(q).strip()]
                    # Or take all string values
                    str_vals = [str(v).strip()[:100] for v in data.values() if isinstance(v, str) and len(v) > 3]
                    if len(str_vals) >= 2:
                        return str_vals[:3]
                elif isinstance(data, list):
                    return [str(p).strip()[:100] for p in data[:3] if str(p).strip()]
            except json.JSONDecodeError:
                # Regex fallback for json lists or quoted strings
                import re
                matches = re.findall(r'"([^"]{5,100})"', text)
                if len(matches) >= 2:
                    return matches[:3]
                # Numbered list fallback
                lines = [re.sub(r'^\d+[\.\)]\s*', '', l).strip() for l in text.split('\n') if l.strip()]
                cleaned_lines = [l for l in lines if len(l) > 5 and not l.lower().startswith(('here', '{', '['))]
                if len(cleaned_lines) >= 2:
                    return cleaned_lines[:3]

        except Exception as e:
            print(f"⚠️ Failed to generate dynamic suggestions: {e}")
        
        return self._get_language_fallback_suggestions(user_query, ai_response)

    def _get_language_fallback_suggestions(self, user_query: str, ai_response: str) -> List[str]:
        import re
        full_text = f"{user_query} {ai_response}"
        
        # Ukrainian detection (Cyrillic + specific Ukrainian letters like і, ї, є, ґ)
        if re.search(r'[\u0400-\u04FF]', full_text):
            return [
                "Які наступні практичні кроки?",
                "Чи є додаткові вимоги або ризики?",
                "Поясни детальніше цей пункт."
            ]
        # Polish detection
        if re.search(r'[ąćęłńóśźż]', full_text, re.IGNORECASE):
            return [
                "Jakie są kolejne kroki operacyjne?",
                "Czy istnieją dodatkowe wymagania?",
                "Wyjaśnij ten punkt bardziej szczegółowo."
            ]
        # Spanish detection
        if re.search(r'[áéíóúñ¿¡]', full_text, re.IGNORECASE) or any(w in full_text.lower() for w in [" que ", " para ", " con ", " los "]):
            return [
                "¿Cuáles son los siguientes pasos?",
                "¿Existen requisitos adicionales?",
                "Explica este punto con más detalle."
            ]
        
        # Default English
        return [
            "What are the immediate next steps?",
            "Are there any specific edge cases or risks?",
            "Could you provide a more detailed breakdown?"
        ]

    async def _run_cloud(
        self,
        messages: list,
        temperature: float,
        model_name: Optional[str] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        groq_client=None
    ) -> tuple[str, str]:
        client = groq_client or self.groq_client
        if not client:
            raise ValueError("No Groq client available.")
        model_to_use = model_name if model_name else settings.MODEL_NAME
        max_tokens_to_use = max_tokens if max_tokens is not None else 4096
        
        kwargs = {
            "model": model_to_use,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens_to_use,
        }
        if top_p is not None:
            kwargs["top_p"] = top_p
            
        completion = await client.chat.completions.create(**kwargs)
        return completion.choices[0].message.content, model_to_use

    async def generate_response_stream(
        self, request, context_str: str, history_messages: list = None,
        groq_api_key: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Yield response text as chunks for SSE streaming."""
        system_prompt, temperature = self._build_system_prompt(request, context_str)

        messages = [{"role": "system", "content": system_prompt}]
        # Issue B fix: trim history to stay within token budget
        safe_history = _trim_history(history_messages or [], system_prompt) if history_messages else None
        if safe_history:
            for msg in safe_history:
                messages.append(msg)
        else:
            for m in request.messages:
                messages.append({"role": m.role, "content": m.content})

        # Determine effective client: user's own key or server trial key
        effective_client = None
        if groq_api_key:
            from groq import AsyncGroq
            effective_client = AsyncGroq(api_key=groq_api_key)
        elif self.groq_client:
            effective_client = self.groq_client
        else:
            raise ValueError("No Groq API key available. Please add your key in Settings.")
        try:
            model_to_use = request.model if request.model else settings.MODEL_NAME
            max_tokens_to_use = request.max_tokens if request.max_tokens is not None else 4096
            
            kwargs = {
                "model": model_to_use,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens_to_use,
                "stream": True,
            }
            if request.top_p is not None:
                kwargs["top_p"] = request.top_p
                
            stream = await effective_client.chat.completions.create(**kwargs)
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
        # Default: Groq's flagship 90B multimodal vision model
        model = model_name or "llama-3.2-90b-vision-preview"
        try:
            completion = await self.groq_client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=1024,
            )
            return completion.choices[0].message.content
        except Exception as e:
            # Fallback to 11B vision model if 90B encounters temporary rate limit or outage
            if model == "llama-3.2-90b-vision-preview":
                completion = await self.groq_client.chat.completions.create(
                    model="llama-3.2-11b-vision-preview",
                    messages=messages,
                    max_tokens=1024,
                )
                return completion.choices[0].message.content
            raise e

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