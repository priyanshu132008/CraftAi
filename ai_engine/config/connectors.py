"""Authentication-tier registry for all 40 catalog connectors.

Single source of truth on the backend, mirrored by
``frontend/src/lib/connectorCatalog.tsx`` (CONNECTOR_AUTH). The developer
agent's CONNECTOR_SPECS ids are the catalog; run ``python -m
ai_engine.config.connectors`` to verify every catalog id is classified.

Tiers:
  oauth   -> real OAuth redirect via the /api/oauth engine (see oauth_providers.py)
  api_key -> key / connection string / secret entered by the user, stored in
             the frontend localStorage vault (craftai_connector_vault)
  none    -> zero-auth open SDK, enabled with no credentials
"""

# --- OAuth tier: consent-page redirect -------------------------------------
OAUTH_IDS = frozenset({
    "google_sheets", "gmail", "google_drive", "google_calendar",
    "bigquery", "google_ads", "shopify", "notion",
    # (github OAuth is supported by the engine but has no catalog card yet)
})

# --- API key / vault tier ---------------------------------------------------
# slack connects via incoming webhook / bot token (vault form), not OAuth.
API_KEY_IDS = frozenset({
    "supabase", "postgres", "mongodb", "upstash_redis", "neon", "planetscale",
    "aws", "azure", "firebase",
    "resend", "twilio", "whatsapp_business", "brevo", "telegram_bot",
    "microsoft_teams", "mailgun", "discord_webhook", "slack",
    "openai_api", "anthropic_claude", "google_gemini", "groq", "deepseek",
    "perplexity", "replicate",
    "stripe", "airtable", "looker", "figma_api", "unsplash_api",
})

# --- Zero-auth open SDK tier ------------------------------------------------
NONE_IDS = frozenset({"dev21st_components", "lucide_icons"})

AUTH_TIERS = {cid: tier for ids, tier in (
    (OAUTH_IDS, "oauth"), (API_KEY_IDS, "api_key"), (NONE_IDS, "none"),
) for cid in ids}


if __name__ == "__main__":
    from ai_engine.agents.developer import SUPPORTED_CONNECTORS

    missing = [cid for cid in SUPPORTED_CONNECTORS if cid not in AUTH_TIERS]
    unknown = [cid for cid in AUTH_TIERS if cid not in SUPPORTED_CONNECTORS]
    overlap = OAUTH_IDS & API_KEY_IDS | OAUTH_IDS & NONE_IDS | API_KEY_IDS & NONE_IDS
    assert not missing, f"Unclassified catalog connectors: {missing}"
    assert not unknown, f"Classified ids missing from the catalog: {unknown}"
    assert not overlap, f"Ids in multiple tiers: {overlap}"
    print(f"OK: all {len(SUPPORTED_CONNECTORS)} connectors classified "
          f"({len(OAUTH_IDS)} oauth, {len(API_KEY_IDS)} api_key, {len(NONE_IDS)} none)")