import asyncio
import os
import sys
import uuid
from pathlib import Path
from sqlmodel import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath("backend/app"))
sys.path.insert(0, os.path.abspath("backend"))

from models.user import User
from models.sql_models import Space, SpaceMember, SpaceRole
from models.user_settings import UserSettings
from models.document import Document, DocumentStatus
from services.pdf_parser import process_pdf_background
from services.vector_service import vector_service

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://vectrieve:vectrieve_password@localhost:5432/vectrievedb")

ANIMAFEST_SYSTEM_PROMPT = """You are the internal Animafest Experience Operations & Support Copilot.

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

ANIMAFEST_EMAILS = [
    "info@animafestexperience.com",
    "animafestexperience@gmail.com"
]

MONITOR_EMAILS = [
    "pepryk.stas@gmail.com",
    "pepryks@gmail.com"
]

async def sync_animafest_accounts():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    kb_dir = Path("animafest_knowledge_base")
    if not kb_dir.exists():
        kb_dir = Path("/app/animafest_knowledge_base")
    if not kb_dir.exists():
        print(f"ERROR: Directory {kb_dir} not found!")
        return

    files_to_ingest = sorted(list(kb_dir.glob("*.md")))
    print(f"Found {len(files_to_ingest)} files in {kb_dir}")

    async with async_session() as session:
        # Resolve monitor users (Stas accounts)
        monitor_user_ids = []
        for m_email in MONITOR_EMAILS:
            m_res = await session.execute(select(User).where(User.username == m_email))
            m_user = m_res.scalar_one_or_none()
            if m_user:
                monitor_user_ids.append(m_user.id)

        # Fetch existing shared Groq API key from user_settings (user 15, 18, or env)
        key_res = await session.execute(select(UserSettings.groq_api_key).where(UserSettings.groq_api_key.is_not(None)))
        shared_key = key_res.scalars().first() or os.getenv("GROQ_API_KEY", "")

        for email in ANIMAFEST_EMAILS:
            print(f"\n==================================================")
            print(f"🚀 Processing account: {email}")
            print(f"==================================================")

            u_res = await session.execute(select(User).where(User.username == email))
            user = u_res.scalar_one_or_none()
            if not user:
                print(f"⚠️ User {email} not found in database. Skipping.")
                continue

            user_id = user.id
            print(f"User ID: {user_id}")

            # 1. Sync UserSettings with shared Groq API key
            us_res = await session.execute(select(UserSettings).where(UserSettings.user_id == user_id))
            user_settings = us_res.scalar_one_or_none()
            if not user_settings:
                user_settings = UserSettings(user_id=user_id, groq_api_key=shared_key)
                session.add(user_settings)
            else:
                if shared_key and not user_settings.groq_api_key:
                    user_settings.groq_api_key = shared_key
                    session.add(user_settings)
            await session.commit()
            print(f"✓ Groq API Key synchronized.")

            # 2. Find or create the standard Animafest Space
            sp_res = await session.execute(select(Space).where(Space.user_id == user_id, Space.name == "Animafest Knowledge Base"))
            space = sp_res.scalar_one_or_none()

            if not space:
                space = Space(
                    id=str(uuid.uuid4()),
                    name="Animafest Knowledge Base",
                    user_id=user_id,
                    system_prompt=ANIMAFEST_SYSTEM_PROMPT
                )
                session.add(space)
                await session.commit()
                await session.refresh(space)
                print(f"✓ Created Space 'Animafest Knowledge Base' (ID: {space.id})")
            else:
                space.system_prompt = ANIMAFEST_SYSTEM_PROMPT
                session.add(space)
                await session.commit()
                print(f"✓ Updated system_prompt for existing Space (ID: {space.id})")

            space_id = space.id

            # 3. Ensure SpaceMember records (Owner + Stas accounts)
            all_owners = [user_id] + monitor_user_ids
            for uid in all_owners:
                mem_res = await session.execute(select(SpaceMember).where(
                    SpaceMember.space_id == space_id,
                    SpaceMember.user_id == uid
                ))
                if not mem_res.scalar_one_or_none():
                    session.add(SpaceMember(
                        space_id=space_id,
                        user_id=uid,
                        role=SpaceRole.OWNER
                    ))
            await session.commit()
            print(f"✓ Space permissions and sharing granted.")

            # 4. Clean up any obsolete/old documents for this user & space
            old_docs_res = await session.execute(select(Document).where(
                Document.user_id == user_id,
                Document.space_id == space_id
            ))
            existing_docs = old_docs_res.scalars().all()
            valid_filenames = {f.name for f in files_to_ingest}

            for old_doc in existing_docs:
                if old_doc.filename not in valid_filenames:
                    print(f"  🗑️ Removing obsolete document: {old_doc.filename}")
                    vector_service.delete_file(old_doc.filename, user_id=user_id, space_id=space_id)
                    await session.delete(old_doc)
            await session.commit()

            # 5. Ingest / Index all 6 fresh knowledge base files
            for fpath in files_to_ingest:
                filename = fpath.name
                file_size = fpath.stat().st_size

                doc_res = await session.execute(select(Document).where(
                    Document.user_id == user_id,
                    Document.space_id == space_id,
                    Document.filename == filename
                ))
                doc = doc_res.scalar_one_or_none()

                if not doc:
                    doc = Document(
                        filename=filename,
                        user_id=user_id,
                        space_id=space_id,
                        file_size=file_size,
                        status=DocumentStatus.PROCESSING
                    )
                    session.add(doc)
                    await session.commit()
                    await session.refresh(doc)
                    print(f"  📥 Indexing new file: {filename} ({file_size/1024:.1f} KB)...")
                    await process_pdf_background(
                        doc_id=doc.id,
                        tmp_path=fpath,
                        filename=filename,
                        user_id=user_id,
                        space_id=space_id
                    )
                    print(f"    ✓ {filename} indexed successfully.")
                else:
                    if doc.status != DocumentStatus.COMPLETED:
                        print(f"  🔄 Re-indexing: {filename} ({file_size/1024:.1f} KB)...")
                        await process_pdf_background(
                            doc_id=doc.id,
                            tmp_path=fpath,
                            filename=filename,
                            user_id=user_id,
                            space_id=space_id
                        )
                        print(f"    ✓ {filename} re-indexed successfully.")
                    else:
                        print(f"  ✓ {filename} is up to date (Completed).")

    print("\n==================================================")
    print("🎉 ALL ANIMAFEST ACCOUNTS FULLY SYNCHRONIZED & READY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(sync_animafest_accounts())
