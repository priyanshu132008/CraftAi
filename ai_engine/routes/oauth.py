"""Universal OAuth 2.0 authorize + callback flow for the Connectors Hub.

Flow: frontend full-page navigates to ``GET /api/oauth/{provider}/authorize``
-> backend 302s to the provider's consent page (state nonce in an HttpOnly
cookie) -> provider redirects to ``GET /api/oauth/callback`` -> backend
exchanges the code server-to-server, stores the tokens in the workspace vault,
and 302s the user back to the frontend Connectors page with
``?success=true&provider=<id>`` (or ``?success=false&error=<msg>``).
"""
import os
import secrets
import time
from pathlib import Path
from typing import Dict
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from ai_engine.config.oauth_providers import OAUTH_PROVIDERS, provider_credentials

router = APIRouter(prefix="/api/oauth")

STATE_COOKIE = "craftai_oauth_state"
STATE_MAX_AGE = 600  # seconds; generous window for the consent round trip

# Where the provider should send the user back, and where we send them after.
BACKEND_ORIGIN = os.getenv("OAUTH_REDIRECT_BASE", "http://localhost:8000").rstrip("/")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").rstrip("/")
CALLBACK_URL = f"{BACKEND_ORIGIN}/api/oauth/callback"

# ponytail: single-workspace in-memory token vault — tokens are lost on
# restart and shared by every user of this server. Move to encrypted
# per-user storage (e.g. a Supabase vault table) once auth is multi-user.
OAUTH_VAULT: Dict[str, Dict] = {}


def _back_home(success: bool, **params: str) -> RedirectResponse:
    """Redirect to the frontend Connectors hub with a status flag."""
    query = urlencode({k: v for k, v in params.items() if v})
    url = f"{FRONTEND_ORIGIN}/connectors?success={'true' if success else 'false'}"
    if query:
        url = f"{url}&{query}"
    resp = RedirectResponse(url, status_code=302)
    if not success:
        resp.delete_cookie(STATE_COOKIE, path="/")
    return resp


@router.get("/{provider_id}/authorize")
def authorize(provider_id: str):
    """302 the user to the provider's consent page.

    The state param carries the provider id plus a random nonce; the same
    value is stored in an HttpOnly cookie so the callback can verify the
    round trip (CSRF protection).
    """
    provider = OAUTH_PROVIDERS.get(provider_id)
    if not provider:
        return _back_home(False, error=f"Unknown OAuth provider: {provider_id}")

    # Force-reload the env file on every authorize call — kills any stale
    # in-memory state (e.g. values rotated after the server started).
    load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)
    client_id, client_secret = provider_credentials(provider)
    # Request-time debug — proves the env vars are visible in the RUNNING
    # process (the startup ENV DEBUG block covers boot time).
    print("=== OAUTH ROUTE DEBUG ===")
    print(f"Provider: {provider_id}")
    print(f"ID found: {bool(client_id)}")
    print(f"SECRET found: {bool(client_secret)}")
    print("=========================")
    if not client_id or not client_secret:
        # Direct JSON (not a frontend redirect) so the browser shows exactly
        # what the running process sees — no more guessing which key dropped.
        return {
            "error": "KEYS_STILL_MISSING",
            "provider": provider_id,
            "looking_for_id_key": f"{provider.client_env}_CLIENT_ID",
            "looking_for_secret_key": f"{provider.client_env}_CLIENT_SECRET",
            "id_found": bool(client_id),
            "secret_found": bool(client_secret),
        }

    state = f"{provider_id}.{secrets.token_urlsafe(32)}"
    params = {
        "client_id": client_id,
        "redirect_uri": CALLBACK_URL,
        "response_type": "code",
        "state": state,
        **provider.extra_auth_params,
    }
    if provider.scopes:
        params["scope"] = " ".join(provider.scopes)

    resp = RedirectResponse(f"{provider.auth_url}?{urlencode(params)}", status_code=302)
    resp.set_cookie(
        STATE_COOKIE,
        state,
        max_age=STATE_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return resp


@router.get("/callback")
async def oauth_callback(request: Request):
    """Validate the round trip, exchange the code for tokens, store them."""
    qs = request.query_params
    code = qs.get("code", "")
    state = qs.get("state", "")
    provider_error = qs.get("error", "")

    if provider_error:
        return _back_home(False, error=f"Provider rejected the request: {provider_error}")
    if not code or not state:
        return _back_home(False, error="Callback missing code/state")

    cookie_state = request.cookies.get(STATE_COOKIE, "")
    if not cookie_state or not secrets.compare_digest(cookie_state, state):
        return _back_home(False, error="Invalid OAuth state — retry the connection")

    provider_id, _, _ = state.partition(".")
    provider = OAUTH_PROVIDERS.get(provider_id)
    if not provider:
        return _back_home(False, error=f"Unknown OAuth provider: {provider_id}")
    client_id, client_secret = provider_credentials(provider)
    if not client_id or not client_secret:
        return _back_home(
            False,
            error=f"{provider.client_env}_CLIENT_ID / _CLIENT_SECRET missing from the backend .env",
        )

    body = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": CALLBACK_URL,
    }
    headers = {"Accept": "application/json", **provider.extra_token_headers}
    auth = None
    if provider.token_auth == "basic":  # Notion: app credentials via HTTP Basic
        auth = (client_id, client_secret)
        body.pop("client_id")
        body.pop("client_secret")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(provider.token_url, data=body, headers=headers, auth=auth)
    except httpx.HTTPError as exc:
        return _back_home(False, error=f"Token endpoint unreachable: {exc}")

    if r.status_code != 200:
        return _back_home(False, error=f"Token exchange failed (HTTP {r.status_code})")
    try:
        token_data = r.json()
    except ValueError:
        return _back_home(False, error="Token endpoint returned a non-JSON response")
    access_token = token_data.get("access_token", "")
    if not access_token:
        return _back_home(
            False,
            error=f"No access_token in provider response: {token_data.get('error', 'unknown')}",
        )

    OAUTH_VAULT[provider_id] = {
        "access_token": access_token,
        "refresh_token": token_data.get("refresh_token", ""),
        "scope": token_data.get("scope", ""),
        "obtained_at": time.time(),
    }
    return _back_home(True, provider=provider_id)