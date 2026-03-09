"""Speech-to-Text service using Groq Whisper + AI text correction.

Pipeline: Audio → Whisper STT → LLM fix Thai text → clean output.
Uses Groq free tier for both Whisper and LLM.
"""

import base64
import io
import logging
import os

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
STT_MODEL = "whisper-large-v3"  # Most accurate Whisper model
LLM_MODEL = "llama-3.1-8b-instant"  # Fast free LLM for text correction

_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import AsyncOpenAI
        _client = AsyncOpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            max_retries=1,
            timeout=30.0,
        )
        logger.info("STT: Groq client ready (stt=%s, llm=%s)", STT_MODEL, LLM_MODEL)
    return _client


# MIME type -> file extension mapping (covers all mobile platforms)
MIME_EXT_MAP = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mp4": ".mp4",
    "audio/m4a": ".m4a",
    "audio/aac": ".aac",
    "audio/wav": ".wav",
    "audio/wave": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/x-m4a": ".m4a",
    "audio/x-wav": ".wav",
    "audio/3gpp": ".3gp",
    "audio/3gpp2": ".3g2",
    "audio/amr": ".amr",
    "video/mp4": ".mp4",
}


def _detect_audio_ext(data_uri_header: str | None) -> str:
    """Detect file extension from data URI header."""
    if not data_uri_header:
        return ".webm"
    try:
        mime_part = data_uri_header.replace("data:", "").split(";")[0]
        return MIME_EXT_MAP.get(mime_part, ".webm")
    except Exception:
        return ".webm"


async def _fix_thai_text(raw_text: str) -> str:
    """Use LLM to fix STT errors in Thai text."""
    if not raw_text or len(raw_text) < 3:
        return raw_text

    try:
        client = _get_client()
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            temperature=0.1,
            max_tokens=500,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "คุณเป็นผู้เชี่ยวชาญแก้ไขข้อความภาษาไทยที่ถอดเสียงจาก Speech-to-Text\n"
                        "หน้าที่: แก้คำผิด สะกดผิด คำที่ฟังผิด ให้เป็นภาษาไทยที่ถูกต้องเข้าใจง่าย\n"
                        "กฎ:\n"
                        "- ตอบเฉพาะข้อความที่แก้แล้วเท่านั้น ห้ามเพิ่มคำอธิบาย\n"
                        "- ถ้าข้อความถูกต้องอยู่แล้ว ให้ตอบข้อความเดิม\n"
                        "- รักษาความหมายเดิมไว้ ห้ามเปลี่ยนเนื้อหา\n"
                        "- ถ้ามีคำที่ไม่ใช่ภาษาไทยปนมา ให้แปลงเป็นภาษาไทยที่เหมาะสม\n"
                        "- บริบท: นี่คือการแจ้งเหตุฉุกเฉิน อาจมีคำเกี่ยวกับอุบัติเหตุ ไฟไหม้ เจ็บป่วย"
                    ),
                },
                {"role": "user", "content": raw_text},
            ],
        )
        fixed = resp.choices[0].message.content.strip()
        if fixed and len(fixed) >= 2:
            logger.info("AI fix: '%s' → '%s'", raw_text[:100], fixed[:100])
            return fixed
    except Exception as exc:
        logger.warning("AI text fix failed: %s", exc)

    return raw_text  # Return original if AI fix fails


async def transcribe_audio(audio_base64: str) -> str:
    """Decode base64 audio → Whisper STT → AI fix Thai text."""
    if not audio_base64:
        return ""

    if not GROQ_API_KEY:
        logger.error("STT: GROQ_API_KEY not set")
        return ""

    # Detect MIME type from data URI header before stripping it
    data_uri_header = None
    if "," in audio_base64:
        data_uri_header = audio_base64.split(",", 1)[0]
        audio_base64 = audio_base64.split(",", 1)[1]

    ext = _detect_audio_ext(data_uri_header)

    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception:
        logger.warning("Invalid base64 audio data")
        return ""

    logger.info("STT: audio %d bytes, format=%s", len(audio_bytes), ext)

    client = _get_client()

    # Try original format first, then retry as .wav if it fails
    for attempt_ext in [ext, ".wav"] if ext != ".wav" else [ext]:
        try:
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = f"audio{attempt_ext}"

            transcription = await client.audio.transcriptions.create(
                model=STT_MODEL,
                file=audio_file,
                language="th",
                prompt="สวัสดีครับ นี่คือการแจ้งเหตุฉุกเฉิน มีคนเจ็บ รถชน ไฟไหม้",
            )
            raw_text = transcription.text.strip()
            if raw_text:
                logger.info("STT raw: %d chars (format=%s) text=%s", len(raw_text), attempt_ext, raw_text[:200])
                # AI fix Thai text
                fixed_text = await _fix_thai_text(raw_text)
                return fixed_text
            logger.warning("STT empty (format=%s)", attempt_ext)
        except Exception as exc:
            logger.warning("STT failed (format=%s): %s", attempt_ext, exc)

    logger.error("All STT attempts failed")
    return ""
