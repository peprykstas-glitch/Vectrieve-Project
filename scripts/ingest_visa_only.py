"""
Ingest ONLY visa_nie_and_residence.md into the Animafest Knowledge Base space.
This script handles the large file by using the standard process_pdf_background.
Run inside vectrieve-backend container.
"""
import asyncio
import os
import sys
from pathlib import Path
from sqlmodel import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, "/app/app")
sys.path.insert(0, "/app")

from models.user import User
from models.sql_models import Space
from models.document import Document, DocumentStatus, DocumentChunk
from services.pdf_parser import process_pdf_background

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://vectrieve:vectrieve_password@localhost:5432/vectrievedb")

async def ingest_visa():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Find admin user
        res = await session.execute(select(User).where(User.username == "pepryk.stas@gmail.com"))
        admin = res.scalar_one()
        print(f"Admin user: {admin.username} (ID: {admin.id})")

        # Find space
        sp_res = await session.execute(select(Space).where(Space.name == "Animafest Knowledge Base"))
        space = sp_res.scalar_one()
        print(f"Space: {space.name} (ID: {space.id})")

        # Find the file
        kb_dir = Path("/app/animafest_knowledge_base")
        fpath = kb_dir / "visa_nie_and_residence.md"
        if not fpath.exists():
            print(f"ERROR: File not found: {fpath}")
            return

        size = fpath.stat().st_size
        print(f"File: {fpath.name} ({size / 1024:.1f} KB)")

        # Create document record
        doc = Document(
            filename=fpath.name,
            user_id=admin.id,
            space_id=space.id,
            file_size=size,
            status=DocumentStatus.PROCESSING
        )
        session.add(doc)
        await session.commit()
        await session.refresh(doc)
        print(f"Document record created (ID: {doc.id})")

        print(f"Starting ingestion...")
        await process_pdf_background(
            doc_id=doc.id,
            tmp_path=fpath,
            filename=fpath.name,
            user_id=admin.id,
            space_id=space.id
        )
        print(f"✓ visa_nie_and_residence.md indexed successfully!")

    print("\n🎉 Done!")

if __name__ == "__main__":
    asyncio.run(ingest_visa())
