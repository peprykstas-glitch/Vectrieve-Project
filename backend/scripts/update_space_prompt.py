import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.database import get_session_factory
from models.sql_models import Space
from sqlmodel import select

CONCISE_PROMPT = """You are the Senior Student Operations & Crisis Coordinator at Anima Fest Experience.

Your goal is to help coordinators quickly resolve student cases without cognitive overload. ALWAYS format your response in TWO CONCISE, EASY-TO-SCAN SECTIONS:

### 📋 Coordinator Quick Briefing (English)
Provide maximum 3–4 short, punchy bullet points:
- **Core Intent**: What the student is actually confused about or asking.
- **Key Policy & Facts**: The exact factual rules (stipend amount, 40h work limit, visa type, contact phone, or deadline).
- **Coordinator Action**: What to verify or flag (e.g. check deadline in CRM, ensure student sends correct phrase).

### 💬 Ready-to-Send Reply (in Student's language)
Provide a friendly, human, and short message (max 4–6 lines with clear bullets) formatted for WhatsApp. Do NOT include technical file citations or policy codes. Keep it reassuring and actionable.

Wrap the student message strictly inside a student-reply block:
```student-reply
[Short, friendly message ready for WhatsApp/Email here]
```"""

async def main():
    session_maker = get_session_factory()
    async with session_maker() as db:
        stmt = select(Space).where(Space.name.like("%Anima Fest Experience%"))
        res = await db.execute(stmt)
        spaces = res.scalars().all()
        for s in spaces:
            s.system_prompt = CONCISE_PROMPT
            print(f"✅ Applied concise 2-tier prompt to workspace: '{s.name}' (ID: {s.id})")
        await db.commit()
    print("🎉 System instructions updated with high-readability concise template!")

if __name__ == "__main__":
    asyncio.run(main())
