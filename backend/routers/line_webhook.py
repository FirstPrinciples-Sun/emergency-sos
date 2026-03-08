"""LINE Webhook – auto-detect groups the bot joins/leaves."""

import hashlib
import hmac
import logging
import os

from fastapi import APIRouter, Request, HTTPException

from services.supabase_service import register_line_group, deactivate_line_group

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/line", tags=["line-webhook"])

LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET", "")


def _verify_signature(body: bytes, signature: str) -> bool:
    """Verify LINE webhook signature using channel secret."""
    if not LINE_CHANNEL_SECRET:
        # No secret configured – accept all (dev mode)
        logger.warning("LINE_CHANNEL_SECRET not set – skipping signature verification")
        return True
    expected = hmac.new(
        LINE_CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).digest()
    import base64
    expected_b64 = base64.b64encode(expected).decode("utf-8")
    return hmac.compare_digest(expected_b64, signature)


@router.post("/webhook")
async def line_webhook(request: Request):
    """Handle LINE webhook events.

    Auto-registers group IDs when the bot joins a group,
    and deactivates them when the bot leaves.
    Also captures group IDs from any message event in a group.
    """
    body = await request.body()
    signature = request.headers.get("x-line-signature", "")

    if LINE_CHANNEL_SECRET and not _verify_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = await request.json()
    except Exception:
        return {"status": "ok"}

    events = payload.get("events", [])

    for event in events:
        event_type = event.get("type", "")
        source = event.get("source", {})
        source_type = source.get("type", "")
        group_id = source.get("groupId", "")

        if not group_id:
            continue

        if event_type == "join":
            # Bot was added to a group
            group_name = await _try_get_group_name(group_id)
            await register_line_group(group_id, group_name)
            logger.info("Bot joined group: %s (%s)", group_id[:12], group_name)

        elif event_type == "leave":
            # Bot was removed from a group
            await deactivate_line_group(group_id)
            logger.info("Bot left group: %s", group_id[:12])

        elif source_type == "group":
            # Any event from a group – ensure it's registered
            # (catches groups the bot was already in before this feature)
            await register_line_group(group_id, "")

    return {"status": "ok"}


async def _try_get_group_name(group_id: str) -> str:
    """Try to fetch group name via LINE API. Returns empty string on failure."""
    import httpx

    token = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
    if not token:
        return ""

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://api.line.me/v2/bot/group/{group_id}/summary",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("groupName", "")
    except Exception as exc:
        logger.debug("Could not fetch group name for %s: %s", group_id[:12], exc)

    return ""
