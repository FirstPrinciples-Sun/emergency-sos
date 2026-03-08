"""Speech-to-Text service using OpenAI-compatible Whisper API via KKU endpoint."""

import base64
import io
import logging
import os

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# KKU Gen AI endpoint (OpenAI-compatible)
API_KEY = os.environ.get("API_KEY", "")
BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://gen.ai.kku.ac.th/api/v1")
STT_MODEL = os.environ.get("STT_MODEL", "whisper-1")

# Lazy-init to avoid crashing module on bad env vars
_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(api_key=API_KEY, base_url=BASE_URL)
    return _client


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


def _detect_audio_ext(data_uri_header: str | None) -> str:
    """Detect file extension from data URI header like 'data:audio/webm;codecs=opus;base64'."""
    if not data_uri_header:
        return ".webm"
    # e.g. "data:audio/webm;codecs=opus;base64" -> "audio/webm"
    try:
        mime_part = data_uri_header.replace("data:", "").split(";")[0]
        return MIME_EXT_MAP.get(mime_part, ".webm")
    except Exception:
        return ".webm"


async def transcribe_audio(audio_base64: str) -> str:
    """Decode base64 audio and transcribe via OpenAI-compatible Whisper API."""
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

    # Try original format first, then retry as .wav if it fails
    for attempt_ext in [ext, ".wav"] if ext != ".wav" else [ext]:
        try:
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = f"audio{attempt_ext}"

            client = _get_client()
            transcription = client.audio.transcriptions.create(
                model=STT_MODEL,
                file=audio_file,
                language="th",
            )
            transcribed = transcription.text.strip()
            if transcribed:
                logger.info(
                    "Whisper transcription succeeded (%d chars, format=%s)",
                    len(transcribed),
                    attempt_ext,
                )
                return transcribed
            logger.warning("Whisper returned empty text (format=%s)", attempt_ext)
        except Exception as exc:
            logger.warning("Whisper attempt failed (format=%s): %s", attempt_ext, exc)

    logger.error("All Whisper transcription attempts failed")
    return ""