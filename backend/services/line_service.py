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

SEVERITY_EMOJI = {
    "CRITICAL": "\U0001f534",  # Red circle
    "HIGH": "\U0001f7e0",      # Orange circle
    "MEDIUM": "\U0001f7e1",    # Yellow circle
    "LOW": "\U0001f7e2",       # Green circle
}

def format_line_message(incident: IncidentReport, triage: TriageResult, audio_url: str | None = None) -> str:
    """Build a structured plain-text message for LINE push."""
    emoji = SEVERITY_EMOJI.get(triage.severity_level.value, "\u26a0\ufe0f")

    google_maps_url = f"https://maps.google.com/?q={incident.latitude},{incident.longitude}"

    units = ", ".join(u.value if hasattr(u, "value") else str(u) for u in triage.required_units)
    symptoms = ", ".join(triage.key_symptoms) if triage.key_symptoms else "-"
    victim_str = str(triage.victim_count) if triage.victim_count is not None else "ไม่ทราบ"
    phone_str = incident.reporter_phone or "ไม่ระบุ"
    address_str = incident.address_hint or "ไม่ระบุ"
    reporter_name = incident.display_name or "ไม่ระบุชื่อ"
    reporter_line_id = incident.line_user_id or "ไม่ระบุ"

    message = (
        f"{emoji} แจ้งเหตุฉุกเฉิน #{incident.incident_id[:8]}\n"
        f"{'=' * 30}\n"
        f"\U0001f6a8 ระดับ: {triage.severity_level.value} ({triage.severity_score}/10)\n"
        f"\U0001f4cb ประเภท: {triage.category.value if hasattr(triage.category, 'value') else triage.category}\n"
        f"\U0001f465 จำนวนผู้บาดเจ็บ: {victim_str}\n"
        f"\U0001fa79 อาการ: {symptoms}\n"
        f"{'=' * 30}\n"
        f"\U0001f4dd สรุป: {triage.summary_th}\n"
        f"\U0001f691 หน่วยที่ต้องการ: {units}\n"
        f"\U0001fa78 ปฐมพยาบาล: {triage.first_aid_advice}\n"
        f"{'=' * 30}\n"
        f"\U0001f4cd พิกัด: {incident.latitude}, {incident.longitude}\n"
        f"\U0001f5fa แผนที่: {google_maps_url}\n"
        f"\U0001f3e0 จุดสังเกต: {address_str}\n"
        f"\U0001f4de โทร: {phone_str}\n"
        f"\U0001f552 เวลา: {incident.timestamp.strftime('%Y-%m-%d %H:%M:%S')} UTC\n"
        f"\U0001f464 ผู้แจ้ง: {reporter_name}\n"
        f"\U0001f4f1 LINE ID: {reporter_line_id}\n"
        f"\U0001f916 ความมั่นใจ AI: {triage.confidence_score:.0%}"
    )
    if audio_url:
        message += f"\n\U0001f3a4 ไฟล์เสียง: {audio_url}"
    return message

def format_direct_message(incident: IncidentReport, incident_text: str, audio_url: str | None = None) -> str:
    """Build a plain-text message for direct (skip-AI) reports."""
    google_maps_url = f"https://maps.google.com/?q={incident.latitude},{incident.longitude}"
    phone_str = incident.reporter_phone or "ไม่ระบุ"
    address_str = incident.address_hint or "ไม่ระบุ"
    reporter_name = incident.display_name or "ไม่ระบุชื่อ"
    reporter_line_id = incident.line_user_id or "ไม่ระบุ"

    message = (
        f"\U0001f6a8 แจ้งเหตุด่วน #{incident.incident_id[:8]}\n"
        f"(ส่งตรง – ไม่ผ่าน AI)\n"
        f"{'=' * 30}\n"
        f"\U0001f4dd รายละเอียด: {incident_text}\n"
        f"{'=' * 30}\n"
        f"\U0001f4cd พิกัด: {incident.latitude}, {incident.longitude}\n"
        f"\U0001f5fa แผนที่: {google_maps_url}\n"
        f"\U0001f3e0 จุดสังเกต: {address_str}\n"
        f"\U0001f4de โทร: {phone_str}\n"
        f"\U0001f552 เวลา: {incident.timestamp.strftime('%Y-%m-%d %H:%M:%S')} UTC\n"
        f"\U0001f464 ผู้แจ้ง: {reporter_name}\n"
        f"\U0001f4f1 LINE ID: {reporter_line_id}"
    )
    if audio_url:
        message += f"\n\U0001f3a4 ไฟล์เสียง: {audio_url}"
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