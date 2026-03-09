"""Speech-to-Text service using Groq Whisper API (free, fast, high-quality).

Uses OpenAI AsyncOpenAI SDK with max_retries=0 to avoid retry-loop timeout
on Vercel serverless.
"""

import base64
import io
import logging
import os

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Groq Whisper (free) – fallback to KKU if GROQ key not set
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
STT_MODEL = os.environ.get("STT_MODEL", "whisper-large-v3-turbo")

# Fallback: KKU endpoint
_KKU_API_KEY = os.environ.get("API_KEY", "").strip()
_KKU_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://gen.ai.kku.ac.th/api/v1")

_groq_client = None
_kku_client = None


def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        from openai import AsyncOpenAI
        _groq_client = AsyncOpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            max_retries=0,
            timeout=30.0,
        )
        logger.info("STT: Groq client initialized (%s)", STT_MODEL)
    return _groq_client


def _get_kku_client():
    global _kku_client
    if _kku_client is None:
        from openai import AsyncOpenAI
        _kku_client = AsyncOpenAI(
            api_key=_KKU_API_KEY,
            base_url=_KKU_BASE_URL,
            max_retries=0,
            timeout=30.0,
        )
        logger.info("STT: KKU client initialized")
    return _kku_client


# MIME type -> file extension mapping for Whisper (covers all platforms)
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


async def transcribe_audio(audio_base64: str) -> str:
    """Decode base64 audio and transcribe via Groq Whisper API."""
    if not audio_base64:
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

    logger.info("STT: audio size=%d bytes, format=%s", len(audio_bytes), ext)

    # Choose client
    if GROQ_API_KEY:
        client = _get_groq_client()
        provider = "Groq"
    else:
        client = _get_kku_client()
        provider = "KKU"

    # Try original format first, then retry as .wav if it fails
    for attempt_ext in [ext, ".wav"] if ext != ".wav" else [ext]:
        try:
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = f"audio{attempt_ext}"

            transcription = await client.audio.transcriptions.create(
                model=STT_MODEL,
                file=audio_file,
                language="th",
            )
            transcribed = transcription.text.strip()
            if transcribed:
                logger.info(
                    "STT OK (%s, %d chars, format=%s, model=%s)",
                    provider, len(transcribed), attempt_ext, STT_MODEL,
                )
                return transcribed
            logger.warning("STT empty text (%s, format=%s)", provider, attempt_ext)
        except Exception as exc:
            logger.warning("STT failed (%s, format=%s): %s", provider, attempt_ext, exc)

    logger.error("All STT attempts failed")
    return ""
