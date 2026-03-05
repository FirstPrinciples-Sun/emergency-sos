"""Emergency SOS Reporting System – FastAPI backend."""

import logging
import os

from dotenv import dotenv_values
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health, incident
from routers.documents import router as documents_router
from routers.user import router as user_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Emergency SOS API",
    description="ระบบรับแจ้งเหตุฉุกเฉินอัจฉริยะ พร้อม AI Triage",
    version="2.0.0",
)

# --- CORS ---
_config = dotenv_values()
_frontend_url = os.environ.get("FRONTEND_URL") or _config.get("FRONTEND_URL", "")

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
app.include_router(user_router)
