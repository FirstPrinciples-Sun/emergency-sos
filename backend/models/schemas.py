"""Pydantic v2 schemas for the Emergency SOS Reporting System."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentCategory(str, Enum):
    TRAFFIC_ACCIDENT = "อุบัติเหตุจราจร"
    MEDICAL_EMERGENCY = "เจ็บป่วยฉุกเฉิน"
    FIRE = "เพลิงไหม้"
    DROWNING = "จมน้ำ"
    OTHER = "อื่นๆ"


class RescueUnit(str, Enum):
    AMBULANCE = "รถพยาบาล"
    FIRE_TRUCK = "รถดับเพลิง"
    RESCUE_BOAT = "เรือกู้ภัย"
    POLICE = "ตำรวจ"


class IncidentStatus(str, Enum):
    RECEIVED = "received"
    PROCESSING = "processing"
    DISPATCHED = "dispatched"


# --- Request Model ---


class IncidentReport(BaseModel):
    """Incoming incident report from the frontend."""

    incident_id: str = Field(default_factory=lambda: str(uuid4()))
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address_hint: Optional[str] = Field(default=None, max_length=500)
    audio_base64: Optional[str] = Field(default=None)
    text_description: Optional[str] = Field(default=None, max_length=2000)
    reporter_phone: Optional[str] = Field(default=None, max_length=20)
    line_user_id: Optional[str] = Field(default=None, max_length=64)
    display_name: Optional[str] = Field(default=None, max_length=100)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    skip_ai: bool = Field(default=False)


# --- AI Triage Output ---


class TriageResult(BaseModel):
    """Structured triage output from GPT-4o-mini."""

    severity_level: SeverityLevel
    severity_score: int = Field(..., ge=1, le=10)
    category: IncidentCategory
    victim_count: Optional[int] = Field(default=None, ge=0)
    key_symptoms: list[str] = Field(default_factory=list, max_length=3)
    summary_th: str = Field(..., max_length=300)
    required_units: list[RescueUnit] = Field(default_factory=list)
    first_aid_advice: str = Field(..., max_length=500)
    confidence_score: float = Field(..., ge=0.0, le=1.0)


# --- API Response ---


class IncidentResponse(BaseModel):
    """Response returned to the frontend after processing."""

    incident_id: str
    status: IncidentStatus
    triage_result: Optional[TriageResult] = None
    line_sent: bool = False
    message: str = "รับแจ้งเหตุเรียบร้อยแล้ว"
    audio_url: Optional[str] = None
