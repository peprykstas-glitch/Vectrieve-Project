import asyncio
from pypdf import PdfReader
import io

from models.document import Document, DocumentStatus
from core.database import get_session_factory


async def process_pdf_background(doc_id: int, file_bytes: bytes, filename: str, user_id: int) -> None:
    session_factory = get_session_factory()
    from services.ws_manager import manager
    
    async def send_ws(status_val: str, error_msg: str = None, chunk_count: int = None, file_size: int = None):
        payload = {"type": "file_status", "doc_id": doc_id, "status": status_val}
        if error_msg:
            payload["error"] = error_msg
        if chunk_count is not None:
            payload["chunk_count"] = chunk_count
        if file_size is not None:
            payload["file_size"] = file_size
        await manager.send_personal_message(payload, user_id)

    async with session_factory() as session:
        try:
            from sqlmodel import select
            stmt = select(Document).where(Document.id == doc_id)
            result = await session.execute(stmt)
            doc = result.scalar_one_or_none()
            if not doc:
                return

            doc.status = DocumentStatus.PROCESSING.value
            await session.commit()
            await send_ws(DocumentStatus.PROCESSING.value)

            # Extract text based on file type
            text = ""
            if filename.lower().endswith('.pdf'):
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            else:
                try:
                    text = file_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    raise ValueError("Unsupported binary file format. Only PDF and UTF-8 text files are supported.")

            # Smarter chunking using Langchain's RecursiveCharacterTextSplitter
            chunks = []
            if text:
                from langchain_text_splitters import RecursiveCharacterTextSplitter
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200,
                    separators=["\n\n", "\n", " ", ""]
                )
                chunks = splitter.split_text(text)

            # Upsert to vector DB if available
            try:
                from services.vector_service import get_vector_service
                vs = get_vector_service()
                if vs and chunks:
                    # Notify UI we are entering the slow embedding phase
                    await send_ws("EMBEDDING")
                    await vs.upsert_batch(chunks, filename, user_id)
            except Exception as e:
                print(f"⚠️ Vector upsert failed: {e}")
                raise RuntimeError(f"Vector upsert failed: {e}")

            doc.status = DocumentStatus.COMPLETED.value
            doc.chunk_count = len(chunks) if chunks else 0
            await session.commit()
            await send_ws(DocumentStatus.COMPLETED.value, chunk_count=doc.chunk_count, file_size=doc.file_size)

        except Exception as e:
            await session.rollback()

            stmt = select(Document).where(Document.id == doc_id)
            result = await session.execute(stmt)
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = DocumentStatus.FAILED.value
                doc.error_log = str(e)
                await session.commit()
                await send_ws(DocumentStatus.FAILED.value, str(e))