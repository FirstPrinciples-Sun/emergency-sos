"""Speech-to-Text service using Groq Whisper API (free, fast, high-quality).

Uses httpx directly instead of openai SDK to avoid connection/retry issues
on Vercel serverless.
"""

import base64
import io
import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Groq Whisper (free) – fallback to KKU if GROQ key not set
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
STT_MODEL = os.environ.get("STT_MODEL", "whisper-large-v3-turbo")

# Fallback: KKU endpoint
_KKU_API_KEY = os.environ.get("API_KEY", "")
_KKU_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://gen.ai.kku.ac.th/api/v1")


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
    "video/mp4": ".mp4",  # some devices report video/mp4 for audio
}

EXT_TO_MIME = {
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/m4a",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".3gp": "audio/3gpp",
    ".3g2": "audio/3gpp2",
    ".amr": "audio/amr",
}


def _detect_audio_ext(data_uri_header: str | None) -> str:
    """Detect file extension from data URI header like 'data:audio/webm;codecs=opus;base64'."""
    if not data_uri_header:
        return ".webm"
    try:
        mime_part = data_uri_header.replace("data:", "").split(";")[0]
        return MIME_EXT_MAP.get(mime_part, ".webm")
    except Exception:
        return ".webm"


async def _transcribe_groq(audio_bytes: bytes, filename: str, ext: str) -> str:
    """Call Groq Whisper API directly via httpx (no openai SDK)."""
    mime = EXT_TO_MIME.get(ext, "audio/webm")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (filename, audio_bytes, mime)},
            data={"model": STT_MODEL, "language": "th"},
        )
        resp.raise_for_status()
        result = resp.json()
        return (result.get("text") or "").strip()


async def _transcribe_kku(audio_bytes: bytes, filename: str, ext: str) -> str:
    """Call KKU OpenAI-compatible endpoint via httpx."""
    mime = EXT_TO_MIME.get(ext, "audio/webm")
    url = _KKU_BASE_URL.rstrip("/") + "/audio/transcriptions"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {_KKU_API_KEY}"},
            files={"file": (filename, audio_bytes, mime)},
            data={"model": STT_MODEL, "language": "th"},
        )
        resp.raise_for_status()
        result = resp.json()
        return (result.get("text") or "").strip()


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

    # Choose transcription function
    transcribe_fn = _transcribe_groq if GROQ_API_KEY else _transcribe_kku
    provider = "Groq" if GROQ_API_KEY else "KKU"

    # Try original format first, then retry as .wav if it fails
    for attempt_ext in [ext, ".wav"] if ext != ".wav" else [ext]:
        try:
            filename = f"audio{attempt_ext}"
            transcribed = await transcribe_fn(audio_bytes, filename, attempt_ext)
            if transcribed:
                logger.info(
                    "STT transcription succeeded (%s, %d chars, format=%s, model=%s)",
                    provider,
                    len(transcribed),
                    attempt_ext,
                    STT_MODEL,
                )
                return transcribed
            logger.warning("STT returned empty text (%s, format=%s)", provider, attempt_ext)
        except Exception as exc:
            logger.warning("STT attempt failed (%s, format=%s): %s", provider, attempt_ext, exc)

    logger.error("All STT transcription attempts failed")
    return ""
