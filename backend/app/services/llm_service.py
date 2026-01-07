import os
from groq import AsyncGroq
import ollama
from app.core.config import settings
from app.models.schemas import QueryRequest

class LLMService:
    def __init__(self):
        # Ініціалізація Groq
        self.groq_client = None
        if settings.GROQ_API_KEY:
            try:
                self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                print(f"☁️ Groq Client initialized: {settings.MODEL_NAME}")
            except Exception as e:
                print(f"⚠️ Groq Init Warning: {e}")

    async def generate_response(self, request: QueryRequest, context_str: str) -> tuple[str, str]:
        """
        Генерує відповідь, вибираючи між Cloud (Groq) та Local (Ollama).
        Повертає: (response_text, used_model_name)
        """
        # 1. Вибір персони (Thinking Mode)
        mode_key = request.thinking_mode.lower()
        persona = settings.THINKING_MODES.get(mode_key, settings.THINKING_MODES["mentor"])
        
        # Якщо температура не передана в запиті, беремо з налаштувань персони
        temperature = request.temperature if request.temperature is not None else persona["temp"]

        # 2. Формування системного промпта
        base_prompt = f"{persona['role']} {persona['instruction']}"
        if context_str:
            if mode_key == "auditor":
                system_prompt = (
                    f"{base_prompt} "
                    "Answer strictly using the CONTEXT below. Do not use outside knowledge. "
                    f"--- CONTEXT ---\n{context_str}"
                )
            else:
                system_prompt = (
                    f"{base_prompt} "
                    "Use the CONTEXT below as a primary source, but expand with general knowledge if needed. "
                    f"--- CONTEXT ---\n{context_str}"
                )
        else:
            system_prompt = f"{base_prompt} No specific context provided. Answer using general knowledge."

        # 3. Підготовка повідомлень
        messages = [{"role": "system", "content": system_prompt}]
        for m in request.messages:
            messages.append({"role": m.role, "content": m.content})

        # 4. Логіка вибору провайдера (Cloud vs Local)
        force_local = (request.mode == "local") or (not self.groq_client)
        
        if force_local:
            return self._run_local(messages, temperature)
        else:
            try:
                return await self._run_cloud(messages, temperature)
            except Exception as e:
                print(f"⚠️ Cloud failed ({e}). Switching to LOCAL...")
                return self._run_local(messages, temperature)

    async def _run_cloud(self, messages, temperature):
        """Виклик Groq API"""
        print(f"☁️ Using Groq ({settings.MODEL_NAME})...")
        completion = await self.groq_client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=messages,
            temperature=temperature,
            max_tokens=1024
        )
        return completion.choices[0].message.content, settings.MODEL_NAME

    def _run_local(self, messages, temperature):
        """Виклик Ollama (Local)"""
        print(f"🔒 Using Local ({settings.LOCAL_MODEL_NAME})...")
        response = ollama.chat(
            model=settings.LOCAL_MODEL_NAME,
            messages=messages,
            options={'temperature': temperature}
        )
        return response['message']['content'], settings.LOCAL_MODEL_NAME

llm_service = LLMService()