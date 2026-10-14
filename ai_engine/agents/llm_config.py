"""Shared Ollama (OpenAI-compatible) endpoint + key resolution for agents.

Dev machines run a local Ollama (http://localhost:11434/v1); the Render
deployment must route to the Ollama cloud host instead. Accepts the
historical spellings across the .env files (OLLAMA_API_KEY, Ollama_API_KEY,
OLLAMA_CLOUD_*, LLM_*).
"""
import os

LOCAL_OLLAMA = "http://localhost:11434/v1"
OLLAMA_CLOUD = "https://ollama.com/v1"


def _first(*names: str):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


def resolve(base_url: str = None, api_key: str = None):
    """Return (base_url, api_key).

    Priority: explicit args > configured base URL env (key kept as given) >
    a configured key env (implies the Ollama cloud host) > local host on
    dev machines only — cloud hosts (RENDER env) get the cloud endpoint.
    """
    key = _first("OLLAMA_API_KEY", "OLLAMA_CLOUD_API_KEY", "Ollama_API_KEY", "LLM_API_KEY")
    base = base_url or _first("OLLAMA_BASE_URL", "OLLAMA_CLOUD_BASE_URL", "LLM_BASE_URL")
    if base:
        return base, api_key or key or "ollama"
    if api_key or key:
        return OLLAMA_CLOUD, api_key or key
    # ponytail: production has no localhost Ollama — default to the cloud
    # provider and let the auth check fail loudly; set OLLAMA_API_KEY when
    # we actually buy the hosting.
    in_render = str(os.getenv("RENDER", "")).strip().lower() not in ("", "0", "false")
    return (OLLAMA_CLOUD if in_render else LOCAL_OLLAMA), "ollama"


def mask(api_key: str) -> str:
    """Display-safe key hint for logs."""
    return f"...{api_key[-4:]}" if len(api_key) > 4 else "***"