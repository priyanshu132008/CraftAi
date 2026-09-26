"""Category 2 (Cloud & Database) vault secrets — extraction whitelist and
Developer Agent .env injection."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_engine.main import _extract_connector_secrets
from ai_engine.agents.developer import DeveloperAgent


def test_connector_secrets_whitelist():
    payload = {
        "connector_secrets": {
            "supabase": {"url": "https://x.supabase.co", "anonKey": "eyJ",
                         "bogusField": "x", "serviceKey": "  "},
            "aws": {"accessKeyId": "AKIA", "secretAccessKey": "wJal",
                    "region": "us-east-1", "s3Bucket": ""},
            "postgres": {"connectionString": "postgresql://u:p@h/db"},
            "evil": {"connectionString": "postgresql://evil"},       # unknown connector
            "notion": {"url": "https://nope"},                      # not Category 2
        }
    }
    out = _extract_connector_secrets(payload)
    assert out["supabase"] == {"url": "https://x.supabase.co", "anonKey": "eyJ"}
    assert out["aws"] == {"accessKeyId": "AKIA", "secretAccessKey": "wJal",
                          "region": "us-east-1"}
    assert out["postgres"] == {"connectionString": "postgresql://u:p@h/db"}
    assert "evil" not in out and "notion" not in out
    assert _extract_connector_secrets({}) == {}
    assert _extract_connector_secrets({"connector_secrets": "junk"}) == {}


def test_format_plan_injects_env_lines():
    plan = {"type": "landing", "sections": ["Hero"]}
    secrets = {"supabase": {"url": "https://x.supabase.co",
                            "anonKey": "eyJ-anon"},
               "resend": {"apiKey": "re_123", "fromEmail": "hi@resend.dev"},
               "twilio": {"accountSid": "AC123"}}
    content = DeveloperAgent._format_plan(
        plan, ["supabase", "resend", "twilio"], connector_secrets=secrets)
    assert "VITE_SUPABASE_URL=https://x.supabase.co" in content
    assert "VITE_SUPABASE_ANON_KEY=eyJ-anon" in content
    assert "VITE_RESEND_API_KEY=re_123" in content
    assert "VITE_RESEND_FROM_EMAIL=hi@resend.dev" in content
    assert "VITE_TWILIO_ACCOUNT_SID=AC123" in content
    assert ".env" in content


def test_category3_secret_whitelist():
    payload = {"connector_secrets": {
        "twilio": {"accountSid": "AC123", "authToken": "tok",
                   "bogus": "x"},
        "resend": {"apiKey": "re_1"},
        "slack": {"webhookOrToken": "https://hooks.slack.com/services/T/B/X"},
    }}
    out = _extract_connector_secrets(payload)
    assert out["twilio"] == {"accountSid": "AC123", "authToken": "tok"}
    assert out["resend"] == {"apiKey": "re_1"}
    assert out["slack"] == {"webhookOrToken":
                            "https://hooks.slack.com/services/T/B/X"}


def test_category4_secret_whitelist_and_env():
    payload = {"connector_secrets": {
        "openai_api": {"apiKey": "sk-proj-1", "baseUrl": "https://api.openai.com/v1"},
        "deepseek": {"apiKey": "sk-ds", "baseUrl": ""},
        "groq": {"apiKey": "gsk_1"},
    }}
    out = _extract_connector_secrets(payload)
    assert out["openai_api"] == {"apiKey": "sk-proj-1",
                                 "baseUrl": "https://api.openai.com/v1"}
    assert out["deepseek"] == {"apiKey": "sk-ds"}  # empty field dropped
    assert out["groq"] == {"apiKey": "gsk_1"}
    content = DeveloperAgent._format_plan(
        {"type": "landing", "sections": ["Hero"]}, ["openai_api"],
        connector_secrets=out)
    assert "VITE_OPENAI_API_KEY=sk-proj-1" in content
    assert "VITE_OPENAI_BASE_URL=https://api.openai.com/v1" in content


def test_category567_secret_whitelist_and_env():
    payload = {"connector_secrets": {
        "stripe": {"publishableKey": "pk_test_51", "secretKey": "sk_test_51",
                   "bogus": "x"},
        "looker": {"clientId": "cid", "clientSecret": "sec",
                   "hostUrl": "https://x.looker.com"},
        "airtable": {"pat": "pat1", "baseId": ""},
        "figma_api": {"pat": "figd_1"},
        "unsplash_api": {"accessKey": "uns_1"},
        "firebase": {"apiKey": "AIzaSy1"},
    }}
    out = _extract_connector_secrets(payload)
    assert out["stripe"] == {"publishableKey": "pk_test_51",
                             "secretKey": "sk_test_51"}
    assert out["looker"] == {"clientId": "cid", "clientSecret": "sec",
                             "hostUrl": "https://x.looker.com"}
    assert out["airtable"] == {"pat": "pat1"}  # empty baseId dropped
    assert out["firebase"] == {"apiKey": "AIzaSy1"}
    content = DeveloperAgent._format_plan(
        {"type": "landing", "sections": ["Hero"]}, ["stripe", "looker"],
        connector_secrets=out)
    assert "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51" in content
    assert "VITE_STRIPE_SECRET_KEY=sk_test_51" in content
    assert "VITE_LOOKER_HOST_URL=https://x.looker.com" in content


if __name__ == "__main__":
    test_connector_secrets_whitelist()
    test_format_plan_injects_env_lines()
    test_category3_secret_whitelist()
    test_category4_secret_whitelist_and_env()
    test_category567_secret_whitelist_and_env()
    print("connector secrets checks OK")