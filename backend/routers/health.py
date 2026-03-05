"""Health check and LINE webhook endpoint."""

import logging

from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "emergency-sos-backend"}


@router.post("/webhook")
async def line_webhook(request: Request):
    """Temporary webhook to capture LINE group ID.

    1. Add your bot to a LINE group
    2. Send any message in the group
    3. Check the server logs for the group ID
    4. Copy the group ID to your .env
    """
    body = await request.json()
    events = body.get("events", [])

    for event in events:
        source = event.get("source", {})
        source_type = source.get("type")
        group_id = source.get("groupId")
        user_id = source.get("userId")

        logger.info("=== LINE EVENT ===")
        logger.info("Type: %s", event.get("type"))
        logger.info("Source type: %s", source_type)

        if group_id:
            logger.info(">>> GROUP ID: %s <<<", group_id)
        if user_id:
            logger.info("User ID: %s", user_id)

    return {"status": "ok"}
