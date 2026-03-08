"""Supabase (PostgreSQL) logging service for incident records."""

import logging
import os

from dotenv import load_dotenv
from supabase import create_client, Client

from models.schemas import IncidentReport, TriageResult

load_dotenv()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

_supabase: Client | None = None


def _get_client() -> Client | None:
    """Lazily initialize the Supabase client."""
    global _supabase
    if _supabase is not None:
        return _supabase
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("Supabase credentials not configured – database logging disabled")
        return None
    _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase


def get_supabase_client() -> Client | None:
    """Public accessor for the Supabase client (used by documents router)."""
    return _get_client()


async def log_incident(
    incident: IncidentReport,
    triage: TriageResult,
    line_sent: bool,
) -> bool:
    """Insert an incident record into the ``incidents`` table.

    Returns True on success, False on failure (non-blocking).
    """
    client = _get_client()
    if client is None:
        return False

    record = {
        "incident_id": incident.incident_id,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "address_hint": incident.address_hint,
        "text_description": incident.text_description,
        "reporter_phone": incident.reporter_phone,
        "line_user_id": incident.line_user_id,
        "display_name": incident.display_name,
        "timestamp": incident.timestamp.isoformat(),
        "severity_level": triage.severity_level.value,
        "severity_score": triage.severity_score,
        "category": triage.category.value if hasattr(triage.category, "value") else str(triage.category),
        "victim_count": triage.victim_count,
        "key_symptoms": triage.key_symptoms,
        "summary_th": triage.summary_th,
        "required_units": [
            u.value if hasattr(u, "value") else str(u)
            for u in triage.required_units
        ],
        "first_aid_advice": triage.first_aid_advice,
        "confidence_score": triage.confidence_score,
        "line_sent": line_sent,
    }

    try:
        result = client.table("incidents").insert(record).execute()
        logger.info("Incident %s logged to Supabase", incident.incident_id[:8])
        return True
    except Exception as exc:
        logger.error("Supabase insert error: %s", exc)
        return False


async def upsert_user(
    line_user_id: str,
    display_name: str,
    picture_url: str = "",
) -> bool:
    """Insert or update a user record in the ``users`` table."""
    client = _get_client()
    if client is None:
        return False

    record = {
        "line_user_id": line_user_id,
        "display_name": display_name,
        "picture_url": picture_url,
    }

    try:
        client.table("users").upsert(
            record, on_conflict="line_user_id"
        ).execute()
        return True
    except Exception as exc:
        logger.error("User upsert error: %s", exc)
        return False


AUDIO_MIME_MAP = {
    "audio/webm": (".webm", "audio/webm"),
    "audio/ogg": (".ogg", "audio/ogg"),
    "audio/mp4": (".mp4", "audio/mp4"),
    "audio/m4a": (".m4a", "audio/mp4"),
    "audio/aac": (".aac", "audio/aac"),
    "audio/wav": (".wav", "audio/wav"),
    "audio/mpeg": (".mp3", "audio/mpeg"),
    "audio/x-m4a": (".m4a", "audio/mp4"),
}


def _parse_audio_data(raw: str) -> tuple[bytes, str, str]:
    """Parse data URI or raw base64 string. Returns (bytes, extension, content_type)."""
    import base64 as b64

    ext = ".webm"
    content_type = "audio/webm"

    # Strip data URI header: "data:audio/ogg;codecs=opus;base64,<base64>"
    if "," in raw and raw.startswith("data:"):
        header, raw = raw.split(",", 1)
        mime_part = header.replace("data:", "").split(";")[0]
        if mime_part in AUDIO_MIME_MAP:
            ext, content_type = AUDIO_MIME_MAP[mime_part]

    audio_bytes = b64.b64decode(raw)
    return audio_bytes, ext, content_type


async def upload_audio(incident_id: str, audio_base64: str) -> str | None:
    """Upload audio file to Supabase Storage and return the public URL."""
    client = _get_client()
    if client is None:
        return None

    try:
        audio_bytes, ext, content_type = _parse_audio_data(audio_base64)
        file_path = f"audio/{incident_id}{ext}"

        client.storage.from_("documents").upload(
            file_path,
            audio_bytes,
            file_options={"content-type": content_type},
        )

        public_url = client.storage.from_("documents").get_public_url(file_path)
        logger.info("Audio uploaded for incident %s (format=%s)", incident_id[:8], ext)
        return public_url
    except Exception as exc:
        logger.error("Audio upload error: %s", exc)
        return None


async def get_pdpa_status(line_user_id: str) -> dict | None:
    """Check if user has accepted PDPA consent."""
    client = _get_client()
    if client is None:
        return None

    try:
        result = (
            client.table("pdpa_consents")
            .select("id, consent_version, accepted_at")
            .eq("line_user_id", line_user_id)
            .order("accepted_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as exc:
        logger.error("PDPA status query error: %s", exc)
        return None


async def record_pdpa_consent(
    line_user_id: str,
    consent_version: str = "1.0",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> bool:
    """Record PDPA consent and update user record."""
    client = _get_client()
    if client is None:
        return False

    try:
        client.table("pdpa_consents").insert({
            "line_user_id": line_user_id,
            "consent_version": consent_version,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }).execute()

        from datetime import datetime, timezone
        client.table("users").update({
            "pdpa_accepted_at": datetime.now(timezone.utc).isoformat(),
        }).eq("line_user_id", line_user_id).execute()

        return True
    except Exception as exc:
        logger.error("PDPA consent record error: %s", exc)
        return False


async def get_user_profile(line_user_id: str) -> dict | None:
    """Get full user profile including medical info."""
    client = _get_client()
    if client is None:
        return None

    try:
        result = (
            client.table("users")
            .select("*")
            .eq("line_user_id", line_user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as exc:
        logger.error("User profile query error: %s", exc)
        return None


async def update_user_profile(line_user_id: str, profile_data: dict) -> bool:
    """Update user profile fields."""
    client = _get_client()
    if client is None:
        return False

    allowed_fields = {
        "full_name", "phone", "blood_type", "allergies",
        "chronic_diseases", "emergency_contact_name", "emergency_contact_phone",
    }
    update = {k: v for k, v in profile_data.items() if k in allowed_fields}
    if not update:
        return True

    try:
        client.table("users").update(update).eq("line_user_id", line_user_id).execute()
        return True
    except Exception as exc:
        logger.error("User profile update error: %s", exc)
        return False


async def get_user_incidents(line_user_id: str) -> list[dict]:
    """Fetch all incidents for a specific LINE user, newest first."""
    client = _get_client()
    if client is None:
        return []

    try:
        result = (
            client.table("incidents")
            .select(
                "incident_id, severity_level, category, summary_th, "
                "timestamp, line_sent, severity_score, victim_count, "
                "key_symptoms, required_units, first_aid_advice, confidence_score, "
                "latitude, longitude, address_hint"
            )
            .eq("line_user_id", line_user_id)
            .order("timestamp", desc=True)
            .limit(50)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.error("User incidents query error: %s", exc)
        return []
