"""LIFF token verification service."""

import logging
import httpx

logger = logging.getLogger(__name__)

LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"
LINE_PROFILE_URL = "https://api.line.me/v2/profile"


async def verify_liff_token(access_token: str) -> dict | None:
    """Verify a LIFF access token via LINE's verify endpoint.

    Returns a dict with at least ``client_id`` and ``expires_in``
    on success, or None on failure.
    """
    if not access_token:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                LINE_VERIFY_URL,
                params={"access_token": access_token},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("expires_in", 0) > 0:
                    return data
                logger.warning("LIFF token expired")
                return None
            logger.warning("LIFF verify failed: %s", resp.status_code)
            return None
    except Exception as exc:
        logger.error("LIFF verify error: %s", exc)
        return None


async def get_line_profile(access_token: str) -> dict | None:
    """Fetch the LINE user profile using an access token."""
    if not access_token:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                LINE_PROFILE_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 200:
                return resp.json()
            return None
    except Exception as exc:
        logger.error("LINE profile error: %s", exc)
        return None


def extract_token(authorization: str | None) -> str | None:
    """Extract Bearer token from Authorization header."""
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None
