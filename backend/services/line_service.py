"""LINE Messaging API service – format and push incident alerts to all registered groups."""

import asyncio
import logging
import os
from datetime import timezone, timedelta

import httpx
from dotenv import load_dotenv

from models.schemas import IncidentReport, TriageResult

# Thailand timezone (UTC+7)
TH_TZ = timezone(timedelta(hours=7))

load_dotenv()
logger = logging.getLogger(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")

# Env-var fallback: manual group IDs (comma-separated)
_raw_ids = os.environ.get("LINE_GROUP_IDS", "") or os.environ.get("LINE_GROUP_ID", "")
_ENV_GROUP_IDS: list[str] = [gid.strip() for gid in _raw_ids.split(",") if gid.strip()]

LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"


def _get_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }


def format_line_message(
    incident: IncidentReport,
    triage: TriageResult,
    audio_url: str | None = None,
    medical_info: str | None = None,
) -> str:
    """Build a clean plain-text message for LINE push (AI-analysed)."""
    google_maps_url = f"https://maps.google.com/?q={incident.latitude},{incident.longitude}"

    units = ", ".join(
        u.value if hasattr(u, "value") else str(u) for u in triage.required_units
    )
    phone_str = incident.reporter_phone or "ไม่ระบุ"
    address_str = incident.address_hint or "ไม่ระบุ"
    reporter_name = incident.display_name or "ไม่ระบุชื่อ"

    message = (
        f"🚨 แจ้งเหตุฉุกเฉิน #{incident.incident_id[:8]}\n"
        f"ระดับ: {triage.severity_level.value} ({triage.severity_score}/10) | "
        f"ประเภท: {triage.category.value if hasattr(triage.category, 'value') else triage.category}\n"
        f"สรุป: {triage.summary_th}\n"
        f"หน่วย: {units}\n"
        f"---\n"
        f"📍 พิกัด: {google_maps_url}\n"
        f"จุดสังเกต: {address_str}\n"
        f"📞 โทร: {phone_str} | ผู้แจ้ง: {reporter_name}\n"
        f"🕐 เวลา: {incident.timestamp.astimezone(TH_TZ).strftime('%Y-%m-%d %H:%M')}"
    )
    if medical_info:
        message += f"\n🏥 {medical_info}"
    if audio_url:
        message += f"\n🔊 เสียง: {audio_url}"
    return message


def format_direct_message(
    incident: IncidentReport,
    incident_text: str,
    audio_url: str | None = None,
    medical_info: str | None = None,
) -> str:
    """Build a plain-text message for direct (skip-AI) reports."""
    google_maps_url = f"https://maps.google.com/?q={incident.latitude},{incident.longitude}"
    phone_str = incident.reporter_phone or "ไม่ระบุ"
    address_str = incident.address_hint or "ไม่ระบุ"
    reporter_name = incident.display_name or "ไม่ระบุชื่อ"

    message = (
        f"🆘 แจ้งเหตุด่วน #{incident.incident_id[:8]}\n"
        f"(ส่งตรง ไม่ผ่าน AI)\n"
        f"รายละเอียด: {incident_text}\n"
        f"---\n"
        f"📍 พิกัด: {google_maps_url}\n"
        f"จุดสังเกต: {address_str}\n"
        f"📞 โทร: {phone_str} | ผู้แจ้ง: {reporter_name}\n"
        f"🕐 เวลา: {incident.timestamp.astimezone(TH_TZ).strftime('%Y-%m-%d %H:%M')}"
    )
    if medical_info:
        message += f"\n🏥 {medical_info}"
    if audio_url:
        message += f"\n🔊 เสียง: {audio_url}"
    return message


async def _push_to_group(group_id: str, text: str) -> bool:
    """Push a text message to a single LINE group/user. Returns True on success."""
    payload = {
        "to": group_id,
        "messages": [{"type": "text", "text": text}],
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(LINE_PUSH_URL, headers=_get_headers(), json=payload)
            resp.raise_for_status()
        return True
    except Exception as exc:
        logger.error("LINE push to %s failed: %s", group_id[:12], exc)
        return False


async def _get_all_group_ids() -> list[str]:
    """Merge DB groups + env-var groups (deduplicated)."""
    from services.supabase_service import get_active_line_groups

    db_groups = await get_active_line_groups()
    all_ids = list(dict.fromkeys(db_groups + _ENV_GROUP_IDS))  # dedupe, preserve order
    return all_ids


async def _broadcast_to_groups(text: str, incident_id: str) -> bool:
    """Send a message to ALL registered LINE groups in parallel.

    Groups are auto-discovered from the database (webhook) + env var fallback.
    Returns True if at least one group received the notification.
    """
    group_ids = await _get_all_group_ids()

    if not LINE_CHANNEL_ACCESS_TOKEN or not group_ids:
        logger.warning("LINE credentials or groups not configured – skipping notification")
        return False

    tasks = [_push_to_group(gid, text) for gid in group_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    success_count = sum(1 for r in results if r is True)
    total = len(group_ids)
    logger.info(
        "LINE broadcast for %s: %d/%d groups notified",
        incident_id[:8],
        success_count,
        total,
    )
    return success_count > 0


async def send_line_notification(
    incident: IncidentReport,
    triage: TriageResult,
    audio_url: str | None = None,
    medical_info: str | None = None,
) -> bool:
    """Send an AI-analyzed incident notification to all LINE groups."""
    text = format_line_message(incident, triage, audio_url, medical_info)
    return await _broadcast_to_groups(text, incident.incident_id)


async def send_direct_notification(
    incident: IncidentReport,
    incident_text: str,
    audio_url: str | None = None,
    medical_info: str | None = None,
) -> bool:
    """Send a direct (non-AI) notification to all LINE groups."""
    text = format_direct_message(incident, incident_text, audio_url, medical_info)
    return await _broadcast_to_groups(text, incident.incident_id)
