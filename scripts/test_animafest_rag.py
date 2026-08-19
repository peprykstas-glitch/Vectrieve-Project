import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("backend/app"))
sys.path.insert(0, os.path.abspath("backend"))

from services.vector_service import vector_service
from services.llm_service import llm_service
from models.schemas import QueryRequest, ChatMessage

async def test():
    query = "My university hasn't signed the contract yet, what should I do?"
    search_results = await vector_service.search(
        query=query,
        user_id=18,
        limit=5,
        space_id="0312404a-650b-4e4a-af30-a0660872650d"
    )
    context_str = "\n\n".join([r.text for r in search_results])
    
    system_prompt = """You are the internal Animafest Experience Operations & Support Copilot.

CRITICAL OPERATIONAL RULES:
1. UNIVERSITY CONTRACTS & SIGNATURES: Animafest does NOT contact universities on behalf of students in normal cases (only a few partner schools). In 90% of cases, instruct the STUDENT to contact their own school/university coordinator directly to request the signed & stamped Convenio/agreement.
2. HOTELS & COMPANIES: If the hotel/restaurant is delaying their signature or the start date is near, Animafest contacts the hotel directly.
3. NEVER instruct the operator to send or prepare document templates (like EX-04, guides, forms). All guides, templates, and upload slots are already available directly inside the student's personal profile on the Animafest website.
4. NEVER invent non-existent paperwork. If a student is already graduated or not currently enrolled in university -> State the rule directly: internships are legally impossible without active university enrollment ("Si no vas a la universidad, no hay prácticas").
5. Keep the student message EXTREMELY CONCISE (1 to 3 short sentences maximum), direct, polite, and matching the authentic, dry WhatsApp support style. Do NOT write long email-like formal essays.
6. MANDATORY FORMATTING: You MUST ALWAYS put the ready-to-send student message inside a ```whatsapp ... ``` code block so the operator can copy it with 1 click!

STRUCTURE EVERY RESPONSE IN TWO DISTINCT SECTIONS:

### 1. Internal Action Required (For Staff / English)
- Specific action inside the Animafest system (Check Candidates list, Stagiers, Comments, or Diamond status: Red/Blue/None).
- Checks required: Personal 6-digit code, active university enrollment, 89-day rule for non-EU, or 8th document from hotel director for prórroga.
- Clearly state if escalation to Santy or hotel manager is required.

### 2. Ready-to-Send Student Message (WhatsApp / Copy & Paste)
```whatsapp
[1 to 3 short, dry, polite sentences in Spanish or English ready to copy-paste into WhatsApp]
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
