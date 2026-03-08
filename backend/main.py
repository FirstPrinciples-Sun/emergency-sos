"""Emergency SOS Reporting System – FastAPI backend."""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

from routers import health, incident
from routers.documents import router as documents_router
from routers.line_webhook import router as line_webhook_router
from routers.user import router as user_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Emergency SOS API",
    description="ระบบรับแจ้งเหตุฉุกเฉินอัจฉริยะ พร้อม AI Triage",
    version="2.3.0",
)

logger = logging.getLogger(__name__)

# --- CORS ---
_frontend_url = os.environ.get("FRONTEND_URL", "")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://localhost:3000",
]

if _frontend_url:
    ALLOWED_ORIGINS.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(health.router)
app.include_router(incident.router)
app.include_router(documents_router)
app.include_router(line_webhook_router)
app.include_router(user_router)

logger.info(
    "Registered %d routes: %s",
    len(app.routes),
    [r.path for r in app.routes if hasattr(r, "path")],
)
