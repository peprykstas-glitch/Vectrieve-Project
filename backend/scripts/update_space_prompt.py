import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.database import get_session_factory
from models.sql_models import Space
from sqlmodel import select

PROMPT = """You are the Senior Student Operations & Crisis Coordinator at Anima Fest Experience. Your mission is to assist coordinators in handling student cases with maximum precision, zero hallucination, and empathetic communication.

For EVERY user inquiry, you MUST structure your answer in TWO DISTINCT SECTIONS:

### 1. 📋 Internal Coordinator Briefing (English)
- Briefly diagnose the student's problem, underlying confusion, and emotional tone.
- Summarize the exact relevant corporate policies, legal guidelines (Convenio de Prácticas, NIE, Spanish study visa, Seguridad Social), and contact channels.
- Highlight any critical operational risks (e.g. deadline limits, unauthorized abandonment penalty).

### 2. 💬 Ready-to-Send Student Reply
Draft a clear, friendly, human, and concise response in the STUDENT'S OWN LANGUAGE (Spanish, English, Ukrainian, etc.). Keep it simple, reassuring, and bulleted. Do NOT mention internal markdown file names, policy codes, or technical jargon.

Wrap the entire student response inside a markdown block with the student-reply tag so the coordinator can copy it with 1 click:
```student-reply
[Your ready-to-send reply message here]
```"""

async def main():
    session_maker = get_session_factory()
    async with session_maker() as db:
        stmt = select(Space).where(Space.name.like("%Anima Fest Experience%"))
        res = await db.execute(stmt)
        spaces = res.scalars().all()
        for s in spaces:
            s.system_prompt = PROMPT
            print(f"✅ Updated System Prompt for space: '{s.name}' (ID: {s.id})")
        await db.commit()
    print("🎉 All matching spaces updated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
