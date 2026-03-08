"""User-related endpoints – profile, PDPA consent, and incident history."""

import logging

from fastapi import APIRouter, HTTPException, Header, Request

from models.schemas import UserProfile
from services.auth import verify_liff_token, get_line_profile, extract_token
from services.supabase_service import (
    get_user_incidents,
    upsert_user,
    get_pdpa_status,
    record_pdpa_consent,
    get_user_profile,
    update_user_profile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["user"])


async def _require_auth(authorization: str | None) -> dict:
    """Verify LIFF token and return LINE profile. Raises 401 on failure."""
    token = extract_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="กรุณาเข้าสู่ระบบ")

    verify = await verify_liff_token(token)
    if not verify:
        raise HTTPException(status_code=401, detail="Token ไม่ถูกต้องหรือหมดอายุ")

    profile = await get_line_profile(token)
    if not profile or "userId" not in profile:
        raise HTTPException(status_code=401, detail="ไม่สามารถระบุผู้ใช้งานได้")

    return profile


@router.get("/me")
async def get_my_profile(authorization: str | None = Header(default=None)):
    """Return the authenticated user's full profile."""
    profile = await _require_auth(authorization)
    user_id = profile["userId"]

    # Upsert user record in Supabase
    await upsert_user(
        line_user_id=user_id,
        display_name=profile.get("displayName", ""),
        picture_url=profile.get("pictureUrl", ""),
    )

    # Get full profile from DB
    db_profile = await get_user_profile(user_id)
    pdpa = await get_pdpa_status(user_id)

    return {
        "userId": user_id,
        "displayName": profile.get("displayName"),
        "pictureUrl": profile.get("pictureUrl"),
        "full_name": db_profile.get("full_name", "") if db_profile else "",
        "phone": db_profile.get("phone", "") if db_profile else "",
        "blood_type": db_profile.get("blood_type", "") if db_profile else "",
        "allergies": db_profile.get("allergies", "") if db_profile else "",
        "chronic_diseases": db_profile.get("chronic_diseases", "") if db_profile else "",
        "emergency_contact_name": db_profile.get("emergency_contact_name", "") if db_profile else "",
        "emergency_contact_phone": db_profile.get("emergency_contact_phone", "") if db_profile else "",
        "pdpa_accepted": pdpa is not None,
    }


@router.get("/pdpa-status")
async def check_pdpa_status(authorization: str | None = Header(default=None)):
    """Check whether the user has accepted PDPA consent."""
    profile = await _require_auth(authorization)
    pdpa = await get_pdpa_status(profile["userId"])
    return {
        "accepted": pdpa is not None,
        "consent_version": pdpa.get("consent_version") if pdpa else None,
        "accepted_at": pdpa.get("accepted_at") if pdpa else None,
    }


@router.post("/pdpa-consent")
async def accept_pdpa(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Record PDPA consent for the authenticated user."""
    profile = await _require_auth(authorization)

    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    ua = request.headers.get("user-agent")

    ok = await record_pdpa_consent(
        line_user_id=profile["userId"],
        ip_address=ip,
        user_agent=ua,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="ไม่สามารถบันทึกความยินยอมได้")

    return {"accepted": True}


@router.put("/me/profile")
async def update_my_profile(
    body: UserProfile,
    authorization: str | None = Header(default=None),
):
    """Update the authenticated user's profile (medical info, phone, etc)."""
    profile = await _require_auth(authorization)

    ok = await update_user_profile(
        line_user_id=profile["userId"],
        profile_data=body.model_dump(exclude_unset=False),
    )
    if not ok:
        raise HTTPException(status_code=500, detail="ไม่สามารถบันทึกข้อมูลได้")

    return {"updated": True}


@router.get("/my-incidents")
async def get_my_incidents(authorization: str | None = Header(default=None)):
    """Return all incidents reported by the authenticated user."""
    profile = await _require_auth(authorization)
    user_id = profile["userId"]

    incidents = await get_user_incidents(user_id)
    return incidents
