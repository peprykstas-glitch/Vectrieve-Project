import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import edge_tts
from sqlmodel import select
from typing import List, Optional
from pydantic import BaseModel

from models.user import User
from models.document import Document, DocumentChunk
from core.database import get_session
from api.deps import get_current_user
from services.llm_service import llm_service

router = APIRouter()

class PodcastRequest(BaseModel):
    language: str = "uk"  # "uk" or "en"
    document_id: Optional[int] = None
    session_id: Optional[str] = None

class PodcastTurn(BaseModel):
    host: str
    text: str

class PodcastResponse(BaseModel):
    title: str
    transcript: List[PodcastTurn]

@router.post("/generate", response_model=PodcastResponse)
async def generate_podcast(
    request: PodcastRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an engaging podcast script (audio summary dialogue) between Max and Julia
    summarizing a document OR the active chat session conversation.
    """
    lang_name = "Ukrainian" if request.language == "uk" else "English"
    title = "Audio Briefing"
    
    try:
        # 1. Summarize Chat Session
        if request.session_id:
            from models.sql_models import ChatHistory
            stmt = (
                select(ChatHistory)
                .where(ChatHistory.session_id == request.session_id)
                .where(ChatHistory.user_id == current_user.id)
                .order_by(ChatHistory.timestamp.asc())
            )
            result = await session.execute(stmt)
            messages_list = result.scalars().all()
            
            if not messages_list:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No conversation history found for this session."
                )
                
            transcript_lines = []
            for msg in messages_list:
                role_label = "Користувач" if msg.role == "user" else "Асистент"
                transcript_lines.append(f"{role_label}: {msg.content}")
                
            context_str = "\n".join(transcript_lines)
            title = f"Chat Overview (Session: {request.session_id[:8]})"
            
            prompt = f"""
You are a professional Podcast Producer for Vectrieve Core.
Based on the conversation transcript between the User and the AI Assistant below, generate a highly engaging, natural, and entertaining dialogue transcript between two podcast hosts:
- Max (a realistic, seasoned, and slightly cynical male host)
- Julia (a warm, smart, and detail-oriented female host)

The hosts should discuss what the user and the assistant talked about, explain the core questions asked, review the AI's answers, debate any interesting details, and present it in a highly engaging radio/podcast style.
They should refer to each other by name, use conversational interjections, and sound like a real recorded podcast episode.

CRITICAL: Generate the dialogue script in the language: {lang_name}.
- If language is Ukrainian, write the dialogue in highly natural, grammatically correct Ukrainian.
- If language is English, write it in English.

Important for Voice Synthesis (to sound like ElevenLabs / real humans):
- Write the dialogue using natural speech patterns: short sentences, frequent pauses represented by ellipsis (...), dashes, and commas.
- Include emotional interjections: "Oh, absolutely!", "Well, actually...", "Hmm...", "Right?", "Wow!", "Let me check...", "Aha!".
- This is critical because the script is processed by a neural TTS engine. Punctuation determines the speaker's intonation and pauses.

Conversation transcript to discuss:
---
{context_str}
---

Respond ONLY with a raw JSON list of objects, for example:
[
  {{"host": "Max", "text": "Wow... that was a really interesting chat between them, Julia."}},
  {{"host": "Julia", "text": "Oh, absolutely, Max! The user was asking about..."}}
]
Do not add any markdown formatting, backticks, or extra text.
"""
        
        # 2. Summarize Document (Specific ID or Latest Completed)
        else:
            doc = None
            if request.document_id:
                stmt = (
                    select(Document)
                    .where(Document.id == request.document_id)
                    .where(Document.user_id == current_user.id)
                )
                result = await session.execute(stmt)
                doc = result.scalar_one_or_none()
            
            if not doc:
                stmt = (
                    select(Document)
                    .where(Document.user_id == current_user.id)
                    .where(Document.status == "COMPLETED")
                    .order_by(Document.upload_timestamp.desc())
                    .limit(1)
                )
                result = await session.execute(stmt)
                doc = result.scalar_one_or_none()
                
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No completed documents found. Please upload a file first."
                )
                
            stmt_chunks = (
                select(DocumentChunk)
                .where(DocumentChunk.document_id == doc.id)
                .order_by(DocumentChunk.chunk_index.asc())
                .limit(15)
            )
            result_chunks = await session.execute(stmt_chunks)
            chunks = result_chunks.scalars().all()
            
            if not chunks:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Selected document contains no text chunks."
                )
                
            context_str = "\n\n".join([f"[Segment {c.chunk_index}]: {c.content}" for c in chunks])
            title = f"Audio Overview: {doc.filename}"
            
            prompt = f"""
You are a professional Podcast Producer for Vectrieve Core.
Based on the text content of the uploaded document segments below, generate a highly engaging, natural, and entertaining dialogue transcript between two podcast hosts:
- Max (a realistic, seasoned, and slightly cynical male host)
- Julia (a warm, smart, and detail-oriented female host)

The hosts should discuss the document's content, explain the core concepts, debate key findings, and present it in a highly engaging radio/podcast style.
They should refer to each other by name, use conversational interjections, and sound like a real recorded podcast episode.

CRITICAL: Generate the dialogue script in the language: {lang_name}.
- If language is Ukrainian, write the dialogue in highly natural, grammatically correct Ukrainian.
- If language is English, write it in English.

Important for Voice Synthesis (to sound like ElevenLabs / real humans):
- Write the dialogue using natural speech patterns: short sentences, frequent pauses represented by ellipsis (...), dashes, and commas.
- Include emotional interjections: "Oh, absolutely!", "Well, actually...", "Hmm...", "Right?", "Wow!", "Let me check...", "Aha!".
- This is critical because the script is processed by a neural TTS engine. Punctuation determines the speaker's intonation and pauses.

Context document content:
---
{context_str}
---

Respond ONLY with a raw JSON list of objects, for example:
[
  {{"host": "Max", "text": "Okay... so what are we looking at today, Julia?"}},
  {{"host": "Julia", "text": "Well, Max, this document is a summary of..."}}
]
Do not add any markdown formatting, backticks, or extra text.
"""
        
        messages = [{"role": "user", "content": prompt}]
        
        if llm_service.groq_client:
            completion = await llm_service.groq_client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                temperature=0.8,
                max_tokens=2048,
            )
            response_text = completion.choices[0].message.content.strip()
        else:
            response_text, _ = await llm_service._run_local(messages, temperature=0.8)
            
        text = response_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        transcript_data = json.loads(text)
        if not isinstance(transcript_data, list):
            raise ValueError("LLM did not return a list of turns.")
            
        validated_transcript = []
        for turn in transcript_data:
            if isinstance(turn, dict) and "host" in turn and "text" in turn:
                validated_transcript.append({
                    "host": str(turn["host"]),
                    "text": str(turn["text"])
                })
                
        return PodcastResponse(title=title, transcript=validated_transcript)
        
    except Exception as e:
        print(f"Error generating podcast script: {e}")
        fallback_transcript = [
            {"host": "Max", "text": "Welcome to Vectrieve Audio Briefing. It seems we had an error generating the live transcript." if request.language == "en" else "Вітаємо в аудіо-брифінгу Vectrieve. Схоже, сталася помилка генерації транскрипту."},
            {"host": "Julia", "text": "That's correct, Max. Please make sure the service is online and try again in a moment." if request.language == "en" else "Саме так, Максе. Будь ласка, переконайтеся, що сервіс працює, та спробуйте ще раз через мить."}
        ]
        return PodcastResponse(title="Audio Briefing Fallback", transcript=fallback_transcript)

@router.get("/audio")
async def get_podcast_audio(text: str, host: str, language: str):
    """
    Synthesize text into a studio-quality neural voice stream.
    """
    is_max = host.lower() == "max"
    is_uk = language.lower() == "uk"
    
    if is_uk:
        voice = "uk-UA-OstapNeural" if is_max else "uk-UA-PolinaNeural"
    else:
        # Jenny is extremely realistic, conversational and emotional
        voice = "en-US-GuyNeural" if is_max else "en-US-JennyNeural"
        
    try:
        communicate = edge_tts.Communicate(text, voice)
        
        async def audio_generator():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
                    
        return StreamingResponse(audio_generator(), media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
