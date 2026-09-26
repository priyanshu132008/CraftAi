"""Agent 2 — The Developer (Full-Stack Architect).

Takes the Architect Agent's structured JSON layout plan and generates a
complete multi-file React + Tailwind project, returned as ONE strict JSON
object:

    {
      "files": [
        {"path": "package.json", "content": "..."},
        {"path": "src/App.tsx", "content": "..."},
        {"path": "src/components/Header.tsx", "content": "..."}
      ]
    }

When connector services are requested (supabase, stripe, resend, twilio,
postgres, …) the prompt instructs the model to include one functional lib
file per connector under src/lib/ with REST fetch boilerplate, plus typed
wrapper clients for any user-defined custom API connectors and MCP servers.

Runs strictly on the local Ollama host (http://localhost:11434/v1) — no cloud
API keys (Groq/NVIDIA) are used for this agent. The model is one of Ollama's
cloud-routed models served through that local endpoint; configurable via the
DEVELOPER_MODEL env var.
"""
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OLLAMA_BASE_URL = "http://localhost:11434/v1"
# deepseek-v4.1-flash:cloud is the default: measured ~40-50s for a full
# 1200-line page (fits the <60s end-to-end API budget), clean raw output,
# all planned sections + palette hexes covered. glm-5.3:cloud is the
# higher-quality but much slower option (~180s on the same task) — select it
# with DEVELOPER_MODEL=glm-5.3:cloud when quality outweighs latency.
DEFAULT_MODEL = os.getenv("DEVELOPER_MODEL", "deepseek-v4.1-flash:cloud")
# Ollama serves local models with any key, but its cloud-routed models
# need the Ollama account key (Ollama_API_KEY in ai_engine/.env).
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", os.getenv("Ollama_API_KEY", "ollama"))

# Pre-built animated UI blocks (HeroSection, DarkNavbar, BentoGridFeatures,
# PricingTable, AuthForm, Footer) authored by the backend team. They are fed
# to the LLM as contextual reference code so generated pages reuse this
# high-quality library instead of rebuilding generic components from scratch.
ROOT = Path(__file__).resolve().parents[2]
COMPONENT_LIBRARY_DIR = ROOT / "backend-craftai" / "ai_engine" / "component_library"

# Functional connector boilerplate specs injected into the prompt when the
# user requests connectors. Each entry tells the model exactly which
# src/lib/ file to generate and the endpoints/auth headers it must
# implement. The generated UI components are required to wire directly to
# these utilities (forms -> discord/sheets, checkout -> stripe, auth ->
# supabase, AI features -> ai).
CONNECTOR_SPECS = {
    # ---- Cloud & Database ---------------------------------------------
    "supabase": {
        "file": "src/lib/supabase.ts",
        "spec": (
            "Supabase client init & auth helpers. Define consts SUPABASE_URL "
            "and SUPABASE_ANON_KEY placeholders (read from import.meta.env "
            "where possible). Export `supabaseSelect(table)` -> GET "
            "`${SUPABASE_URL}/rest/v1/${table}?select=*` with headers "
            "{apikey: SUPABASE_ANON_KEY, Authorization: `Bearer "
            "${SUPABASE_ANON_KEY}`}; `supabaseInsert(table, row)` -> POST "
            "the same base URL with Content-Type: application/json and "
            "Prefer: return=representation; `signIn(email, password)` -> "
            "POST `${SUPABASE_URL}/auth/v1/token?grant_type=password` with "
            "the same apikey header, returning the session JSON. All return "
            "parsed JSON or throw on !ok."
        ),
    },
    "postgres": {
        "file": "src/lib/db.ts",
        "spec": (
            "Postgres query helpers via a server proxy. Export `query(sql, "
            "params)` -> POST to a PG_PROXY_URL placeholder with JSON body "
            "{sql, params}; `queryMany(sql)` mapping the rows. Never embed "
            "DB credentials client-side."
        ),
    },
    "mongodb": {
        "file": "src/lib/db.ts",
        "spec": (
            "MongoDB Data API helpers. Export `mongoFind(collection, "
            "filter)` and `mongoInsert(collection, doc)` -> POST "
            "https://data.mongodb-api.com/app/<DATA_API_APP>/endpoint/v1/"
            "action/{find,insertOne} with api-key MONGODB_DATA_API_KEY "
            "header. Return parsed JSON."
        ),
    },
    "upstash_redis": {
        "file": "src/lib/db.ts",
        "spec": (
            "Upstash Redis REST helpers. Export `redisSet(key, value)` -> "
            "POST `${UPSTASH_REDIS_REST_URL}/set/${key}` with Bearer "
            "UPSTASH_REDIS_TOKEN; `redisGet(key)` -> GET the same base. "
            "Return parsed JSON."
        ),
    },
    "neon": {
        "file": "src/lib/db.ts",
        "spec": (
            "Neon serverless Postgres helpers via its SQL-over-HTTP "
            "endpoint. Export `neonQuery(sql, params)` -> POST the NEON_SQL "
            "URL placeholder with body {query, params}. Return parsed rows."
        ),
    },
    "planetscale": {
        "file": "src/lib/db.ts",
        "spec": (
            "PlanetScale query helpers via its HTTP SQL API. Export "
            "`psQuery(sql, params)` -> POST PLANETSCALE_SQL_URL with Basic "
            "auth (PS_USER:PS_PASSWORD) and JSON body {query, params}."
        ),
    },
    "aws": {
        "file": "src/lib/aws.ts",
        "spec": (
            "AWS helpers. Export `s3Upload(file)` -> POST the "
            "S3_UPLOAD_PRESIGN_URL placeholder with {name, type} to get a "
            "presigned URL, then PUT the raw file to it; `awsInvoke(path, "
            "body)` -> POST `${API_GATEWAY_URL}${path}` with Content-Type: "
            "application/json and the x-api-key AWS_API_KEY placeholder."
        ),
    },
    "azure": {
        "file": "src/lib/azure.ts",
        "spec": (
            "Azure helpers. Export `azureUpload(blobName, file)` -> PUT "
            "`https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/"
            "${AZURE_CONTAINER}/${blobName}${AZURE_SAS_TOKEN}` with header "
            "x-ms-blob-type: BlockBlob; `azureInvoke(fn, body)` -> POST "
            "`https://${AZURE_FUNCTION_APP}.azurewebsites.net/api/${fn}"
            "?code=${AZURE_FUNCTION_KEY}` with JSON body."
        ),
    },
    "bigquery": {
        "file": "src/lib/db.ts",
        "spec": (
            "BigQuery REST query helper. Export `bqQuery(sql)` -> POST "
            "https://bigquery.googleapis.com/bigquery/v2/projects/"
            "<BQ_PROJECT>/queries with Bearer BQ_ACCESS_TOKEN and body "
            "{query: sql}. Return the first result table."
        ),
    },
    # ---- Ecommerce / Productivity -------------------------------------
    "stripe": {
        "file": "src/lib/stripe.ts",
        "spec": (
            "Stripe checkout session & product card handlers. Define const "
            "STRIPE_SECRET_KEY placeholder. Export "
            "`createStripeCheckoutSession(lineItems)` -> POST "
            "https://api.stripe.com/v1/checkout/sessions with Authorization: "
            "`Bearer ${STRIPE_SECRET_KEY}` and Content-Type: "
            "application/x-www-form-urlencoded body encoding "
            "line_items[0][price_data][currency], [product_data][name] and "
            "[unit_amount], plus success_url/cancel_url placeholders; "
            "`fetchStripeProducts()` -> GET https://api.stripe.com/v1/products "
            "with the same auth header, returning data. Return parsed JSON."
        ),
    },
    "airtable": {
        "file": "src/lib/sheets.ts",
        "spec": (
            "Airtable REST CRUD helpers for MIS / inventory / reporting "
            "tables (share the file with google_sheets when both are "
            "requested). Define consts AIRTABLE_API_KEY and AIRTABLE_BASE_ID "
            "placeholders. Export `airtableList(table)` -> GET "
            "`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}` with "
            "Authorization: `Bearer ${AIRTABLE_API_KEY}`; "
            "`airtableCreate(table, fields)` -> POST {records: [{fields}]} "
            "with Content-Type: application/json. Return parsed JSON."
        ),
    },
    "shopify": {
        "file": "src/lib/shopify.ts",
        "spec": (
            "Shopify Storefront API helpers. Export `shopifyProducts("
            "first)` -> POST `https://${SHOPIFY_STORE}.myshopify.com/api/"
            "2024-07/graphql.json` with X-Shopify-Storefront-Access-Token: "
            "SHOPIFY_STOREFRONT_TOKEN and GraphQL query { products(first) "
            "{ edges { node { id title featuredImage { url } priceRange "
            "{ minVariantAmount { amount currencyCode } } } } } }; "
            "`addToCart(variantId)` -> cartCreate mutation returning the "
            "checkoutUrl. Product grids MUST render fetched products with "
            "checkout links to the cart URL."
        ),
    },
    "notion": {
        "file": "src/lib/notion.ts",
        "spec": (
            "Notion integration helpers. Export `notionQuery("
            "databaseId)` -> POST https://api.notion.com/v1/databases/"
            "${databaseId}/query with Bearer NOTION_INTEGRATION_TOKEN, "
            "Notion-Version: 2022-06-28 and Content-Type: application/json; "
            "`notionAppend(pageId, text)` -> PATCH https://api.notion.com/v1/"
            "blocks/${pageId}/children with a paragraph block body. Return "
            "parsed JSON pages for task/blog lists."
        ),
    },
    "looker": {
        "file": "src/lib/looker.ts",
        "spec": (
            "Looker API helpers. Export `lookerRunQuery(lookId, filters)` -> "
            "POST https://${LOOKER_HOST}/api/4.0/queries/run/json with "
            "Bearer LOOKER_API_TOKEN and body {look_id, filters}; map the "
            "returned rows into dashboard stat cards and tables."
        ),
    },
    # ---- Google --------------------------------------------------------
    "google_sheets": {
        "file": "src/lib/sheets.ts",
        "spec": (
            "Google Sheets REST CRUD helpers for MIS / student / inventory / "
            "reporting data tables. Define consts GOOGLE_SHEETS_ID and "
            "GOOGLE_API_KEY placeholders. Export `readSheet(range)` -> GET "
            "`https://sheets.googleapis.com/v4/spreadsheets/"
            "${GOOGLE_SHEETS_ID}/values/${range}?key=${GOOGLE_API_KEY}`; "
            "`appendRow(range, values)` -> POST the same URL with "
            "`:append?valueInputOption=USER_ENTERED&key=...` and body "
            "{values: [values]}. Return parsed JSON."
        ),
    },
    "gmail": {
        "file": "src/lib/email.ts",
        "spec": (
            "Gmail REST helpers. Export `sendGmail(to, subject, body)` -> "
            "POST https://gmail.googleapis.com/gmail/v1/users/me/messages/"
            "send with Bearer GMAIL_TOKEN and body {raw: base64url-encoded "
            "RFC2822 message}; `listGmail(query)` -> GET .../messages?q=."
        ),
    },
    "google_drive": {
        "file": "src/lib/google.ts",
        "spec": (
            "Google Drive REST helpers. Export `driveList(query)` -> GET "
            "https://www.googleapis.com/drive/v3/files?q= with Bearer "
            "GOOGLE_TOKEN; `driveUpload(name, mimeType, base64Data)` -> "
            "multipart POST to .../upload/drive/v3/files."
        ),
    },
    "google_calendar": {
        "file": "src/lib/google.ts",
        "spec": (
            "Google Calendar REST helpers (share google.ts with "
            "google_drive). Export `listEvents()` -> GET https://www."
            "googleapis.com/calendar/v3/calendars/primary/events with "
            "Bearer GOOGLE_TOKEN; `createEvent(event)` -> POST the same "
            "URL with the event JSON body."
        ),
    },
    "google_ads": {
        "file": "src/lib/google.ts",
        "spec": (
            "Google Ads helper (share google.ts). Export `adsStats("
            "campaignId)` -> GET https://googleads.googleapis.com/v17/"
            "customers/${ADS_CUSTOMER_ID}/campaigns/${campaignId} with "
            "Bearer GOOGLE_TOKEN, formatted for dashboard stat cards."
        ),
    },
    "firebase": {
        "file": "src/lib/firebase.ts",
        "spec": (
            "Firebase Realtime DB REST helpers. Export `firebaseGet(path)` "
            "-> GET `https://${FIREBASE_PROJECT_ID}.firebaseio.com/"
            "${path}.json`; `firebasePush(path, data)` -> POST the same "
            "URL with JSON body. Return parsed JSON."
        ),
    },
    # ---- Messaging & OTP ------------------------------------------------
    "resend": {
        "file": "src/lib/email.ts",
        "spec": (
            "Resend email dispatch. Export `sendEmail(to, subject, html)` -> "
            "POST https://api.resend.com/emails with Authorization: Bearer "
            "RESEND_API_KEY, Content-Type: application/json and body "
            "{from: 'onboarding@resend.dev', to, subject, html}. Return "
            "parsed JSON."
        ),
    },
    "brevo": {
        "file": "src/lib/email.ts",
        "spec": (
            "Brevo transactional email helper (share email.ts). Export "
            "`brevoSendEmail(to, subject, html)` -> POST https://api.brevo."
            "com/v3/smtp/email with header api-key: BREVO_API_KEY and body "
            "{sender: {email: 'noreply@example.com'}, to: [{email}], "
            "subject, htmlContent: html}."
        ),
    },
    "mailgun": {
        "file": "src/lib/email.ts",
        "spec": (
            "Mailgun email dispatch helper (share email.ts). Export "
            "`mailgunSend(to, subject, text)` -> POST `https://api.mailgun."
            "net/v3/${MAILGUN_DOMAIN}/messages` with Basic auth "
            "api:MAILGUN_API_KEY and form-encoded to/subject/text."
        ),
    },
    "twilio": {
        "file": "src/lib/otp.ts",
        "spec": (
            "Twilio SMS/OTP verification helper. Export `sendOtp(to)` -> "
            "generate a 6-digit code, POST https://api.twilio.com/2010-04-01/"
            "Accounts/${TWILIO_SID}/Messages.json with Basic auth "
            "TWILIO_SID:TWILIO_AUTH_TOKEN, form-encoded To/From/Body with "
            "the code; `verifyOtp(to, code)` -> compare against the stored "
            "code (kept in a module Map for the demo)."
        ),
    },
    "whatsapp_business": {
        "file": "src/lib/messaging.ts",
        "spec": (
            "WhatsApp Cloud API helpers. Export `sendWhatsAppTemplate(to, "
            "template)` -> POST https://graph.facebook.com/v19.0/"
            "${WHATSAPP_PHONE_ID}/messages with Bearer META_ACCESS_TOKEN "
            "and body {messaging_product: 'whatsapp', to, type: 'template', "
            "template}."
        ),
    },
    "telegram_bot": {
        "file": "src/lib/messaging.ts",
        "spec": (
            "Telegram bot helpers (share messaging.ts). Export "
            "`sendTelegramMessage(chatId, text)` -> POST https://api."
            "telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage with JSON "
            "body {chat_id, text}. Return parsed JSON."
        ),
    },
    "slack": {
        "file": "src/lib/messaging.ts",
        "spec": (
            "Slack Web API helpers (share messaging.ts). Export "
            "`postSlackMessage(channel, text)` -> POST https://slack.com/"
            "api/chat.postMessage with Bearer SLACK_BOT_TOKEN and JSON body "
            "{channel, text}. Return parsed JSON."
        ),
    },
    "microsoft_teams": {
        "file": "src/lib/messaging.ts",
        "spec": (
            "Microsoft Teams webhook helpers (share messaging.ts). Export "
            "`sendTeamsMessage(title, text)` -> POST the "
            "TEAMS_INCOMING_WEBHOOK_URL placeholder with an Adaptive Card "
            "JSON body. Return true on 200."
        ),
    },
    "discord_webhook": {
        "file": "src/lib/discord.ts",
        "spec": (
            "Discord form-submission handler. Define const DISCORD_WEBHOOK_URL "
            "placeholder. Export `sendDiscordForm(fields: Record<string, "
            "string>)` -> POST the webhook URL with JSON body {content: "
            "formatted message from fields} and Content-Type: "
            "application/json. Return true on 204/200, throw otherwise."
        ),
    },
    # ---- AI Providers -----------------------------------------------------
    "openai_api": {
        "file": "src/lib/ai.ts",
        "spec": (
            "Client-side AI feature helpers. Define const OPENAI_API_KEY "
            "placeholder. Export `chatCompletion(messages)` -> POST "
            "https://api.openai.com/v1/chat/completions with Authorization: "
            "`Bearer ${OPENAI_API_KEY}`, Content-Type: application/json and "
            "body {model: 'gpt-4o-mini', messages}; `generateImage(prompt)` -> "
            "POST https://api.openai.com/v1/images/generations with body "
            "{model: 'gpt-image-1', prompt}. Return parsed JSON."
        ),
    },
    "anthropic_claude": {
        "file": "src/lib/aiProviders.ts",
        "spec": (
            "Anthropic Claude fetch helper. Export `claudeCompletion("
            "messages, system?)` -> POST https://api.anthropic.com/v1/"
            "messages with headers x-api-key: ANTHROPIC_API_KEY and "
            "anthropic-version: 2023-06-01, body {model: "
            "'claude-sonnet-5', max_tokens: 1024, system, messages}; "
            "return the first text block."
        ),
    },
    "google_gemini": {
        "file": "src/lib/aiProviders.ts",
        "spec": (
            "Google Gemini helper (share aiProviders.ts). Export "
            "`geminiGenerate(prompt)` -> POST https://"
            "generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.5-flash:generateContent with x-goog-api-key: "
            "GEMINI_API_KEY and body {contents: [{parts: [{text: "
            "prompt}]}]}; return the first candidate's text."
        ),
    },
    "groq": {
        "file": "src/lib/aiProviders.ts",
        "spec": (
            "Groq helper (share aiProviders.ts). Export `groqChat("
            "messages)` -> POST https://api.groq.com/openai/v1/chat/"
            "completions with Bearer GROQ_API_KEY and body {model: "
            "'llama-3.3-70b-versatile', messages}. Return the reply text."
        ),
    },
    "deepseek": {
        "file": "src/lib/aiProviders.ts",
        "spec": (
            "DeepSeek helper (share aiProviders.ts). Export `deepseekChat("
            "messages)` -> POST https://api.deepseek.com/chat/completions "
            "with Bearer DEEPSEEK_API_KEY and body {model: 'deepseek-chat', "
            "messages}. Return the reply text."
        ),
    },
    "perplexity": {
        "file": "src/lib/aiProviders.ts",
        "spec": (
            "Perplexity search helper (share aiProviders.ts). Export "
            "`perplexitySearch(query)` -> POST https://api.perplexity.ai/"
            "chat/completions with Bearer PERPLEXITY_API_KEY and body "
            "{model: 'sonar', messages: [{role: 'user', content: query}]}. "
            "Return the reply text with citations."
        ),
    },
    "replicate": {
        "file": "src/lib/aiProviders.ts",
        "spec": (
            "Replicate helper (share aiProviders.ts). Export `replicateRun("
            "version, input)` -> POST https://api.replicate.com/v1/"
            "predictions with Bearer REPLICATE_API_TOKEN and body {version, "
            "input}; poll GET .../predictions/{id} until succeeded."
        ),
    },
    # ---- Design & Assets ----------------------------------------------------
    "dev21st_components": {
        "file": "src/lib/uiComponents.ts",
        "spec": (
            "21st.dev component patterns. NEVER import from an external "
            "registry — build the components locally under src/components/"
            "ui/ (Button, Card, Input, Badge, Tabs …) with Tailwind variant "
            "maps following 21st.dev/shadcn patterns, and export a catalog "
            "object {Button, Card, Input} from src/lib/uiComponents.ts."
        ),
    },
    "figma_api": {
        "file": "src/lib/figma.ts",
        "spec": (
            "Figma API helper. Export `fetchFigmaFile(fileKey)` -> GET "
            "https://api.figma.com/v1/files/${fileKey} with header "
            "X-Figma-Token: FIGMA_TOKEN; extract fill colors from the "
            "document to drive the palette."
        ),
    },
    "unsplash_api": {
        "file": "src/lib/assets.ts",
        "spec": (
            "Unsplash stock-image helpers. Export `searchUnsplash(query)` -> "
            "GET https://api.unsplash.com/search/photos?query=${query} with "
            "Authorization: Client-ID UNSPLASH_ACCESS_KEY; use the returned "
            "regular URL as <img src> wherever the plan calls for imagery."
        ),
    },
    "lucide_icons": {
        # Instructional connector: no lib file — permits lucide-react icons.
        "file": None,
        "spec": (
            "Use lucide-react icon components across the UI (add "
            "'lucide-react' to package.json dependencies and import named "
            "icons, e.g. \"import { Sparkles } from 'lucide-react'\") "
            "instead of emoji or text glyphs."
        ),
    },
}
SUPPORTED_CONNECTORS = tuple(CONNECTOR_SPECS)

# Category 2 (Cloud & Database) vault fields -> generated .env variable names.
# VITE_-prefixed because generated client code reads them via
# import.meta.env, which only exposes VITE_* vars to the browser bundle.
# Mirrors frontend/src/config/category2Schemas.ts — also the trust-boundary
# whitelist for the /generate-project connector_secrets payload.
CATEGORY2_ENV_VARS = {
    "supabase": {
        "url": "VITE_SUPABASE_URL",
        "anonKey": "VITE_SUPABASE_ANON_KEY",
        "serviceKey": "VITE_SUPABASE_SERVICE_ROLE_KEY",
    },
    "postgres": {"connectionString": "VITE_DATABASE_URL"},
    "mongodb": {"connectionString": "VITE_MONGODB_URI"},
    "upstash_redis": {
        "url": "VITE_UPSTASH_REDIS_REST_URL",
        "token": "VITE_UPSTASH_REDIS_REST_TOKEN",
    },
    "neon": {"connectionString": "VITE_NEON_DATABASE_URL"},
    "planetscale": {"connectionString": "VITE_PLANETSCALE_DATABASE_URL"},
    "aws": {
        "accessKeyId": "VITE_AWS_ACCESS_KEY_ID",
        "secretAccessKey": "VITE_AWS_SECRET_ACCESS_KEY",
        "region": "VITE_AWS_REGION",
        "s3Bucket": "VITE_AWS_S3_BUCKET",
    },
    "azure": {
        "connectionString": "VITE_AZURE_STORAGE_CONNECTION_STRING",
        "accountKey": "VITE_AZURE_ACCOUNT_KEY",
    },
}

# Category 3 (Messaging & OTP) vault fields -> generated .env variable names.
# Mirrors frontend/src/config/category3Schemas.ts.
CATEGORY3_ENV_VARS = {
    "resend": {
        "apiKey": "VITE_RESEND_API_KEY",
        "fromEmail": "VITE_RESEND_FROM_EMAIL",
    },
    "twilio": {
        "accountSid": "VITE_TWILIO_ACCOUNT_SID",
        "authToken": "VITE_TWILIO_AUTH_TOKEN",
        "phoneNumber": "VITE_TWILIO_SENDER_PHONE",
    },
    "slack": {"webhookOrToken": "VITE_SLACK_WEBHOOK_URL"},
    "discord_webhook": {"webhookUrl": "VITE_DISCORD_WEBHOOK_URL"},
    "whatsapp_business": {
        "accessToken": "VITE_WHATSAPP_ACCESS_TOKEN",
        "phoneNumberId": "VITE_WHATSAPP_PHONE_NUMBER_ID",
        "wabaId": "VITE_WHATSAPP_WABA_ID",
    },
    "brevo": {
        "apiKey": "VITE_BREVO_API_KEY",
        "senderEmail": "VITE_BREVO_SENDER_EMAIL",
    },
    "telegram_bot": {
        "botToken": "VITE_TELEGRAM_BOT_TOKEN",
        "chatId": "VITE_TELEGRAM_CHAT_ID",
    },
    "microsoft_teams": {"webhookUrl": "VITE_TEAMS_WEBHOOK_URL"},
    "mailgun": {
        "apiKey": "VITE_MAILGUN_API_KEY",
        "domain": "VITE_MAILGUN_DOMAIN",
        "region": "VITE_MAILGUN_REGION",
    },
}

# Category 4 (AI Providers) vault fields -> generated .env variable names.
# Mirrors frontend/src/config/category4Schemas.ts.
CATEGORY4_ENV_VARS = {
    "openai_api": {
        "apiKey": "VITE_OPENAI_API_KEY",
        "baseUrl": "VITE_OPENAI_BASE_URL",
    },
    "anthropic_claude": {"apiKey": "VITE_ANTHROPIC_API_KEY"},
    "google_gemini": {"apiKey": "VITE_GEMINI_API_KEY"},
    "groq": {"apiKey": "VITE_GROQ_API_KEY"},
    "deepseek": {
        "apiKey": "VITE_DEEPSEEK_API_KEY",
        "baseUrl": "VITE_DEEPSEEK_BASE_URL",
    },
    "perplexity": {"apiKey": "VITE_PERPLEXITY_API_KEY"},
    "replicate": {"apiKey": "VITE_REPLICATE_API_KEY"},
}

# Categories 5-7 (Ecommerce, Productivity, Design & Assets) vault fields ->
# generated .env variable names. Mirrors frontend/src/config/category567Schemas.ts.
CATEGORY567_ENV_VARS = {
    "stripe": {
        "publishableKey": "VITE_STRIPE_PUBLISHABLE_KEY",
        "secretKey": "VITE_STRIPE_SECRET_KEY",
    },
    "airtable": {
        "pat": "VITE_AIRTABLE_PAT",
        "baseId": "VITE_AIRTABLE_BASE_ID",
    },
    "looker": {
        "clientId": "VITE_LOOKER_CLIENT_ID",
        "clientSecret": "VITE_LOOKER_CLIENT_SECRET",
        "hostUrl": "VITE_LOOKER_HOST_URL",
    },
    "figma_api": {"pat": "VITE_FIGMA_PAT"},
    "unsplash_api": {"accessKey": "VITE_UNSPLASH_ACCESS_KEY"},
    "firebase": {"apiKey": "VITE_FIREBASE_API_KEY"},
}

# Merged vault whitelist: every connector whose multi-field secrets the
# /generate-project payload may carry.
VAULT_ENV_VARS = {**CATEGORY2_ENV_VARS, **CATEGORY3_ENV_VARS,
                 **CATEGORY4_ENV_VARS, **CATEGORY567_ENV_VARS}


def _load_component_library() -> str:
    """Format the component templates as reference context for the LLM.

    Returns "" when the library is missing/empty so generation degrades
    gracefully to from-scratch components.
    """
    if not COMPONENT_LIBRARY_DIR.is_dir():
        print(f"[DeveloperAgent] component library not found at "
              f"{COMPONENT_LIBRARY_DIR} — generating from scratch")
        return ""
    blocks = []
    for path in sorted(COMPONENT_LIBRARY_DIR.glob("*.txt")):
        code = path.read_text(encoding="utf-8").strip()
        if code:
            blocks.append(f"--- Component: {path.stem} ---\n{code}")
    return "\n\n".join(blocks)


SYSTEM_PROMPT = """You are an Elite Full-Stack Architect Developer Agent.
Your ONLY job is to turn a structured JSON layout plan into a complete,
multi-file React + Tailwind CSS project — returned as ONE strict JSON object.

OUTPUT FORMAT (mandatory):
Return ONLY a single JSON object with this EXACT structure, no markdown
fences, no commentary before or after:
{
  "files": [
    {"path": "package.json", "content": "..."},
    {"path": "src/App.tsx", "content": "..."},
    {"path": "src/components/Header.tsx", "content": "..."}
  ]
}
Every "content" value MUST be a valid JSON string: escape newlines as \\n,
double quotes as \\", and backslashes as \\\\. The entire response must be
parseable by json.loads.

FILE SET RULES:
- ALWAYS include a "package.json" and an entry "src/App.tsx".
- "src/App.tsx" MUST default-export the root React component and compose the
  page from one local component file per major section, placed under
  "src/components/" (e.g. src/components/Hero.tsx, src/components/Features.tsx).
- Import components with RELATIVE paths only ("./components/Hero"). NEVER
  use path aliases ("@/...") or next/* — the project is compiled by Vite.
- If the request includes a "Requested connectors" section, generate the
  specified src/lib/ lib files implementing exactly the per-file boilerplate
  specs, plus any listed custom API / MCP client files.
- External imports are limited to "react" and "framer-motion" (motion.div,
  motion.h1 etc.) — plus "lucide-react" ONLY when lucide_icons is requested.
  NO other libraries, NO image files — use styled gradient/pattern
  placeholder <div>s for imagery (or unsplash_api image URLs when requested).

DESIGN RULES (apply to every .tsx file):
- Implement EVERY section listed in the plan's "sections" array, in order,
  as semantic JSX with real, niche-appropriate copy (no lorem ipsum).
- Reuse the pre-built CraftAI component blocks supplied as reference where a
  plan section matches: adapt the block's code into its own component file,
  swap in the plan's palette hexes and niche copy, and preserve the block's
  framer-motion animation patterns and typography scale.
- Style everything with Tailwind CSS utility classes ONLY — no external CSS
  files, no CSS-in-JS, no styled-components.
- NEVER emit a bare/unstyled interactive element. Every <button>, <a> used
  as a button, <input>, <select> and <textarea> MUST carry complete Tailwind
  utility classes covering background, text color, padding, radius, border
  and hover/transition — e.g.
  <button className="px-4 py-2 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors">.
- Apply the plan's "theme" (dark/light) and use the exact hex colors from
  "color_palette" via inline arbitrary-value classes (e.g. bg-[#0B0F14],
  text-[#D4AF37]) so the rendered site matches the palette.
- Include subtle transitions/animations where appropriate (hover states,
  opacity/transform transitions).
- Be fully responsive (mobile-first: stacked grids, sm:/md:/lg: breakpoints)."""


class DeveloperAgent:
    """Generates a full multi-file React project from an Architect JSON plan."""

    def __init__(self, model: str = None, base_url: str = OLLAMA_BASE_URL):
        # Strictly the local Ollama host, even though the model itself is
        # cloud-routed by Ollama (requires the Ollama account key).
        self.base_url = base_url
        self.model = model or DEFAULT_MODEL
        self.client = OpenAI(base_url=self.base_url, api_key=OLLAMA_API_KEY)
        # Pre-built block manifests, injected into every generation request.
        self.library_context = _load_component_library()

    def generate_files(self, plan_json: dict, connectors=None,
                       custom_connectors=None, mcp_servers=None,
                       connector_rules=None, connector_secrets=None) -> list:
        """Turn an Architect plan dict into a list of {path, content} files.

        Returns [] if the local Ollama call fails or the output cannot be
        parsed into a valid file tree, so the pipeline can detect and report
        the failure instead of crashing.
        """
        connectors = [c for c in (connectors or []) if c in CONNECTOR_SPECS]
        try:
            user_content = self._format_plan(
                plan_json, connectors, custom_connectors, mcp_servers,
                connector_rules, connector_secrets)
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ]
            try:
                # Structured-output mode first: most cloud-routed Ollama
                # models honor it and it eliminates fence/prose stripping.
                response = self.client.chat.completions.create(
                    model=self.model, messages=messages,
                    temperature=0.3, response_format={"type": "json_object"},
                )
            except Exception:
                # Retry without response_format for models/endpoints that
                # reject it — _parse_files tolerates fences and prose.
                response = self.client.chat.completions.create(
                    model=self.model, messages=messages, temperature=0.3,
                )
            content = response.choices[0].message.content
            return self._parse_files(content)
        except Exception as e:
            print(f"[DeveloperAgent] Local Ollama call failed: {e}")
            return []

    @staticmethod
    def _slugify(name: str) -> str:
        """Connector name -> safe kebab-ish file slug."""
        slug = re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")
        return slug[:40] or "api"

    @staticmethod
    def _format_plan(plan_json: dict, connectors=None,
                     custom_connectors=None, mcp_servers=None,
                     connector_rules=None, connector_secrets=None) -> str:
        """Render the plan (+ connector/custom-API/MCP specs) for the user
        message. Kept as pretty JSON so the model sees the exact structure
        the Architect produced."""
        parts = [
            "Generate the full project for this layout plan:\n\n",
            json.dumps(plan_json, indent=2),
        ]
        if connectors:
            parts.append(
                "\n\nRequested connectors: "
                + ", ".join(connectors)
                + "\nGenerate the specified lib file for each connector with "
                "functional, ready-to-run REST fetch boilerplate following "
                "these specs:\n"
            )
            for name in connectors:
                spec = CONNECTOR_SPECS[name]
                if spec["file"]:
                    parts.append(f"- {name} -> generate \"{spec['file']}\": "
                                 f"{spec['spec']}\n")
                else:
                    parts.append(f"- {name}: {spec['spec']}\n")
            parts.append(
                "The UI components MUST wire DIRECTLY to these src/lib/ "
                "utilities: contact/feedback forms submit via messaging or "
                "email libs, checkout buttons call stripe.ts, auth and data "
                "flows use supabase.ts / db.ts, AI features call ai.ts / "
                "aiProviders.ts. Import them with relative paths "
                "(e.g. \"../lib/discord\").\n"
                "Every lib file must be REAL, non-mock SDK code: read all "
                "keys/URLs/tokens at runtime from Vite environment variables "
                "(const KEY = import.meta.env.VITE_STRIPE_SECRET_KEY ?? ''), "
                "NEVER hardcoded placeholders; wrap every fetch in try/catch "
                "and throw a typed Error with the endpoint and status on "
                "!response.ok.\n"
            )
        if connector_secrets:
            parts.append(
                "\nWorkspace vault credentials — ALSO generate a \".env\" "
                "file in the project root with EXACTLY these lines (real "
                "values, verbatim), and reference each variable as "
                "import.meta.env.<NAME> inside the matching src/lib/ client:\n"
            )
            for cid, fields in (connector_secrets or {}).items():
                env_map = VAULT_ENV_VARS.get(cid, {})
                for fkey, value in (fields or {}).items():
                    env_name = env_map.get(fkey)
                    if env_name and value:
                        parts.append(f"{env_name}={value}\n")
            parts.append(
                "The .env file MUST be included in the returned files list. "
                "Never hardcode these values in lib files — read them from "
                "import.meta.env at runtime.\n"
            )
        if connector_rules:
            parts.append("\nAgent tool permissions (user's connector vault):\n")
            for cid, rule in connector_rules.items():
                perm = rule.get("permission", "ask")
                env = f"import.meta.env.VITE_{cid.upper()}_KEY"
                if rule.get("credentials"):
                    note = f"{env} holds a real key at runtime"
                else:
                    note = (f"{env} may be empty — code must surface a clear "
                            "'credentials missing' error, not crash")
                behavior = {
                    "always": "wire app features DIRECTLY to this lib",
                    "ask": ("wire features behind an explicit user action "
                            "(button/form submit), never auto-fire"),
                    "never": ("generate the lib file but do NOT wire any "
                              "feature to it automatically"),
                }.get(perm, "wire behind explicit user actions")
                parts.append(f"- {cid}: permission={perm} — {behavior}; {note}\n")
        if custom_connectors:
            parts.append(
                "\nCustom API connectors — generate a TYPED wrapper client "
                "under src/lib/api/ for EACH, using the given base URL, "
                "auth header and schema:\n"
            )
            for cc in custom_connectors:
                slug = DeveloperAgent._slugify(cc.get("name", ""))
                headers = cc.get("headers") or {}
                parts.append(
                    f"- {cc.get('name')} -> generate \"src/lib/api/{slug}.ts\": "
                    f"base URL {cc.get('baseUrl')}, auth header(s) "
                    f"{json.dumps(headers)} (reference secret values via "
                    "import.meta.env placeholders, never hardcode)."
                )
                schema = (cc.get("openApiSchema") or "").strip()
                if schema:
                    parts.append(f"\n  Its OpenAPI schema summary:\n"
                                 f"{schema[:4000]}")
                else:
                    parts.append(" No schema provided — expose typed "
                                 "generic helpers apiGet(path), apiPost(path, "
                                 "body) against the base URL.")
                parts.append("\n")
        if mcp_servers:
            parts.append(
                "\nMCP servers connected by the user — generate a single "
                "\"src/lib/mcp.ts\" with a `callMcp(serverName, method, "
                "params)` helper that POSTs {jsonrpc: '2.0', id, method, "
                "params} to the matching server URL with Authorization: "
                "Bearer <token placeholder>:\n"
            )
            for srv in mcp_servers:
                parts.append(f"- {srv.get('name')} at {srv.get('serverUrl')}\n")
            parts.append(
                "Wire relevant app features to these MCP tools where the "
                "plan calls for them.\n"
            )
        return "".join(parts)

    @staticmethod
    def _parse_files(content: str) -> list:
        """Safely parse the model output into a normalized files list.

        Escalating salvage ladder, since small local models slip:
        1. direct json.loads (after fence stripping)
        2. slice out the outermost {...} object and parse that
        3. regex-salvage path/content pairs (tolerates raw newlines inside
           string values, which strict JSON rejects)
        4. if the response is raw code (model ignored the JSON contract),
           wrap it as a single src/App.tsx so the pipeline still yields a
           working preview
        Returns [] when nothing usable can be extracted.
        """
        if not content or not content.strip():
            return []

        text = content.strip()
        text = re.sub(r"^```[a-zA-Z0-9]*\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text).strip()

        files = DeveloperAgent._try_load_files(text)
        if files:
            return files

        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            files = DeveloperAgent._try_load_files(text[start:end + 1])
            if files:
                return files

        files = DeveloperAgent._salvage_files(text)
        if files:
            print("[DeveloperAgent] JSON salvage ladder step 3: recovered "
                  f"{len(files)} files via regex extraction")
            return files

        # Last resort: the model returned raw page code instead of JSON.
        m = re.search(r'^(?:["\']use client["\'];?|import\s)', text, re.MULTILINE)
        if m:
            print("[DeveloperAgent] output was raw code, not JSON — "
                  "wrapping as a single src/App.tsx")
            return [{"path": "src/App.tsx", "content": text.strip()}]
        return []

    @staticmethod
    def _try_load_files(text: str) -> list:
        """Parse `text` as a whole JSON document and normalize its files."""
        try:
            data = json.loads(text)
        except (json.JSONDecodeError, ValueError):
            return []
        return DeveloperAgent._normalize_files(data)

    @staticmethod
    def _normalize_files(data) -> list:
        """Validate the parsed document and return a clean files list.

        Accepts {"files": [...]} (the contract) or a bare list of file
        objects. Drops entries without a usable path/content; returns [] when
        nothing survives.
        """
        if isinstance(data, dict):
            data = data.get("files")
        if not isinstance(data, list):
            return []
        files = []
        for entry in data:
            if not isinstance(entry, dict):
                continue
            path = str(entry.get("path", "")).strip().lstrip("./")
            content = entry.get("content")
            if not path or not isinstance(content, str) or not content.strip():
                continue
            files.append({"path": path, "content": content})
        return files

    @staticmethod
    def _salvage_files(text: str) -> list:
        """Regex-extract path/content pairs without full JSON validity.

        Handles the most common small-model failure: literal (unescaped)
        newlines inside the content string. Both key orders are tried.
        """
        files = []
        for pattern in (
            r'"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"',
            r'"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"path"\s*:\s*"([^"]+)"',
        ):
            for match in re.finditer(pattern, text, re.DOTALL):
                if pattern.startswith('"path"'):
                    path, raw_content = match.group(1), match.group(2)
                else:
                    raw_content, path = match.group(1), match.group(2)
                try:
                    content = json.loads(f'"{raw_content}"')
                except (json.JSONDecodeError, ValueError):
                    content = raw_content
                path = path.strip().lstrip("./")
                if path and content.strip():
                    files.append({"path": path, "content": content})
            if files:
                break
        return files