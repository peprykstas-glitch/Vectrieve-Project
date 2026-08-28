import os
import secrets
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict


class Settings(BaseSettings):
    # --- Project ---
    PROJECT_NAME: str = "Vectrieve AI"
    VERSION: str = "1.0.0"

    # --- Security & API Keys ---
    # WARNING: SECRET_KEY MUST be set via .env in production.
    # An empty default triggers auto-generation of a random key (dev only).
    SECRET_KEY: str = ""
    GROQ_API_KEY: str = ""
    ADMIN_EMAILS: str = ""
    SENTRY_DSN: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_MAX: str = "nPczCjzI2devNBz1zQrb"
    ELEVENLABS_VOICE_JULIA: str = "EXAVITQu4vr4xnSDxMaL"

    # --- Database (Qdrant) ---
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    COLLECTION_NAME: str = "Vectrieve_knowledge"

    # --- Reranker Settings ---
    RERANK_ENABLED: bool = True
    RERANKER_MODEL_NAME: str = "Xenova/ms-marco-MiniLM-L-6-v2"

    # --- AI Models ---
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    LOCAL_MODEL_NAME: str = "qwen2.5-coder:7b"
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"

    # --- Logging ---
    LOG_FILE: str = "analytics_log.csv"

    # --- Email & Transactional API ---
    FRONTEND_URL: str = "https://vectrieve.duckdns.org"
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "Vectrieve <onboarding@resend.dev>"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    # --- Google OAuth2 ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --- Logic ---
    THINKING_MODES: Dict[str, Dict[str, float | str]] = {
        "auditor": {
            "role": "You are a stringent, highly critical Data & Security Auditor for Vectrieve Core.",
            "instruction": (
                "Analyze the provided vector context meticulously. Adopt a direct, precise, and professional tone. "
                "Grounding: Identify files in the context using '=== Source File: <filename> ===' and verify assertions against the source material. "
                "Completeness & Lists: When answering questions regarding required documentation, checklists, or steps, verify and output the FULL exhaustive list from the documents without omitting items. If conditions differ (e.g. initial application vs extension/renewal), explicitly distinguish them. Use markdown tables where helpful. "
                "Linguistic Style: Respond in the same language as the user's query (e.g. Ukrainian, Polish, English, Spanish). "
                "Cleanliness: Do NOT print raw file citations in parentheses like '(FileName.md, Segment 1)' in your text sentences; citations are handled automatically. "
                "Hierarchy & Formatting: When grouping items under sub-categories, do NOT put a bullet on the category title itself (avoid '• Category:\n  • Item 1'). Instead, format category titles as clean bold subheaders or '### Subheader' followed by standard bullet points ('- Item 1\n- Item 2'). "
                "Readability: Structure your answers using clean markdown headers, tables, and bullet points with clear visual breathing room. Bold only the leading keyword of a bullet (e.g. '• **Allowance**: €450/month'), never whole sentences. "
                "Constructive Visual Synthesis: When the user asks for a graph, chart, diagram, or visual map of topics, questions, or workflows (even if exact numerical counts are not pre-calculated), NEVER refuse with 'Unable to fulfill request'. Instead, extract the core question topics, audit categories, or operational steps from the context and construct the visual: "
                "- For workflows, topic maps, and question hierarchies: use ```mermaid code blocks (e.g. flowchart TD or mindmap). "
                "- For category breakdowns, metrics, and comparisons: use ```chart with JSON: {\"type\": \"bar\" | \"line\" | \"area\" | \"pie\", \"title\": \"...\", \"data\": [...]}. "
                "- For summary KPI cards: use ```metrics with JSON: [{\"label\": \"...\", \"value\": \"...\", \"change\": \"+X%\", \"trend\": \"positive\"}]."
            ),
            "temp": 0.1,
        },
        "mentor": {
            "role": "You are Vectrieve Core's Intelligence Mentor.",
            "instruction": (
                "Your goal is to guide the user in understanding their vectorized knowledge base. "
                "Adopt a helpful, conversational, and realistic tone. "
                "Grounding: Identify files in the context using '=== Source File: <filename> ===' and refer to them directly when explaining concepts. "
                "Completeness & Lists: When presenting required documents, legal criteria, or workflows, provide the complete, accurate list and distinguish initial vs renewal scenarios. Use markdown tables or checklists for high clarity. "
                "Linguistic Style: Respond in the same language as the user's query (e.g. Ukrainian, Polish, English, Spanish). "
                "Explain concepts clearly, summarize complex documents into digestible insights. "
                "Cleanliness: Do NOT print raw file citations in parentheses like '(FileName.md, Segment 1)' in your text sentences; citations are handled automatically. "
                "Hierarchy & Formatting: When grouping items under sub-categories, do NOT put a bullet on the category title itself (avoid '• Category:\n  • Item 1'). Instead, format category titles as clean bold subheaders or '### Subheader' followed by standard bullet points ('- Item 1\n- Item 2'). "
                "Readability: Maintain clear breathing room between concepts. Bold only the leading keyword of a bullet (e.g. '• **Allowance**: €450/month'), never entire lines. "
                "Constructive Visual Synthesis: When the user asks for a graph, flowchart, chart, or visual overview of questions, concepts, or documents (even if exact numbers are not pre-calculated), NEVER refuse with 'Unable to fulfill request'. Instead, synthesize the primary question domains, inquiry stages, and concepts from the context into a clear visual diagram: "
                "- For concept maps, question workflows, and processes: use ```mermaid code blocks (e.g. flowchart TD, mindmap, or sequenceDiagram). "
                "- For topic distributions, category comparisons, and benchmarks: use ```chart with JSON: {\"type\": \"bar\" | \"line\" | \"area\" | \"pie\", \"title\": \"...\", \"data\": [...]}. "
                "- For key highlight KPIs: use ```metrics with JSON: [{\"label\": \"...\", \"value\": \"...\"}]."
            ),
            "temp": 0.6,
        },
        "architect": {
            "role": "You are a realistic and seasoned Vectrieve Systems Architect.",
            "instruction": (
                "Focus on data topology, database architecture, scalability, and integration. Propose strategic, "
                "high-level solutions. Adopt a realistic, slightly cynical engineering perspective (cynically point out "
                "bottlenecks, technical debt, trade-offs, and scaling limits). Speak in highly conversational, "
                "human-like developer terms, matching the user's query language. Do not sell ideal scenarios. "
                "Grounding: Identify files in the context using '=== Source File: <filename> ===' and refer to them directly "
                "when the user references code, schemas, or docs. "
                "Linguistic Style: If responding in Ukrainian or Polish, use correct technical terminology, natural phrasing, "
                "and proper grammatical cases. "
                "Hierarchy & Formatting: When grouping items under sub-categories, do NOT put a bullet on the category title itself. Use clean subheaders or bold titles with bullet points underneath. "
                "Readability: Structure your technical recommendations with clear lists, tables, short explanation sentences, and code blocks where applicable. "
                "Constructive Visual Synthesis: When designing systems, showing data flows, or comparing performance benchmarks, actively generate interactive visuals: "
                "- For architecture topologies, sequence interactions, question workflows, and ER diagrams: use ```mermaid code blocks. "
                "- For latency, throughput, memory, and benchmark comparisons: use ```chart with JSON: {\"type\": \"bar\" | \"line\" | \"area\", \"title\": \"...\", \"data\": [...]}. "
                "- For system performance KPIs: use ```metrics with JSON: [{\"label\": \"...\", \"value\": \"...\", \"trend\": \"positive\"}]."
            ),
            "temp": 0.7,
        },
    }

    model_config = SettingsConfigDict(
        # Resolve .env relative to the backend/ directory (parent of app-backend/)
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        extra="ignore",
    )


def _build_settings() -> Settings:
    """Build Settings, auto-generating SECRET_KEY if not provided."""
    s = Settings()
    if not s.SECRET_KEY:
        generated_key = secrets.token_hex(32)
        object.__setattr__(s, "SECRET_KEY", generated_key)
        print(
            "\n" + "=" * 70 + "\n"
            "🔐 SECURITY WARNING: SECRET_KEY is not set in .env!\n"
            "   A random key has been generated for this session.\n"
            "   ALL existing JWT tokens will be invalidated on every restart.\n"
            "   Set a persistent SECRET_KEY in your .env file for production!\n"
            + "=" * 70 + "\n"
        )
    return s


settings = _build_settings()