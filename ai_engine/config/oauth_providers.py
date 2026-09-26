"""Registry of OAuth 2.0 providers the Connectors Hub can authorize against.

Credentials are read from the environment as ``{PREFIX}_CLIENT_ID`` and
``{PREFIX}_CLIENT_SECRET`` where PREFIX is the provider's ``client_env``
(e.g. ``GOOGLE_CLIENT_ID`` / ``GOOGLE_CLIENT_SECRET``). A provider only
completes the handshake when both variables are set — the authorize route
redirects back with a helpful error otherwise.
"""
import os
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple


@dataclass(frozen=True)
class OAuthProvider:
    auth_url: str
    token_url: str
    scopes: Tuple[str, ...]
    client_env: str
    # How the token endpoint authenticates the app:
    #   "secret_body" -> client_secret as a form field (Google, GitHub, Stripe, Slack)
    #   "basic"       -> HTTP Basic auth header (Notion)
    token_auth: str = "secret_body"
    # Extra query params for the authorization URL (e.g. Google's
    # access_type=offline to obtain a refresh token).
    extra_auth_params: Dict[str, str] = field(default_factory=dict)
    # Extra headers for the token exchange (e.g. Notion-Version).
    extra_token_headers: Dict[str, str] = field(default_factory=dict)


GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
# access_type=offline makes Google issue a refresh_token on the first consent.
GOOGLE_EXTRAS = {"access_type": "offline"}

# Connector id -> provider config. Keys match the frontend's OAUTH_PROVIDERS
# connector ids so the authorize URL can be built directly from the id the
# UI sends.
OAUTH_PROVIDERS: Dict[str, OAuthProvider] = {
    "google_sheets": OAuthProvider(
        auth_url=GOOGLE_AUTH,
        token_url=GOOGLE_TOKEN,
        scopes=(
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.readonly",
        ),
        client_env="GOOGLE",
        extra_auth_params=GOOGLE_EXTRAS,
    ),
    "gmail": OAuthProvider(
        auth_url=GOOGLE_AUTH,
        token_url=GOOGLE_TOKEN,
        scopes=(
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
        ),
        client_env="GOOGLE",
        extra_auth_params=GOOGLE_EXTRAS,
    ),
    "google_drive": OAuthProvider(
        auth_url=GOOGLE_AUTH,
        token_url=GOOGLE_TOKEN,
        scopes=("https://www.googleapis.com/auth/drive",),
        client_env="GOOGLE",
        extra_auth_params=GOOGLE_EXTRAS,
    ),
    "google_calendar": OAuthProvider(
        auth_url=GOOGLE_AUTH,
        token_url=GOOGLE_TOKEN,
        scopes=("https://www.googleapis.com/auth/calendar",),
        client_env="GOOGLE",
        extra_auth_params=GOOGLE_EXTRAS,
    ),
    "bigquery": OAuthProvider(
        auth_url=GOOGLE_AUTH,
        token_url=GOOGLE_TOKEN,
        scopes=("https://www.googleapis.com/auth/bigquery.readonly",),
        client_env="GOOGLE",
        extra_auth_params=GOOGLE_EXTRAS,
    ),
    "google_ads": OAuthProvider(
        auth_url=GOOGLE_AUTH,
        token_url=GOOGLE_TOKEN,
        scopes=("https://www.googleapis.com/auth/adwords",),
        client_env="GOOGLE",
        extra_auth_params=GOOGLE_EXTRAS,
    ),
    "github": OAuthProvider(
        auth_url="https://github.com/login/oauth/authorize",
        token_url="https://github.com/login/oauth/access_token",
        scopes=("repo", "read:user"),
        client_env="GITHUB",
    ),
    "stripe": OAuthProvider(
        auth_url="https://connect.stripe.com/oauth/authorize",
        token_url="https://connect.stripe.com/oauth/token",
        scopes=("read_only",),
        client_env="STRIPE",
    ),
    "notion": OAuthProvider(
        auth_url="https://api.notion.com/v1/oauth/authorize",
        token_url="https://api.notion.com/v1/oauth/token",
        scopes=(),
        client_env="NOTION",
        token_auth="basic",
        extra_auth_params={"owner": "user"},
        extra_token_headers={"Notion-Version": "2022-06-28"},
    ),
}


def provider_credentials(provider: OAuthProvider) -> Tuple[Optional[str], Optional[str]]:
    """Return (client_id, client_secret) for a provider from the environment."""
    client_id = os.getenv(f"{provider.client_env}_CLIENT_ID")
    client_secret = os.getenv(f"{provider.client_env}_CLIENT_SECRET")
    return client_id, client_secret