import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import asyncio
from pathlib import Path

# Setup paths so we can import models/services
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "app-backend"))

from core.database import get_session_factory
from sqlmodel import select
from models.document import Document, DocumentChunk
from services.vector_service import get_vector_service

async def main():
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Check docs in DB
        res = await session.execute(select(Document))
        docs = res.scalars().all()
        print(f"--- Documents in DB: {len(docs)} ---")
        for d in docs:
            print(f"ID: {d.id}, Filename: {d.filename}, Status: {d.status}, Chunks: {d.chunk_count}")

        # Check chunks
        res_chunks = await session.execute(select(DocumentChunk).limit(10))
        chunks = res_chunks.scalars().all()
        print(f"\n--- Sample Chunks in DB: {len(chunks)} ---")
        for c in chunks:
            print(f"Doc ID: {c.document_id}, Index: {c.chunk_index}, Length: {len(c.content)}")

    # Check Qdrant connection
    print("\n--- Connecting to Vector Service ---")
    vs = get_vector_service()
    if vs:
        print("Vector Service connected successfully!")
        print(f"Collection: {vs.collection_name}, Size: {vs.vector_size}")
        # Try a dummy search
        print("\n--- Running Dummy Vector Search ---")
        try:
            results = await vs.search(query="test", user_id=1, limit=5)
            print(f"Search results count: {len(results)}")
            for r in results:
                print(f"Score: {r['score']:.4f}, File: {r['filename']}, Text: {r['text'][:60]}...")
        except Exception as e:
            print(f"Search failed: {e}")
    else:
        print("Vector Service could not initialize!")

if __name__ == "__main__":
    asyncio.run(main())
