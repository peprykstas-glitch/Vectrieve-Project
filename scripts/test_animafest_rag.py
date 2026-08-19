import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("backend/app"))
sys.path.insert(0, os.path.abspath("backend"))

from services.vector_service import vector_service
from services.llm_service import llm_service
from models.schemas import QueryRequest, ChatMessage

async def test():
    query = "Hola, ya terminé mis estudios en la universidad y tengo mi título. ¿Puedo hacer las prácticas con ustedes?"
    context_chunks = await vector_service.search_knowledge_hybrid(
        query, 
        limit=5, 
        user_id=18, 
        space_id="0312404a-650b-4e4a-af30-a0660872650d"
    )
    print(f"Found {len(context_chunks)} context chunks in Animafest Knowledge Base.")
    context_str = "\n\n".join([c.content for c in context_chunks])
    
    system_prompt = """You are the official Animafest Experience AI Customer Support & Operations Assistant.
Your mission is to help Animafest staff and operators resolve student inquiries regarding internships, documentation, visas, NIE, TIE, EX-04, insurance, hotels, and platform procedures.

Rules & Guidelines:
1. Always base your answers STRICTLY on the Animafest Knowledge Base and Operations Manual.
2. Structure EVERY answer in two distinct, clear sections:

### 1. Internal Action Required (For Staff / English)
- Concise, bulleted step-by-step action the Animafest support team must take internally (e.g. system checks in Candidates/Stagiers, checking comments, diamond status, school agreements, or required documents).
- Specify if any escalation to Santy or hotel manager is required.

### 2. Ready-to-Send Student Message (Copy & Paste)
```
[Exact, polite, friendly, and concise message in the student's language (Spanish or English) matching the authentic Animafest WhatsApp support style, ready to send immediately to the student.]
```"""

    req = QueryRequest(
        messages=[ChatMessage(role="user", content=query)],
        thinking_mode="mentor"
    )
    
    res, model = await llm_service.generate_response(req, f"{system_prompt}\n\nCONTEXT:\n{context_str}")
    print("\n=== AI RESPONSE FOR ANIMAFEST OPERATOR ===")
    print(res)

if __name__ == "__main__":
    asyncio.run(test())
