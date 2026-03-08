"""LINE Messaging API service – format and push incident alerts."""

import logging
import os

import httpx
from dotenv import load_dotenv

from models.schemas import IncidentReport, TriageResult

load_dotenv()
logger = logging.getLogger(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_GROUP_ID = os.environ.get("LINE_GROUP_ID", "")

LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"


def format_line_message(incident: IncidentReport, triage: TriageResult, audio_url: str | None = None) -> str:
    """Build a clean plain-text message for LINE push."""
    google_maps_url = f"https://maps.google.com/?q={incident.latitude},{incident.longitude}"

    units = ", ".join(u.value if hasattr(u, "value") else str(u) for u in triage.required_units)
    phone_str = incident.reporter_phone or "ไม่ระบุ"
    address_str = incident.address_hint or "ไม่ระบุ"
    reporter_name = incident.display_name or "ไม่ระบุชื่อ"

    message = (
        f"แจ้งเหตุฉุกเฉิน #{incident.incident_id[:8]}\n"
        f"ระดับ: {triage.severity_level.value} ({triage.severity_score}/10) | "
        f"ประเภท: {triage.category.value if hasattr(triage.category, 'value') else triage.category}\n"
        f"สรุป: {triage.summary_th}\n"
        f"หน่วย: {units}\n"
        f"---\n"
        f"พิกัด: {google_maps_url}\n"
        f"จุดสังเกต: {address_str}\n"
        f"โทร: {phone_str} | ผู้แจ้ง: {reporter_name}\n"
        f"เวลา: {incident.timestamp.strftime('%Y-%m-%d %H:%M')}"
    )
    if audio_url:
        message += f"\nเสียง: {audio_url}"
    return message


def format_direct_message(incident: IncidentReport, incident_text: str, audio_url: str | None = None) -> str:
    """Build a plain-text message for direct (skip-AI) reports."""
    google_maps_url = f"https://maps.google.com/?q={incident.latitude},{incident.longitude}"
    phone_str = incident.reporter_phone or "ไม่ระบุ"
    address_str = incident.address_hint or "ไม่ระบุ"
    reporter_name = incident.display_name or "ไม่ระบุชื่อ"

    message = (
        f"แจ้งเหตุด่วน #{incident.incident_id[:8]}\n"
        f"(ส่งตรง ไม่ผ่าน AI)\n"
        f"รายละเอียด: {incident_text}\n"
        f"---\n"
        f"พิกัด: {google_maps_url}\n"
        f"จุดสังเกต: {address_str}\n"
        f"โทร: {phone_str} | ผู้แจ้ง: {reporter_name}\n"
        f"เวลา: {incident.timestamp.strftime('%Y-%m-%d %H:%M')}"
    )
    if audio_url:
        message += f"\nเสียง: {audio_url}"
    return message


async def send_direct_notification(incident: IncidentReport, incident_text: str, audio_url: str | None = None) -> bool:
    """Send a direct (non-AI) notification to the LINE group."""
    if not LINE_CHANNEL_ACCESS_TOKEN or not LINE_GROUP_ID:
        logger.warning("LINE credentials not configured – skipping notification")
        return False

    text = format_direct_message(incident, incident_text, audio_url)
    payload = {
        "to": LINE_GROUP_ID,
        "messages": [{"type": "text", "text": text}],
    }
    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(LINE_PUSH_URL, headers=headers, json=payload)
            response.raise_for_status()
        logger.info("Direct LINE notification sent for incident %s", incident.incident_id[:8])
        return True
    except Exception as exc:
        logger.error("LINE direct notification error: %s", exc)
        return False


async def send_line_notification(incident: IncidentReport, triage: TriageResult, audio_url: str | None = None) -> bool:
    """Send an AI-analyzed incident notification to the LINE group."""
    if not LINE_CHANNEL_ACCESS_TOKEN or not LINE_GROUP_ID:
        logger.warning("LINE credentials not configured – skipping notification")
        return False

    text = format_line_message(incident, triage, audio_url)

    payload = {
        "to": LINE_GROUP_ID,
        "messages": [{"type": "text", "text": text}],
    }
    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(LINE_PUSH_URL, headers=headers, json=payload)
            response.raise_for_status()
        logger.info("LINE notification sent for incident %s", incident.incident_id[:8])
        return True
    except Exception as exc:
        logger.error("LINE unexpected error: %s", exc)

    return False
