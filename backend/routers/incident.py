"""Incident reporting endpoint – the core SOS pipeline."""

import logging

from fastapi import APIRouter, HTTPException, Header

from models.schemas import IncidentReport, IncidentResponse, IncidentStatus, TriageResult
from services.stt_service import transcribe_audio
from services.ai_dispatcher import analyze_incident
from services.line_service import send_line_notification, send_direct_notification
from services.supabase_service import log_incident, upload_audio
from services.auth import verify_liff_token, extract_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["incident"])


@router.post("/report-incident", response_model=IncidentResponse)
async def report_incident(
    report: IncidentReport,
    authorization: str | None = Header(default=None),
) -> IncidentResponse:
    """Process an incoming SOS report through the full pipeline:

    1. Optional LIFF token verification
    2. Speech-to-Text (if audio provided)
    3. AI Triage (unless skip_ai=True)
    4. LINE notification to rescue group
    5. Database logging
    """
    # --- Step 0: Optional auth verification ---
    token = extract_token(authorization)
    if token:
        verify = await verify_liff_token(token)
        if verify:
            logger.info("Authenticated report from LINE user: %s", report.line_user_id or "unknown")
        else:
            logger.warning("Invalid LIFF token provided – proceeding without auth")

    logger.info("Received incident %s (skip_ai=%s)", report.incident_id[:8], report.skip_ai)

    # --- Step 0.5: Upload audio file to storage ---
    audio_url: str | None = None
    if report.audio_base64:
        audio_url = await upload_audio(report.incident_id, report.audio_base64)

    # --- Step 1: Resolve incident text ---
    incident_text = ""

    if report.audio_base64:
        logger.info("Transcribing audio for incident %s", report.incident_id[:8])
        incident_text = await transcribe_audio(report.audio_base64)

    # Fallback / supplement with manual text
    if report.text_description:
        if incident_text:
            incident_text = f"{incident_text} {report.text_description}"
        else:
            incident_text = report.text_description

    if not incident_text:
        raise HTTPException(
            status_code=400,
            detail="ไม่สามารถรับข้อมูลเหตุการณ์ได้ กรุณาบันทึกเสียงหรือพิมพ์ข้อความ",
        )

    # --- Step 2: AI Triage OR Direct Send ---
    if report.skip_ai:
        logger.info("Skipping AI triage for incident %s (direct send)", report.incident_id[:8])
        triage = TriageResult(
            severity_level="HIGH",
            severity_score=7,
            category="อื่นๆ",
            victim_count=None,
            key_symptoms=[],
            summary_th=incident_text[:300],
            required_units=["รถพยาบาล"],
            first_aid_advice="รอเจ้าหน้าที่ ณ จุดเกิดเหตุ",
            confidence_score=0.0,
        )
        # --- Step 3: Direct LINE Notification ---
        line_sent = await send_direct_notification(report, incident_text, audio_url)
    else:
        logger.info("Running AI triage for incident %s", report.incident_id[:8])
        triage = await analyze_incident(incident_text)
        # --- Step 3: LINE Notification with AI result + audio ---
        line_sent = await send_line_notification(report, triage, audio_url)

    # --- Step 4: Database Logging ---
    await log_incident(report, triage, line_sent)

    # --- Response ---
    return IncidentResponse(
        incident_id=report.incident_id,
        status=IncidentStatus.DISPATCHED if line_sent else IncidentStatus.PROCESSING,
        triage_result=triage,
        line_sent=line_sent,
        audio_url=audio_url,
        message="แจ้งเหตุสำเร็จ เจ้าหน้าที่กำลังดำเนินการ"
        if line_sent
        else "รับแจ้งเหตุแล้ว ระบบกำลังประสานงานเจ้าหน้าที่",
    )
