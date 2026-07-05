import asyncio
from pypdf import PdfReader
import io

from models.document import Document, DocumentStatus, DocumentChunk
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
            elif filename.lower().endswith('.pptx'):
                from pptx import Presentation
                prs = Presentation(io.BytesIO(file_bytes))
                slide_texts = []
                for i, slide in enumerate(prs.slides):
                    slide_parts = [f"--- Slide {i+1} ---"]
                    
                    # 1. Extract text from shapes
                    for shape in slide.shapes:
                        if shape.has_text_frame:
                            for paragraph in shape.text_frame.paragraphs:
                                if paragraph.text.strip():
                                    slide_parts.append(paragraph.text.strip())
                                    
                        # 2. Extract text from tables
                        if shape.has_table:
                            table = shape.table
                            table_data = []
                            for row in table.rows:
                                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                                if row_cells:
                                    table_data.append(" | ".join(row_cells))
                            if table_data:
                                slide_parts.append("\n".join(table_data))
                                
                    # 3. Extract speaker notes
                    try:
                        notes_slide = slide.notes_slide
                        if notes_slide and notes_slide.notes_text_frame:
                            notes_text = notes_slide.notes_text_frame.text.strip()
                            if notes_text:
                                slide_parts.append(f"Speaker Notes:\n{notes_text}")
                    except Exception:
                        pass
                    
                    slide_texts.append("\n".join(slide_parts))
                text = "\n\n".join(slide_texts)
            else:
                try:
                    text = file_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    raise ValueError("Unsupported binary file format. Only PDF, PPTX, and UTF-8 text files are supported.")

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

            if not chunks:
                raise ValueError("No extractable text found in file. Make sure it contains digital text (not a scanned image).")

            # Save chunks to PostgreSQL/SQLite for hybrid search
            for idx, chunk_text in enumerate(chunks):
                db_chunk = DocumentChunk(
                    document_id=doc_id,
                    user_id=user_id,
                    content=chunk_text,
                    chunk_index=idx
                )
                session.add(db_chunk)
            await session.commit()

            # Generate AI Executive Briefing / Summary for this document
            try:
                from services.llm_service import llm_service
                summary_input = "\n\n".join(chunks[:3])
                summary_prompt = f"""
You are Vectrieve Core, a premium business document intelligence analyzer.
Provide a highly structured, polished, and extremely concise Executive Briefing for this document in English.
Outline:
1. Document Category (e.g. Resume/CV, SLA, NDA, Corporate Guideline, FAQ, Research)
2. High-level Summary (1-2 sentences)
3. Key Takeaways or Highlighted Skills (bullet points)
4. Key Risks, Warnings, or Compliance Issues (bullet points or "None")

Format headings clearly as bold text like **Document Category:** or **Key Takeaways:**. Use standard bullet points. Keep it professional.

Document Sample:
"{summary_input}"
"""
                from models.schemas import QueryRequest, ChatMessage
                fake_req = QueryRequest(
                    messages=[ChatMessage(role="user", content=summary_prompt)],
                    thinking_mode="auditor",
                    mode="cloud"
                )
                
                # Check if cloud is available
                if not llm_service.groq_client:
                    fake_req.mode = "local"
                    # Try to retrieve selected model from localStorage is not possible in background python thread,
                    # so llm_service will default to its base local model or qwen2.5-coder:7b.
                
                summary_text, _ = await llm_service.generate_response(fake_req, "")
                if summary_text:
                    doc.summary = summary_text.strip()
                    session.add(doc)
                    await session.commit()
            except Exception as sum_err:
                print(f"⚠️ Failed to generate AI document summary: {sum_err}")

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