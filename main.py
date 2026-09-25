"""Root launcher wrapper so `uvicorn main:app --reload` works from the
project root. The real FastAPI app lives in ai_engine/main.py.

Run with:
    uvicorn main:app --reload --port 8000
"""
# Make sure the project root (this file's directory) is importable before the
# ai_engine import runs -- console-script invocations of uvicorn do not always
# put CWD on sys.path.
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ai_engine.main import app  # noqa: E402

__all__ = ["app"]