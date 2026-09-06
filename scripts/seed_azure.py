import asyncio
import os
import sys
import uuid
from pathlib import Path
from sqlmodel import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, "/app/app")
sys.path.insert(0, "/app")
sys.path.insert(0, os.path.abspath("backend/app"))
sys.path.insert(0, os.path.abspath("backend"))

from models.user import User
from models.sql_models import Space, SpaceMember, SpaceRole
from models.user_settings import UserSettings
from models.document import Document, DocumentStatus, DocumentChunk
from core.security import get_password_hash
from services.pdf_parser import process_pdf_background

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

ACCOUNTS = [
    {"email": "pepryk.stas@gmail.com", "is_admin": True},
    {"email": "info@animafestexperience.com", "is_admin": False},
    {"email": "animafestexperience@gmail.com", "is_admin": False},
    {"email": "stanislavspace06@gmail.com", "is_admin": False},
]

DEFAULT_PASSWORD = "Animafest2026!"

async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        created_users = {}
        for acc in ACCOUNTS:
            email = acc["email"]
            res = await session.execute(select(User).where(User.username == email))
            user = res.scalar_one_or_none()
            if not user:
                hashed_pw = await get_password_hash(DEFAULT_PASSWORD)
                user = User(
                    username=email,
                    hashed_password=hashed_pw,
                    is_active=True,
                    is_admin=acc["is_admin"],
                    is_approved=True
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                print(f"✓ Created user: {email} (ID: {user.id}, Admin: {user.is_admin})")
            else:
                user.is_approved = True
                user.is_active = True
                if acc["is_admin"]:
                    user.is_admin = True
                session.add(user)
                await session.commit()
                print(f"✓ User already exists: {email} (ID: {user.id})")
            created_users[email] = user

            # Ensure user settings
            s_res = await session.execute(select(UserSettings).where(UserSettings.user_id == user.id))
            settings = s_res.scalar_one_or_none()
            if not settings:
                settings = UserSettings(user_id=user.id)
                session.add(settings)
                await session.commit()

        # Create Centralized Space under info@animafestexperience.com
        primary_owner = created_users["info@animafestexperience.com"]
        sp_res = await session.execute(select(Space).where(Space.name == "Animafest Knowledge Base"))
        space = sp_res.scalar_one_or_none()
        if not space:
            space = Space(
                id=str(uuid.uuid4()),
                name="Animafest Knowledge Base",
                user_id=primary_owner.id,
                system_prompt=ANIMAFEST_SYSTEM_PROMPT
            )
            session.add(space)
            await session.commit()
            await session.refresh(space)
            print(f"✓ Created central space: {space.name} (ID: {space.id})")
        else:
            space.system_prompt = ANIMAFEST_SYSTEM_PROMPT
            session.add(space)
            await session.commit()
            print(f"✓ Using existing space: {space.name} (ID: {space.id})")

        # Grant OWNER to all accounts
        for email, u in created_users.items():
            m_res = await session.execute(
                select(SpaceMember).where(SpaceMember.space_id == space.id, SpaceMember.user_id == u.id)
            )
            member = m_res.scalar_one_or_none()
            if not member:
                member = SpaceMember(
                    space_id=space.id,
                    user_id=u.id,
                    role=SpaceRole.OWNER
                )
                session.add(member)
                await session.commit()
                print(f"  + Granted OWNER to {email}")

        # Ingest documents from animafest_knowledge_base
        kb_dir = Path("animafest_knowledge_base")
        if not kb_dir.exists():
            kb_dir = Path("/app/animafest_knowledge_base")

        if not kb_dir.exists():
            print(f"⚠️ KB dir not found: {kb_dir}")
            return

        # Clean up any partial documents in space
        existing_doc_ids_res = await session.execute(select(Document.id).where(Document.space_id == space.id))
        existing_doc_ids = existing_doc_ids_res.scalars().all()
        if existing_doc_ids:
            await session.execute(delete(DocumentChunk).where(DocumentChunk.document_id.in_(existing_doc_ids)))
            await session.execute(delete(Document).where(Document.space_id == space.id))
            await session.commit()
            print(f"  * Cleaned up {len(existing_doc_ids)} previous documents for fresh re-index.")

        files = sorted(list(kb_dir.glob("*.md")))
        print(f"\n📚 Ingesting {len(files)} knowledge base documents into space {space.id}:")

        for fpath in files:
            filename = fpath.name
            size = fpath.stat().st_size
            doc = Document(
                filename=filename,
                user_id=primary_owner.id,
                space_id=space.id,
                file_size=size,
                status=DocumentStatus.PROCESSING
            )
            session.add(doc)
            await session.commit()
            await session.refresh(doc)

            print(f"  -> Processing {filename} ({size / 1024:.1f} KB)...")
            await process_pdf_background(
                doc_id=doc.id,
                tmp_path=fpath,
                filename=filename,
                user_id=primary_owner.id,
                space_id=space.id
            )
            print(f"     ✓ {filename} indexed in PostgreSQL + Qdrant.")

    print("\n🎉 Seed and full data synchronization complete!")

if __name__ == "__main__":
    asyncio.run(seed())
