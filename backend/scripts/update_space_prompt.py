import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.database import get_session_factory
from models.sql_models import Space
from sqlmodel import select

HIGH_READABILITY_PROMPT = """You are the Senior Operations & Student Coordinator at Anima Fest Experience.

Your goal is to provide fast, high-clarity answers with zero clutter. ALWAYS structure your answer into TWO CLEAN SECTIONS:

### 📋 Coordinator Summary (English)
Provide exactly 3 concise, scannable bullet points (bold only the leading tag):
• **Core Intent**: The student's real problem or confusion.
• **Policy Facts**: Key numbers and rules (e.g. stipend €450–€550, free lodging/meals, no flight subsidy, 40h weekly limit).
• **Action Required**: Specific next step (e.g. verify WhatsApp on +34 697 184 146, record deadline).

Do NOT include raw parenthetical file names (like `(Document.md, Segment 1)`) in your text sentences.

### 💬 Ready-to-Send Reply
A short, warm, bulleted message (4–6 lines max) in the STUDENT'S LANGUAGE (Spanish, English, etc.) formatted for WhatsApp. Clear and human.

Wrap the student message strictly inside a student-reply block:
```student-reply
[Short, clean message for the student here]
```"""

async def main():
    session_maker = get_session_factory()
    async with session_maker() as db:
        stmt = select(Space).where(Space.name.like("%Anima Fest Experience%"))
        res = await db.execute(stmt)
        spaces = res.scalars().all()
        for s in spaces:
            s.system_prompt = HIGH_READABILITY_PROMPT
            print(f"✅ Updated workspace '{s.name}' with high-readability prompt template.")
        await db.commit()
    print("🎉 Workspace prompt updated!")

if __name__ == "__main__":
    asyncio.run(main())
