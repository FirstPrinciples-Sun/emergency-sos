"""Speech-to-Text service using OpenAI Whisper API.

Uses the official OpenAI API (whisper-1) for reliable, fast transcription.
"""

import base64
import io
import logging
import os

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# OpenAI official API
OPENAI_STT_KEY = os.environ.get("OPENAI_STT_KEY", "").strip()
STT_MODEL = os.environ.get("STT_MODEL", "whisper-1")

_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import AsyncOpenAI
        _client = AsyncOpenAI(
            api_key=OPENAI_STT_KEY,
            max_retries=1,
            timeout=30.0,
        )
        logger.info("STT: OpenAI client ready (model=%s)", STT_MODEL)
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


async def transcribe_audio(audio_base64: str) -> str:
    """Decode base64 audio and transcribe via OpenAI Whisper."""
    if not audio_base64:
        return ""

    if not OPENAI_STT_KEY:
        logger.error("STT: OPENAI_STT_KEY not set")
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
            )
            text = transcription.text.strip()
            if text:
                logger.info("STT OK: %d chars (format=%s)", len(text), attempt_ext)
                return text
            logger.warning("STT empty (format=%s)", attempt_ext)
        except Exception as exc:
            logger.warning("STT failed (format=%s): %s", attempt_ext, exc)

    logger.error("All STT attempts failed")
    return ""
