"""User-related endpoints – profile and incident history."""

import logging

from fastapi import APIRouter, HTTPException, Header

from services.auth import verify_liff_token, get_line_profile, extract_token
from services.supabase_service import get_user_incidents, upsert_user

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
    """Return the authenticated user's LINE profile."""
    profile = await _require_auth(authorization)

    # Upsert user record in Supabase
    await upsert_user(
        line_user_id=profile["userId"],
        display_name=profile.get("displayName", ""),
        picture_url=profile.get("pictureUrl", ""),
    )

    return {
        "userId": profile["userId"],
        "displayName": profile.get("displayName"),
        "pictureUrl": profile.get("pictureUrl"),
    }


@router.get("/my-incidents")
async def get_my_incidents(authorization: str | None = Header(default=None)):
    """Return all incidents reported by the authenticated user."""
    profile = await _require_auth(authorization)
    user_id = profile["userId"]

    incidents = await get_user_incidents(user_id)
    return incidents
