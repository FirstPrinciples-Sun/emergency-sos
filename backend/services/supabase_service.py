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


async def upload_audio(incident_id: str, audio_base64: str) -> str | None:
    """Upload audio file to Supabase Storage and return the public URL."""
    import base64

    client = _get_client()
    if client is None:
        return None

    try:
        audio_bytes = base64.b64decode(audio_base64)
        file_path = f"audio/{incident_id}.webm"

        client.storage.from_("documents").upload(
            file_path,
            audio_bytes,
            file_options={"content-type": "audio/webm"},
        )

        public_url = client.storage.from_("documents").get_public_url(file_path)
        logger.info("Audio uploaded for incident %s", incident_id[:8])
        return public_url
    except Exception as exc:
        logger.error("Audio upload error: %s", exc)
        return None


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
