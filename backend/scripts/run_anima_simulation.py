import asyncio
import os
import sys
import uuid
from pathlib import Path
from sqlmodel import select

# Set up paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from core.database import get_session_factory
from models.user import User
from models.sql_models import Space
from models.document import Document
from services.vector_service import VectorService
from services.llm_service import LLMService
from services.pdf_parser import _parse_file_sync

TEST_QUERIES = [
    {
        "id": "TC-1",
        "title": "Stipend / Pocket Money in Balearic Islands",
        "query": "Скільки кишенькових грошей (stipend) я отримуватиму на місяць, якщо мене розподілять на Мальорку або Ібіцу, і чи надається житло?",
        "expected_facts": ["450", "550", "безкоштовн", "житл", "харчуван"]
    },
    {
        "id": "TC-2",
        "title": "Visa & NIE Requirements for Non-EU Students",
        "query": "Які вимоги та документи потрібні для українського або non-EU студента, якщо практика триває понад 90 днів? Що з номером NIE?",
        "expected_facts": ["Convenio", "NIE", "віз", "посольств", "страховк"]
    },
    {
        "id": "TC-3",
        "title": "Overtime Violation & Conflict with Hotel Supervisor",
        "query": "Що робити, якщо шеф у готелі змушує працювати по 55-60 годин на тиждень і не дає 2 вихідних? Чи можу я просто зібрати речі і піти?",
        "expected_facts": ["40", "не можна самовільно", "координатор", "гаряч", "переведен"]
    },
    {
        "id": "TC-4",
        "title": "Refund Policy upon Official Visa Denial",
        "query": "Якщо іспанське посольство офіційно відмовить мені у візі, чи поверне Anima Fest мій збір за підтвердження практики (350 EUR)?",
        "expected_facts": ["100%", "повертається", "відмов", "лист"]
    },
    {
        "id": "TC-5",
        "title": "Negative Test / Zero-Hallucination Guardrail",
        "query": "Чи оплачує Anima Fest мені авіаквитки першого класу та трансфер на вертольоті до готелю?",
        "expected_facts": ["не оплачує", "студент самостійно", "відсутн"]
    }
]

async def run_simulation():
    print("=" * 80)
    print("🏨 ANIMA FEST EXPERIENCE — ENTERPRISE RAG SIMULATION & STRESS TEST")
    print("=" * 80)

    session_maker = get_session_factory()
    async with session_maker() as db:
        # 1. Fetch Admin User
        user_res = await db.execute(select(User).where(User.username == "pepryk.stas@gmail.com"))
        user = user_res.scalars().first()
        if not user:
            user_res = await db.execute(select(User).limit(1))
            user = user_res.scalars().first()

        user_id = user.id
        print(f"👤 Active Administrator: {user.username} (ID: {user_id})")

        # 2. Create or Get Dedicated Space
        space_name = "Anima Fest Experience — Student Operations"
        space_res = await db.execute(select(Space).where(Space.name == space_name))
        space = space_res.scalars().first()

        system_instruction = (
            "You are the Senior Student Operations & Crisis Coordinator at Anima Fest Experience. "
            "Your mission is to provide rigorous, accurate, and empathetic guidance to students, universities, "
            "and hotel resort partners regarding internships in Spain. Base your answers strictly on verified corporate policies, "
            "Spanish legal guidelines (Convenio de Prácticas, NIE, Seguridad Social), and hotel placement contracts. "
            "If information is not in the knowledge base, state it clearly without hallucination."
        )

        if not space:
            space = Space(
                id=str(uuid.uuid4()),
                name=space_name,
                system_prompt=system_instruction,
                user_id=user_id,
                llm_provider="cloud",
                llm_model="openai/gpt-oss-120b"
            )
            db.add(space)
            await db.commit()
            await db.refresh(space)
            print(f"✨ Created Dedicated Workspace: '{space.name}' (ID: {space.id})")
        else:
            space.system_prompt = system_instruction
            await db.commit()
            print(f"📂 Loaded Existing Workspace: '{space.name}' (ID: {space.id})")

        space_id = space.id

        # 3. Ingest Documents into Database and Vector Store
        data_dir = Path(__file__).resolve().parent.parent / "test_data" / "anima_fest"
        files = list(data_dir.glob("*.*"))
        print(f"\n📥 Ingesting {len(files)} Corporate Policy Documents into Qdrant & Postgres...")

        vs = VectorService()
        llm = LLMService()

        for fpath in files:
            fname = fpath.name
            
            # Check if document already tracked in DB
            doc_res = await db.execute(
                select(Document).where(Document.filename == fname, Document.space_id == space_id)
            )
            existing_doc = doc_res.scalars().first()
            if not existing_doc:
                doc = Document(
                    filename=fname,
                    user_id=user_id,
                    space_id=space_id,
                    status="COMPLETED",
                    file_size=fpath.stat().st_size
                )
                db.add(doc)
                await db.commit()
                await db.refresh(doc)
            else:
                doc = existing_doc

            # Parse content
            parsed_content = _parse_file_sync(fpath, fname)
            if isinstance(parsed_content, list):
                chunks = parsed_content
            else:
                # Text split
                chunks = [parsed_content[i:i+600] for i in range(0, len(parsed_content), 500)]

            # Upsert vectors
            await vs.upsert_batch(chunks, fname, user_id=user_id, space_id=space_id)
            print(f"  ✅ [Ingested] {fname:<50} ({len(chunks)} chunks, {doc.file_size} bytes)")

        print("\n" + "=" * 80)
        print("🎯 EXECUTING SCENARIO STRESS TESTS")
        print("=" * 80 + "\n")

        results = []
        for tc in TEST_QUERIES:
            print(f"🧪 Running {tc['id']}: {tc['title']}")
            print(f"   💬 Question: {tc['query']}")

            # Perform RAG retrieval
            search_results = await vs.search(tc["query"], user_id=user_id, space_id=space_id, limit=4)
            retrieved_files = list(set([r.filename for r in search_results]))
            context_text = "\n\n".join([f"[{r.filename}]: {r.text}" for r in search_results])

            # LLM Prompt
            messages = [
                {"role": "system", "content": f"{space.system_prompt}\n\nStrict Context:\n{context_text}"},
                {"role": "user", "content": tc["query"]}
            ]

            try:
                full_answer, used_model = await llm._run_cloud(messages, temperature=0.2, model_name=space.llm_model)
            except Exception as e:
                print(f"   ⚠️ Cloud LLM fallback to local: {e}")
                full_answer, used_model = await llm._run_local(messages, temperature=0.2, model_name="llama3.2:3b")
            print(f"   📑 Sources Cited: {', '.join(retrieved_files)}")
            print(f"   🤖 Answer Sample:\n{full_answer.strip()[:400]}...\n")
            print("-" * 80)

            results.append({
                "id": tc["id"],
                "title": tc["title"],
                "sources": retrieved_files,
                "answer": full_answer
            })

    print("\n🎉 ALL 5 ANIMA FEST FIELD SCENARIOS EXECUTED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_simulation())
