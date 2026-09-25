"""Fast mocked end-to-end verification of the multi-file generation flow.

Monkeypatches the 3 agents with deterministic fakes (no LLM calls) and drives
POST /api/generate through the FastAPI TestClient, then asserts:
  - every file in the returned files[] array exists on disk under
    generated_projects/<project_id>/
  - requested connectors produced their per-connector src/lib/ files
  - the preview mirror under frontend/src/generated/project/ was rebuilt and
    GeneratedPage.tsx re-exports the generated entry
  - DeveloperAgent._parse_files survives fences, prose and raw-code output

Run:  ./venv/bin/python verify_multifile.py
"""
import json
import shutil
import sys
from pathlib import Path
from unittest.mock import MagicMock

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import ai_engine.main as m  # noqa: E402
from ai_engine.agents.developer import DeveloperAgent  # noqa: E402

PASSED, FAILED = [], []


def check(name, ok, detail=""):
    (PASSED if ok else FAILED).append(name)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))


FAKE_PLAN = {
    "type": "landing-page",
    "niche": "integration-test",
    "theme": "dark",
    "color_palette": {"primary": "#818CF8", "secondary": "#1F2937",
                      "background": "#05070D", "accent": "#F5F5F5"},
    "sections": ["Hero", "Features", "Footer"],
    "features": ["Responsive layout"],
    "component_requirements": {},
}

FAKE_FILES = [
    {"path": "package.json",
     "content": '{"name": "fake-app", "dependencies": {"react": "^19"}}'},
    {"path": "src/App.tsx",
     "content": '"use client";\nimport { motion } from "framer-motion";\n'
                'import { Hero } from "./components/Hero";\n\n'
                "export default function App() {\n"
                '  return <motion.div><Hero /></motion.div>;\n'
                "}\n"},
    {"path": "src/components/Hero.tsx",
     "content": 'import { motion } from "framer-motion";\n\n'
                "export function Hero() {\n"
                '  return <motion.h1 className="text-4xl bg-[#05070D]">Hi</motion.h1>;\n'
                "}\n"},
    {"path": "src/lib/supabase.ts",
     "content": "export async function supabaseSelect(table: string) {}\n"},
    {"path": "src/lib/email.ts",
     "content": "export async function sendEmail(to: string, subject: string, html: string) {}\n"},
    {"path": "src/lib/otp.ts",
     "content": "export async function sendOtp(to: string) { return '123456'; }\n"},
    {"path": "src/lib/db.ts",
     "content": "export async function query(sql: string, params: unknown[] = []) {}\n"},
    {"path": "src/lib/aiProviders.ts",
     "content": "export async function claudeCompletion(messages: unknown[]) {}\n"},
    {"path": "src/lib/api/billing-api.ts",
     "content": "export async function apiGet(path: string) {}\n"},
    {"path": "src/lib/mcp.ts",
     "content": "export async function callMcp(name: string, method: string, params: unknown) {}\n"},
    {"path": "src/lib/shopify.ts",
     "content": "export async function shopifyProducts(first: number) { return []; }\n"},
]


def main() -> int:
    print("[1] DeveloperAgent._parse_files salvage ladder")
    ok_json = DeveloperAgent._parse_files(json.dumps({"files": FAKE_FILES}))
    check("clean JSON parses", [f["path"] for f in ok_json] == [f["path"] for f in FAKE_FILES])

    fenced = "```json\n" + json.dumps({"files": FAKE_FILES}) + "\n```"
    check("fenced JSON parses",
          [f["path"] for f in DeveloperAgent._parse_files(fenced)] == [f["path"] for f in FAKE_FILES])

    prose = ("Sure! Here is your project:\n"
             + json.dumps({"files": FAKE_FILES})
             + "\nLet me know if you want changes.")
    check("JSON with surrounding prose parses",
          len(DeveloperAgent._parse_files(prose)) == len(FAKE_FILES))

    bad = json.dumps({"files": FAKE_FILES}).replace("\\n", "\n")  # literal newlines
    check("regex salvage recovers files from invalid JSON",
          len(DeveloperAgent._parse_files(bad)) >= 3)

    raw_code = 'import { motion } from "framer-motion";\nexport default function P() { return null; }\n'
    check("raw-code fallback wraps as single src/App.tsx",
          DeveloperAgent._parse_files(raw_code) == [{"path": "src/App.tsx", "content": raw_code.strip()}])

    check("empty/garbage input returns []",
          DeveloperAgent._parse_files("") == [] and DeveloperAgent._parse_files("hello world") == [])

    print("[2] Mocked end-to-end POST /api/generate with connectors + custom API + MCP")
    fake_chat = MagicMock(**{
        "chat.completions.create.return_value.choices":
            [MagicMock(**{"message.content": "Mocked chat reply."})]
    })
    fake_agents = {
        "architect": MagicMock(**{"plan_architecture.return_value": dict(FAKE_PLAN),
                                  "client": fake_chat}),
        "developer": MagicMock(**{"generate_files.return_value": [dict(f) for f in FAKE_FILES]}),
        "debugger": MagicMock(**{
            "validate_and_fix_code.side_effect":
                lambda plan, code, fast_mode=True: code,
            "structural_check.return_value": (True, []),
        }),
    }
    m._agents = fake_agents  # bypass lazy init (no NVIDIA key needed)

    CUSTOM = [{"name": "Billing API", "baseUrl": "https://api.billing.dev/v1",
               "headers": {"X-API-Key": "secret"}, "openApiSchema": ""}]
    MCPS = [{"name": "Postgres MCP", "serverUrl": "https://mcp.postgres.com/sse",
             "authToken": "tok"}]

    from fastapi.testclient import TestClient
    with TestClient(m.app) as client:
        r = client.post("/api/generate", json={
            "prompt": "verify the multi-file pipeline",
            "connectors": ["supabase", "resend", "twilio", "postgres",
                           "anthropic_claude", "shopify", "not_a_service"],
            "custom_connectors": CUSTOM,
            "mcp_servers": MCPS,
            "connector_permissions": {"shopify": "always", "supabase": "never",
                                      "bogus": "always"},
            "connector_credentials": {"shopify": True, "bogus": True},
        })
        data = r.json()
        check("POST /api/generate -> 200 success",
              r.status_code == 200 and data.get("status") == "success", f"HTTP {r.status_code}")

        check("developer received the connectors",
              fake_agents["developer"].generate_files.call_args[0][1]
              == ["supabase", "resend", "twilio", "postgres",
                  "anthropic_claude", "shopify"])
        check("developer received custom connectors + MCP servers",
              fake_agents["developer"].generate_files.call_args[1]
              .get("custom_connectors") == CUSTOM
              and fake_agents["developer"].generate_files.call_args[1]
              .get("mcp_servers") == MCPS)
        check("connector rules (permissions + credential flags) reach the developer",
              fake_agents["developer"].generate_files.call_args[1]
              .get("connector_rules") ==
              {"shopify": {"permission": "always", "credentials": True},
               "supabase": {"permission": "never", "credentials": False}},
              str(fake_agents["developer"].generate_files.call_args[1]
                  .get("connector_rules")))
        check("connector_permissions echoed back (unknown ids filtered)",
              data.get("connector_permissions") ==
              {"shopify": "always", "supabase": "never"})
        check("unknown connectors filtered from the response",
              data.get("connectors") == ["supabase", "resend", "twilio",
                                         "postgres", "anthropic_claude",
                                         "shopify"])
        check("custom connectors + MCP servers echoed back",
              data.get("custom_connectors") == CUSTOM
              and data.get("mcp_servers") == MCPS)

        paths = [f["path"] for f in data.get("files", [])]
        check("files[] returned to the frontend with all 11 files",
              paths == [f["path"] for f in FAKE_FILES], str(paths))
        check("entry_path is src/App.tsx", data.get("entry_path") == "src/App.tsx")

        project_dir = ROOT / data.get("projectPath", "")
        check("projectPath under generated_projects/",
              data.get("projectPath", "").startswith("generated_projects/"))
        on_disk = [project_dir / p for p in paths]
        check("EVERY file written to the workspace on disk",
              all(p.is_file() for p in on_disk),
              f"{sum(p.is_file() for p in on_disk)}/{len(on_disk)} at {project_dir}")
        check("per-connector src/lib/ helper files exist on disk",
              all((project_dir / f"src/lib/{n}").is_file()
                  for n in ("supabase.ts", "email.ts", "otp.ts", "db.ts",
                            "aiProviders.ts", "mcp.ts", "api/billing-api.ts",
                            "shopify.ts")))

        trace_steps = [s.get("step") for s in data.get("trace", [])]
        check("build response embeds the execution trace",
              "architect:started" in trace_steps and "done" in trace_steps,
              str(trace_steps))

        print("[3] Chat / plan mode routing (no file writes)")
        r_chat = client.post("/api/generate", json={
            "prompt": "what is react?", "mode": "chat"})
        chat = r_chat.json()
        check("POST mode=chat -> 200 success",
              r_chat.status_code == 200 and chat.get("status") == "success",
              f"HTTP {r_chat.status_code}")
        check("chat returns the mocked reply, no files",
              chat.get("mode") == "chat"
              and chat.get("message") == "Mocked chat reply."
              and chat.get("files") == [])

        r_plan = client.post("/api/generate", json={
            "prompt": "plan a fintech app", "mode": "plan"})
        plan = r_plan.json()
        check("POST mode=plan -> 200 with design directions",
              r_plan.status_code == 200
              and plan.get("mode") == "plan"
              and plan.get("design_directions")
              and all(d.get("id") and d.get("title")
                      for d in plan["design_directions"]),
              f"HTTP {r_plan.status_code}")

        check("invalid mode falls back to build",
              m._extract_mode({"mode": "bogus"}) == "build"
              and m._extract_mode({}) == "build")

        preview_mirror = ROOT / "frontend" / "src" / "generated" / "project"
        check("preview mirror rebuilt with the generated tree",
              (preview_mirror / "src/App.tsx").is_file()
              and (preview_mirror / "src/components/Hero.tsx").is_file()
              and (preview_mirror / "src/lib/supabase.ts").is_file()
              and (preview_mirror / "src/lib/mcp.ts").is_file())
        shim = (ROOT / "frontend" / "src" / "generated" / "GeneratedPage.tsx").read_text()
        check("preview entry points at the mirrored generated entry",
              "let entryPath = './project/src/App.tsx';" in shim)
        mirrored_entry = (preview_mirror / "src/App.tsx").read_text()
        check("mirror sanitized for Vite (no 'use client', has @ts-nocheck)",
              "use client" not in mirrored_entry and "@ts-nocheck" in mirrored_entry)

        # Cleanup the fake workspace so no test residue is left behind.
        shutil.rmtree(project_dir, ignore_errors=True)
        shutil.rmtree(preview_mirror, ignore_errors=True)

    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    if FAILED:
        print("Failed:", ", ".join(FAILED))
    return 0 if not FAILED else 1


if __name__ == "__main__":
    sys.exit(main())