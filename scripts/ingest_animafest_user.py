import asyncio
import os
import sys
import uuid
from pathlib import Path
from sqlmodel import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add app to path if running inside backend or root
sys.path.insert(0, os.path.abspath("backend/app"))
sys.path.insert(0, os.path.abspath("backend"))

from models.user import User
from models.sql_models import Space, SpaceMember, SpaceRole
from models.document import Document, DocumentStatus
from services.pdf_parser import process_pdf_background

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://vectrieve:vectrieve_password@localhost:5432/vectrievedb")

ANIMAFEST_SYSTEM_PROMPT = """You are the official Animafest Experience AI Customer Support & Operations Assistant.
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
```
3. Tone: Professional, clear, supportive, and compliant with Spanish internship immigration regulations (89 days vs 179 days, EX-04, NIE, criminal records with apostille & official translation)."""

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Find user animafestexperience@gmail.com
        stmt = select(User).where(User.username == "animafestexperience@gmail.com")
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            print("User animafestexperience@gmail.com not found!")
            return

        print(f"Found user: {user.username} (ID: {user.id})")

        # Find or create Animafest Space
        space_stmt = select(Space).where(Space.user_id == user.id, Space.name == "Animafest Knowledge Base")
        s_res = await session.execute(space_stmt)
        space = s_res.scalar_one_or_none()

        if not space:
            space_id = str(uuid.uuid4())
            space = Space(
                id=space_id,
                name="Animafest Knowledge Base",
                user_id=user.id,
                system_prompt=ANIMAFEST_SYSTEM_PROMPT
            )
            session.add(space)
            await session.commit()
            await session.refresh(space)

            # Add SpaceMember as OWNER
            member = SpaceMember(
                space_id=space.id,
                user_id=user.id,
                role=SpaceRole.OWNER
            )
            session.add(member)
            await session.commit()
            print(f"Created space: {space.name} (ID: {space.id})")
        else:
            space.system_prompt = ANIMAFEST_SYSTEM_PROMPT
            session.add(space)
            await session.commit()
            print(f"Using existing space: {space.name} (ID: {space.id}) with updated system prompt.")

        # Ingest files from animafest_knowledge_base
        kb_dir = Path("animafest_knowledge_base")
        if not kb_dir.exists():
            kb_dir = Path("/app/animafest_knowledge_base")

        if not kb_dir.exists():
            print(f"Knowledge base directory not found: {kb_dir}")
            return

        files_to_ingest = list(kb_dir.glob("*.md"))
        print(f"Found {len(files_to_ingest)} files to ingest into space {space.id}:")

        for fpath in files_to_ingest:
            filename = fpath.name
            file_size = fpath.stat().st_size

            # Check if document already exists
            doc_stmt = select(Document).where(
                Document.user_id == user.id,
                Document.space_id == space.id,
                Document.filename == filename
            )
            d_res = await session.execute(doc_stmt)
            existing_doc = d_res.scalar_one_or_none()

            if existing_doc:
                doc = existing_doc
                doc.status = DocumentStatus.PROCESSING
                doc.file_size = file_size
            else:
                doc = Document(
                    filename=filename,
                    user_id=user.id,
                    space_id=space.id,
                    file_size=file_size,
                    status=DocumentStatus.PROCESSING
                )
                session.add(doc)
                await session.commit()
                await session.refresh(doc)

            print(f" - Ingesting {filename} (Doc ID: {doc.id}, {file_size/1024:.1f} KB)...")
            
            # Process synchronously for script reliability
            await process_pdf_background(
                doc_id=doc.id,
                tmp_path=fpath,
                filename=filename,
                user_id=user.id,
                space_id=space.id
            )
            print(f"   ✓ {filename} indexed successfully.")

    print("\n🎉 All Animafest knowledge base documents indexed and ready!")

if __name__ == "__main__":
    asyncio.run(main())
