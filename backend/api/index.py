"""Vercel serverless entry point for the FastAPI backend."""

import sys
import os

# Add the parent directory to the path (Vercel puts files at /var/task)
_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent not in sys.path:
    sys.path.insert(0, _parent)

from main import app  # noqa: E402
