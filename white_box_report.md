# CRAFTAI - WHITE BOX TESTING & STRUCTURAL COVERAGE REPORT

**Project:** CraftAI (AI prompt → structured website plan + live blueprint preview)
**Date:** 2026-07-20
**Scope of analysis:** root `main.py`, `ai_engine/` (active FastAPI backend), and `craftai-frontend/` (active Next.js frontend). No application code was modified or rewritten during this analysis.
**Method:** Static white-box inspection of internal structure, control flow, data flow, and execution paths.

> **Active-code determination (important for coverage validity):** The repo contains two parallel backends (`ai_engine/` and `backend-craftai/`) and two frontend trees (`craftai-frontend/` and `emergency-ui/`). Per `CLAUDE.md`, the live server is launched from the project root via `uvicorn main:app` → `ai_engine.main:app`, and the live frontend is the Next.js app on port 3000. `backend-craftai/` (with its `/generate-plan` route and `services/planner.py`) is referenced **only** by `tests/test_*.py` and is NOT the server under test; `emergency-ui/` is an unmodified `create-next-app` scaffold. Coverage targets below are scoped to the **active** trees only.

---

## 1. Source Code Structural Analysis & Data Flow

### 1.1 Backend Modules (FastAPI)

#### 1.1.1 `main.py` (root launcher wrapper)
- **Purpose:** Make the project root importable so `uvicorn main:app --reload` resolves the `ai_engine.*` absolute import.
- **Top-level statements:**
  - `ROOT = Path(__file__).resolve().parent`
  - `if str(ROOT) not in sys.path: sys.path.insert(0, str(ROOT))`
  - `from ai_engine.main import app`
  - `__all__ = ["app"]`
- **Data flow:** re-exports `app` unchanged. No request handling.

#### 1.1.2 `ai_engine/main.py` (FastAPI app + routing)
- **Module-level setup (executed at import):**
  - `ROOT = Path(__file__).resolve().parent.parent`; inserts `ROOT` onto `sys.path`; `os.chdir(ROOT)` — **load-bearing** because `plan_generator.py` opens the system prompt via a *relative* path.
  - Constructs `app = FastAPI(title="CraftAI Engine")`.
  - Adds `CORSMiddleware`:
    - `allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"]`
    - `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`
  - Module constants:
    - `ALLOWED_BLUEPRINTS = {"dashboard", "landing-page", "portfolio"}`
    - `_LEGACY_TYPE_MAP = {"business":"dashboard", "website":"landing-page", "saas":"landing-page", "app":"landing-page", "site":"landing-page", "analytics":"dashboard", "admin":"dashboard"}`
- **Endpoint functions:**

| Function | Route / Method | Input args | Payload model | Local variables | External calls | Returned schema |
|---|---|---|---|---|---|---|
| `handle_prompt(payload: dict)` | `POST /api/generate` | `payload: dict` (raw dict, **no Pydantic model**) | `{"prompt": <string>}` expected | `user_prompt`, `plan`, `blueprint_type` | `generate_plan(user_prompt)` | `{"status":"success", "plan": <dict|any>, "preview_url": "http://localhost:3000/blueprints/{blueprint_type}"}` |
| `health()` | `GET /api/health` | none | none | none | none | `{"status":"ok"}` |

- **Helper `def _resolve_blueprint_type(plan: dict) -> str`:**
  - `raw = str(plan.get("type", "dashboard")).strip().lower()`
  - `resolved = _LEGACY_TYPE_MAP.get(raw, raw)`
  - `if resolved not in ALLOWED_BLUEPRINTS: resolved = "dashboard"`
  - returns `resolved`
- **Data-flow note on `handle_prompt`:** `payload.get("prompt")` is **not** validated for presence or type — `None` / non-strings are forwarded verbatim into `generate_plan`. The response **always** carries `"status": "success"` even when `generate_plan` returned an error dict. `plan["type"]` is mutated in place only when `isinstance(plan, dict)` is true.

#### 1.1.3 `ai_engine/services/plan_generator.py` (AI service — `generate_plan`)
- **Module-level / external SDK setup (runs at import):**
  - `load_dotenv()`
  - `client = OpenAI(base_url=os.getenv("OLLAMA_CLOUD_BASE_URL", "http://localhost:11434/v1"), api_key=os.getenv("OLLAMA_CLOUD_API_KEY", "ollama"))` — OpenAI SDK pointed at an Ollama-compatible endpoint.
- **Function `generate_plan(user_prompt: str)`:**

| Parameter | Type | Source | Validation |
|---|---|---|---|
| `user_prompt` | `str` (expected) | `handle_prompt`'s `payload.get("prompt")` | none — may be `None` or non-string |

- **Internal local variables:** `system_instruction`, `response`, `content`.
- **External SDK call:**
  ```
  client.chat.completions.create(
      model="deepseek-v4-pro:cloud",
      messages=[{"role":"system","content":system_instruction},
                {"role":"user","content":user_prompt}],
      temperature=0.2,
      response_format={"type":"json_object"})
  ```
  - **No timeout configured** on the client or call.
- **File I/O:** `open("ai_engine/prompts/system_prompt.txt", "r")` — relative path; succeeds only if CWD is project root.
- **Return schemas (4 paths):**
  1. Happy path → `json.loads(content)` → model JSON object: `{"type","pages","sections","style","colorTheme","features"}`.
  2. `except OpenAIError` → `{"error":"API connection failure","details":str(api_err)}`.
  3. `except json.JSONDecodeError` → `{"error":"Invalid JSON format returned from model","raw_content":content}`.
  4. `except Exception as e` → `{"error":"An unexpected error occurred","details":str(e)}`.

#### 1.1.4 Supporting / non-active modules (structural reality)
- `ai_engine/services/validator.py` — `validate_plan(plan)` normalizes type/sections/style and sets `pages/colorTheme/features` defaults. **Not imported by `main.py` or `plan_generator.py` → dead in the active path.**
- `ai_engine/models/plan_schema.py` — `ALLOWED_TYPES=["portfolio","landing-page","business"]`, `ALLOWED_SECTIONS`, `ALLOWED_STYLES`. **Not imported in the active path**, and `ALLOWED_TYPES` **conflicts** with both the system prompt (`dashboard/landing-page/portfolio`) and `main.py`'s `ALLOWED_BLUEPRINTS`.
- `ai_engine/config/settings.py` — loads `GROQ_API_KEY`, targets `https://api.groq.com/...`, model `llama-3.3-70b-versatile`, **raises `ValueError` if `GROQ_API_KEY` unset.** Not imported in the active path (active service uses the Ollama/OpenAI client instead).
- `ai_engine/prompts/system_prompt.txt` — constrains the model to `type ∈ {dashboard, landing-page, portfolio}`, sections ∈ `{Hero, About, Projects, Services, Contact, Footer, Navbar}`, styles ∈ `{modern, minimal, dark, light}`, "Always include Hero".

### 1.2 Frontend Components (Next.js — `craftai-frontend/`)

#### 1.2.1 Route tree
| Route | File | Component rendered |
|---|---|---|
| `/` | `src/app/page.tsx` | `Home` (workspace) |
| `/blueprints/dashboard` | `src/app/blueprints/dashboard/page.tsx` | `<Dashboard type="dashboard"/>` (static) |
| `/blueprints/business` | `src/app/blueprints/business/page.tsx` | `<Dashboard type="business"/>` (static) |
| `/blueprints/landing-page` | `src/app/blueprints/landing-page/page.tsx` | `<LandingPageBlueprint/>` (static, dedicated) |
| `/blueprints/portfolio` | `src/app/blueprints/portfolio/page.tsx` | `<PortfolioBlueprint/>` (static, dedicated) |
| `/blueprints/[type]` | `src/app/blueprints/[type]/page.tsx` | `<Dashboard type={type}/>` (dynamic fallback) |
| layout | `src/app/layout.tsx` | Geist fonts, metadata "CraftAI" |

Next.js static-segment precedence: `dashboard`/`business`/`landing-page`/`portfolio` resolve to their static routes; **every other `type`** falls through to `[type]` → `<Dashboard>`.

#### 1.2.2 `src/app/page.tsx` — core workspace logic
- **Module constants:** `BACKEND_URL="http://127.0.0.1:8000/api/generate"` (hardcoded), `LOADING_STEPS` (4 labels), `EXAMPLES` (3 prompts), `StepState` type.
- **Functional React state (`useState`):**

| Variable | Initial value | Type | Role |
|---|---|---|---|
| `prompt` | `""` | `string` | textarea value |
| `started` | `false` | `boolean` | idle-welcome vs. workspace toggle |
| `loading` | `false` | `boolean` | in-flight fetch flag |
| `steps` | `[]` | `StepState[]` | pipeline animation state |
| `plan` | `null` | `unknown` | backend plan JSON for the sidebar view |
| `previewUrl` | `null` | `string\|null` | iframe `src` |
| `error` | `null` | `string\|null` | error message |

- **Component properties:** none (`Home` takes no props).
- **Asynchronous handler `handleGenerate()` (HTTP fetch execution path):**
  1. guard `if (!prompt.trim()) return;`
  2. set `started/loading`, clear `error/plan/previewUrl`, init `steps` to all-`done:false`.
  3. `const stepTimer = window.setInterval(..., 650)` — advances the first non-done step each tick.
  4. `try`: `fetch(BACKEND_URL, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt})})` — **no `AbortController`/timeout.**
  5. `if (!res.ok) throw new Error(\`Backend responded with ${res.status}\`)`.
  6. `const data = await res.json(); setPlan(data.plan); setPreviewUrl(data.preview_url); setSteps(...all done:true)`.
  7. `catch(e)`: `setError(e instanceof Error ? e.message : String(e))`.
  8. `finally`: `clearInterval(stepTimer); setLoading(false)`.
- **Sync handler `handleNew()`:** resets all 7 state vars to initial.
- **Pure helper `highlightJson(jsonString)`:** regex tokenizer → colored `<span>`s (keys=indigo, strings=emerald, numbers=amber, booleans/null=pink, punctuation=slate).
- **Type-response routing reality:** `page.tsx` does **not** inspect `plan.type`. It renders whatever `data.preview_url` the backend returns as the iframe `src`. Type→route resolution is a **backend** concern (`_resolve_blueprint_type`).

#### 1.2.3 `src/components/Dashboard.tsx` (iframe target for most types)
- **Props:** `{ type: string }` — sole use: `const title = type === "business" ? "Acme Analytics" : "CraftAI Blueprint";`
- **Static mock arrays:** `KPIS` (4), `BARS` (12), `MONTHS` (12), `NAV` (5), `TRANSACTIONS` (5).
- **Helper `statusStyle(s)`:** ternary → `"Paid"` | `"Pending"` | else (3 badge color classes).

---

## 2. Identification of Testable Code Elements

### 2.1 Statements (targets for 100% statement coverage)
- **Backend**
  - S1: `main.py` root — `sys.path.insert` + re-export `app`.
  - S2: `ai_engine/main.py` — `sys.path.insert`, `os.chdir(ROOT)`, `FastAPI(...)`, `add_middleware(...)`.
  - S3: `handle_prompt` — `payload.get`, `generate_plan` call, `_resolve_blueprint_type` call, `isinstance` guard, dict mutation, `return`.
  - S4: `health` — `return {"status":"ok"}`.
  - S5: `plan_generator.generate_plan` — `open(...).read()`, `client.chat.completions.create(...)`, `response.choices[0].message.content`, `json.loads(content)`, each `return`.
- **Frontend**
  - S6: `handleGenerate` — guard, all `set*` calls, `setInterval`, `fetch`, `res.ok` check, `res.json()`, `catch`, `finally`.
  - S7: `handleNew` — 7 state resets.
  - S8: `highlightJson` — regex `while` loop body + trailing-slice push.
  - S9: render branches: idle welcome, sidebar pipeline, JSON panel (3 sub-states), preview surface (iframe vs. placeholder vs. error).

### 2.2 Branches (TRUE/FALSE decision boundaries)
- **Backend `handle_prompt`:**
  - B1: `isinstance(plan, dict)` — TRUE (mutate `plan["type"]`) / FALSE (skip mutation; still builds `preview_url`).
- **Backend `_resolve_blueprint_type`:**
  - B2: `plan.get("type", "dashboard")` — key present / absent (default `"dashboard"`).
  - B3: `_LEGACY_TYPE_MAP.get(raw, raw)` — legacy hit (remap) / miss (passthrough).
  - B4: `resolved not in ALLOWED_BLUEPRINTS` — TRUE (fallback `"dashboard"`) / FALSE (keep).
- **Backend `generate_plan` try/except (ordered handlers):**
  - B5: `except OpenAIError` taken vs. not.
  - B6: `except json.JSONDecodeError` taken vs. not.
  - B7: `except Exception` taken vs. not (covers `FileNotFoundError` on prompt file, `TypeError` from `None` prompt, non-`OpenAIError` network errors).
- **Backend `settings.py` (dormant):**
  - B8: `if not GROQ_API_KEY: raise ValueError` — only reachable if module is imported.
- **Frontend `handleGenerate`:**
  - B9: `if (!prompt.trim()) return` — empty/whitespace abort vs. proceed.
  - B10: `if (!res.ok) throw` — non-2xx vs. 2xx.
  - B11: `catch(e)` — network/CORS failure vs. success.
- **Frontend render branches:**
  - B12: `!started` (idle vs. workspace).
  - B13: `steps.length === 0` (sidebar idle vs. list).
  - B14: JSON panel `error` / `plan` / placeholder (3-way).
  - B15: preview `previewUrl` (iframe) vs. placeholder; placeholder sub-branch `error` vs. spinner.
- **`Dashboard.statusStyle`:** B16 — `"Paid"` / `"Pending"` / else.
- **`Dashboard` title:** B17 — `type === "business"` vs. else.

### 2.3 Conditions (independent condition coverage)
- **C1 — `_resolve_blueprint_type` chained decision:** the effective outcome is a composition of three independent conditions: (a) legacy-map hit, (b) raw is `None`-defaulted, (c) `resolved ∈ ALLOWED_BLUEPRINTS`. Each must be exercised TRUE and FALSE independently (e.g. legacy hit that is *also* in `ALLOWED_BLUEPRINTS`? — none exists by construction; legacy values all map to allowed values, so condition (a)TRUE ⇒ (c)TRUE — worth documenting as a structurally unreachable combination).
- **C2 — `handleGenerate` compound success condition:** success requires `res.ok` AND `data.preview_url` present AND `data.plan` present. `data.plan`/`data.preview_url` are consumed without existence checks, so the "success" path has hidden sub-conditions: missing `preview_url` ⇒ `previewUrl=undefined` ⇒ iframe not rendered (silent gap).
- **C3 — `highlightJson` regex alternation:** six alternation groups (key / string / number / bool / null / punct) — each group is an independent condition needing a matching token to cover.
- **C4 — `statusStyle` ternary cascade:** effectively `s==="Paid" || s==="Pending" || else` — three independent condition outcomes.

### 2.4 Loops (boundary validation: zero / one / max)
- **L1 — `highlightJson` `while ((m = regex.exec(...)) !== null)`:** boundary = empty string (zero iterations), single-token string (one), multi-token JSON (many). Also the post-loop `if (last < jsonString.length)` tail branch.
- **L2 — `setInterval` step-advancer in `handleGenerate`:** `prev.findIndex(s => !s.done)`; boundaries = all-done (returns -1 → no-op), one remaining, exactly 4 steps. Loop terminates when cleared in `finally`.
- **L3 — `page.tsx` render `.map` loops:** `EXAMPLES.map` (3), `steps.map` (0–4), `highlightJson` output node array.
- **L4 — `Dashboard.tsx` render `.map` loops:** `KPIS.map` (4), `BARS.map` (12), `MONTHS` indexed by `BARS`, `NAV.map` (5), `TRANSACTIONS.map` (5), plan-distribution array (3), about-stats array (4). Boundary: each is a fixed-length array, so "zero" only occurs if the source array is emptied (not currently possible — but a mutation/prop-injection test could verify).
- **L5 — `plan_generator`:** no loops. (The model's `sections` array is produced by the LLM, not iterated by Python in the active path — `validate_plan` would iterate it but is dormant.)

---

## 3. White Box Testing Techniques & Strategy

### 3.1 Statement Coverage Strategy
Goal: force execution through every line in `ai_engine/main.py`, `plan_generator.py`, and `craftai-frontend/src/app/page.tsx`.

- **To cover S3 (happy path):** POST `{"prompt":"a SaaS landing page for an AI note-taking app"}` with a mocked `generate_plan` returning a valid dict → executes `payload.get`, `generate_plan` call, `_resolve_blueprint_type`, `isinstance` TRUE branch, mutation, return.
- **To cover S4:** GET `/api/health`.
- **To cover S5 error statements:** inject (a) an `OpenAIError`, (b) a non-JSON `content`, (c) a `FileNotFoundError` (delete/rename prompt file or chdir elsewhere) — one input per `except` block.
- **To cover S6–S9:** render `Home` and fire `handleGenerate` against a mocked `fetch` resolving to `{plan:{...}, preview_url:"..."}`; also a rejecting `fetch` to cover the `catch`; render with `started=false` to cover the idle branch.

### 3.2 Branch Coverage Strategy
Goal: both TRUE and FALSE for every decision in §2.2.

- **Type classification (`dashboard`/`landing-page`/`portfolio`) + legacy/fallback:** drive `_resolve_blueprint_type` directly (or via `POST /api/generate` with a mocked plan) with the input matrix below to satisfy B2/B3/B4 both ways:

| Input `plan.type` | B2 (key present?) | B3 (legacy hit?) | B4 (in allowed?) | Expected `preview_url` |
|---|---|---|---|---|
| `"dashboard"` | TRUE | FALSE | FALSE(keep) | `/blueprints/dashboard` |
| `"landing-page"` | TRUE | FALSE | FALSE(keep) | `/blueprints/landing-page` |
| `"portfolio"` | TRUE | FALSE | FALSE(keep) | `/blueprints/portfolio` |
| `"business"` | TRUE | TRUE | FALSE(keep, already mapped) | `/blueprints/dashboard` |
| `"saas"` / `"website"` | TRUE | TRUE | FALSE | `/blueprints/landing-page` |
| `"analytics"` / `"admin"` | TRUE | TRUE | FALSE | `/blueprints/dashboard` |
| `"ecommerce"` (unknown) | TRUE | FALSE | TRUE(fallback) | `/blueprints/dashboard` |
| `"PORTFOLIO"` (mixed case) | TRUE | FALSE | FALSE(`.lower()`) | `/blueprints/portfolio` |
| key absent | FALSE | — | — | `/blueprints/dashboard` |

- **Error fallbacks (B5–B7):** three inputs — unreachable host (`OpenAIError`), mocked non-JSON `content` (`JSONDecodeError`), and `None` prompt / missing prompt file (`Exception`).
- **Frontend (B9–B15):** `prompt=""` (B9 TRUE), valid prompt + 2xx (B10 FALSE, B11 FALSE), valid prompt + 500 (B10 TRUE), backend down (B11 TRUE), `preview_url` absent (B15 placeholder), `started=false` (B12 TRUE).

### 3.3 Condition & Path Coverage (cyclomatic independent paths)

**Cyclomatic complexity of `generate_plan` (`plan_generator.py`):**
- Decision nodes = 3 (`except OpenAIError`, `except JSONDecodeError`, `except Exception`).
- V(G) = edges − nodes + 2 = **4** (one happy path + three exception paths). Four independent basis paths:
  - **P1 (happy):** open prompt → API call → `json.loads` succeeds → return dict.
  - **P2 (API failure):** open prompt → API call raises `OpenAIError` → return error dict A.
  - **P3 (bad JSON):** open prompt → API call OK → `json.loads` raises `JSONDecodeError` → return error dict B.
  - **P4 (other):** any other exception (e.g. `FileNotFoundError` before API call, or `TypeError` from `None` prompt) → return error dict C.

**Cyclomatic complexity of `_resolve_blueprint_type` (`main.py`):**
- Decision nodes = 2 (`_LEGACY_TYPE_MAP.get` default branch, `if resolved not in ALLOWED_BLUEPRINTS`).
- V(G) = **3** basis paths:
  - **P5:** raw in legacy map → remapped (always lands in allowed set) → return remapped.
  - **P6:** raw not in legacy map, raw in `ALLOWED_BLUEPRINTS` → return raw.
  - **P7:** raw not in legacy map, raw not in `ALLOWED_BLUEPRINTS` → return `"dashboard"`.

**Cyclomatic complexity of `handleGenerate` (`page.tsx`):**
- Decision nodes = 3 (`!prompt.trim()`, `!res.ok`, catch entry) + the implicit `fetch` resolve/reject.
- V(G) ≈ **4** basis paths:
  - **P8:** empty prompt → early return.
  - **P9:** valid prompt → 2xx → set plan + previewUrl.
  - **P10:** valid prompt → non-2xx → throw → catch sets error.
  - **P11:** valid prompt → network/CORS reject → catch sets error.

**Path-injection note for `main.py`:** `preview_url` is built via f-string interpolation of `blueprint_type`, which is constrained to the `ALLOWED_BLUEPRINTS` set or the literal `"dashboard"`. There is no string-to-path conversion (the frontend treats it as an opaque URL), so classic path traversal (`../`) is structurally impossible *after* normalization — but only because of B4's fallback. A test should confirm a malicious `plan.type` like `"../admin"` is collapsed to `"dashboard"` (B4 TRUE).

---

## 4. Structured Test Case Matrix

| Test Case ID | Target Component / Function | White Box Technique | Input Parameters / Payload | Target Path / Branch Description | Expected Output / Code Side-Effect | Edge Case / Boundary Condition Met |
|---|---|---|---|---|---|---|
| TC-01 | `POST /api/generate` + `generate_plan` (happy) | Statement + Path (P1, P5/P6) | `{"prompt":"A SaaS landing page for an AI note-taking app"}`; mocked LLM returns `{"type":"landing-page","sections":["Hero","Features","CTA"],"style":"modern","colorTheme":"dark","features":["navbar","footer"],"pages":["home"]}` | S3 happy, P1, `_resolve_blueprint_type` P6 | `200`; `status="success"`; `plan.type="landing-page"`; `preview_url="http://localhost:3000/blueprints/landing-page"` | Valid input, optimal operational path |
| TC-02 | `GET /api/health` | Statement | none | S4 | `200`; `{"status":"ok"}` | Trivial path, confirms app boots |
| TC-03 | `_resolve_blueprint_type` (legacy) | Branch (B3 TRUE) | mocked plan `{"type":"business"}` via `POST /api/generate` | B3 TRUE → remap to `dashboard` | `preview_url=.../blueprints/dashboard`; `plan.type` overwritten to `dashboard` | Legacy drift value normalized |
| TC-04 | `_resolve_blueprint_type` (fallback) | Branch (B4 TRUE) + Path P7 | mocked plan `{"type":"ecommerce"}` | B3 FALSE, B4 TRUE → fallback | `preview_url=.../blueprints/dashboard` | Unrecognized LLM type drift → safe default |
| TC-05 | `_resolve_blueprint_type` (path-injection attempt) | Branch (B4 TRUE) + Condition C1 | mocked plan `{"type":"../admin"}` | B4 TRUE fallback | `preview_url=.../blueprints/dashboard` (no traversal) | Path-injection boundary collapsed by allow-list |
| TC-06 | `_resolve_blueprint_type` (mixed-case) | Branch (B2 + `.lower()`) | mocked plan `{"type":"PORTFOLIO"}` | normalization branch | `preview_url=.../blueprints/portfolio` | Case-insensitive type drift |
| TC-07 | `_resolve_blueprint_type` (absent key) | Branch (B2 FALSE) | mocked plan `{}` (no `type`) | `.get` default `"dashboard"` | `preview_url=.../blueprints/dashboard` | Missing-key boundary |
| TC-08 | `generate_plan` (`OpenAIError`) | Branch (B5) + Path P2 | valid prompt; client raises `OpenAIError` | P2 except block | `200`; `status="success"`; `plan={"error":"API connection failure","details":...}`; `preview_url=.../blueprints/dashboard` | Network/upstream failure boundary; exposes always-success anti-pattern |
| TC-09 | `generate_plan` (`JSONDecodeError`) | Branch (B6) + Path P3 | valid prompt; mocked `content="not json"` | P3 except block | `plan={"error":"Invalid JSON format returned from model","raw_content":"not json"}` | Strict type-validation drift: model returns non-JSON |
| TC-10 | `generate_plan` (unrecognized structural keys) | Condition + Statement | valid prompt; mocked `content='{"type":"landing-page","sections":["Hero","Pricing","FAQ"]}'` (sections outside allow-list) | happy path; note `validate_plan` is dormant | `plan` returned unchanged with `Pricing`/`FAQ` (not filtered) | Drift: unrecognized section keys pass through because validator is dead code |
| TC-11 | `handle_prompt` (missing `prompt` key) | Branch / invalid payload | `{}` | `payload.get` → `None` → forwarded to `generate_plan` | Either `plan={"error":"An unexpected error occurred",...}` (P4) or API rejection; `status` still `"success"` | Invalid payload boundary (no validation) |
| TC-12 | `handle_prompt` (non-string `prompt`) | Branch / invalid payload | `{"prompt":12345}` | `user_prompt=12345` → API call | Error dict via P2/P4; `200` + `status="success"` | Type-coercion boundary |
| TC-13 | `handle_prompt` (empty/whitespace prompt) | Branch / invalid payload | `{"prompt":"   "}` | forwarded to LLM (no backend guard) | LLM response or error; `200` | Empty-string boundary (backend does NOT guard — contrast with frontend B9) |
| TC-14 | `generate_plan` (prompt file missing) | Branch (B7) + Path P4 | valid prompt; CWD not root OR prompt file absent | `FileNotFoundError` → generic except | `plan={"error":"An unexpected error occurred","details":"..."}` | Environment/path-parsing failure boundary |
| TC-15 | `generate_plan` (None prompt → TypeError) | Branch (B7) + Path P4 | `payload.get("prompt")` is `None` | `TypeError` in API call → generic except | error dict C | Null-input boundary |
| TC-16 | `handleGenerate` (empty prompt) | Branch (B9 TRUE) | `prompt=""`, click Generate | early `return`; no `fetch` | no network call; UI stays idle | Frontend guard boundary (frontend guards where backend does not) |
| TC-17 | `handleGenerate` (success) | Path P9 + Statement S6 | valid prompt; mocked `fetch` → `200` `{plan:{...}, preview_url:".../blueprints/portfolio"}` | B9 FALSE, B10 FALSE, B11 FALSE | `plan` + `previewUrl` set; iframe rendered | Optimal frontend path |
| TC-18 | `handleGenerate` (non-2xx) | Branch (B10 TRUE) + Path P10 | mocked `fetch` → `500` | throw → catch | `error="Backend responded with 500"`; no iframe | HTTP failure boundary |
| TC-19 | `handleGenerate` (network/CORS down) | Branch (B11 TRUE) + Path P11 | mocked `fetch` rejects | catch | `error` set to rejection message; spinner→error placeholder | Network-state boundary; CORS block simulation |
| TC-20 | `handleGenerate` (missing `preview_url`) | Condition C2 | mocked `fetch` → `200` `{plan:{...}}` (no `preview_url`) | success branch but `previewUrl=undefined` | no `<iframe>` rendered; no error surfaced | Silent-gap boundary: backend "success" without preview URL |
| TC-21 | `handleGenerate` (timeout / hung backend) | Branch/Path (no timeout configured) | valid prompt; mocked `fetch` never resolves | hangs in `await`; `loading` stays true | no error; UI stuck on "Generating preview…"; step animation completes then stalls | Missing-timeout structural boundary |
| TC-22 | `[type]` dynamic route fallback | Branch (route precedence) | navigate to `/blueprints/ecommerce` | dynamic `[type]` matches | renders `<Dashboard type="ecommerce"/>`; title `"CraftAI Blueprint"` | Unknown-type frontend fallback |
| TC-23 | `Dashboard.statusStyle` | Branch (B16) + Condition C4 | `status="Paid"` / `"Pending"` / `"Failed"` | three ternary outcomes | emerald / amber / rose badge classes | 3-way condition boundary |
| TC-24 | `highlightJson` (loop L1) | Loop boundary + Condition C3 | `""`, `"true"`, `'{"a":1,"b":null}'` | zero / one / many regex iterations; each alternation group | empty node array / single pink span / full colored tree | Zero/one/many + each regex alternation covered |
| TC-25 | CORS middleware | Branch (config) | `OPTIONS /api/generate` with `Origin: http://localhost:3000` vs `http://evil.test` | allow-list match vs. miss | allowed origin → `Access-Control-Allow-Origin` echoed; disallowed → no ACAO header | Cross-origin boundary |

---

## 5. Execution Framework & Validation Metrics

### 5.1 Tooling

| Layer | Tool | Purpose |
|---|---|---|
| Backend test runner | `pytest` | Execute the test matrix against `ai_engine.main:app` |
| Backend HTTP client | `fastapi.testclient.TestClient` (Starlette) | In-process calls to `POST /api/generate`, `GET /api/health` without a live server |
| Backend mocking | `unittest.mock.patch` (`patch("ai_engine.services.plan_generator.client")`, `patch("ai_engine.main.generate_plan")`) | Inject LLM responses / errors; avoid real network |
| Backend coverage | `pytest-cov` | Line, branch, and path coverage for `ai_engine/` |
| Frontend test runner | `Vitest` (preferred for Next.js App Router) or `Jest` + `jest-environment-jsdom` | Unit/render tests for `page.tsx`, `Dashboard.tsx`, route components |
| Frontend rendering | `@testing-library/react` + `@testing-library/jest-dom` | Query rendered output, fire `click`, assert iframe/placeholder |
| Frontend fetch mocking | `msw` (Mock Service Worker) or `vi.spyOn(global, "fetch")` | Simulate 2xx / 5xx / reject / hang |
| Frontend coverage | `vitest --coverage` (`@vitest/coverage-v8`) or `jest --coverage` | LCOV/HTML coverage for `src/` |
| Mutation testing | `mutmut` (Python) / `Stryker` (JS) | Verify test strength by injecting faults |

> **Note on the existing `tests/` directory:** `tests/test_planner.py` and `tests/test_generate_plan.py` import from `backend-craftai` and assert a `/generate-plan` route and `services.planner.generate_plan` — **neither exists in the active `ai_engine` app.** These tests target the wrong service and must be replaced/redirected to `ai_engine.main:app` and `POST /api/generate` before the coverage numbers below are meaningful.

### 5.2 Exact terminal commands

**Backend — run tests + coverage (from project root):**
```bash
# Install tooling
pip install pytest pytest-cov fastapi httpx

# Run the active-app test suite with branch coverage,
# scoped to the live modules (exclude the dormant backend-craftai).
pytest tests/ \
  --cov=ai_engine \
  --cov-branch \
  --cov-report=term-missing \
  --cov-report=html:coverage_html \
  --cov-report=lcov:coverage.lcov

# Open the HTML report
open coverage_html/index.html
```
Coverage targets to assert: `ai_engine/main.py` line ≥ 100% and branch ≥ 90% (the `isinstance(plan, dict)` FALSE branch and all three `except` blocks must be hit); `ai_engine/services/plan_generator.py` all 4 basis paths (P1–P4) covered.

**Frontend — run tests + coverage (from `craftai-frontend/`):**
```bash
# Install tooling
npm install -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event msw

# Run with coverage (V8 provider → LCOV + HTML)
npx vitest run \
  --environment jsdom \
  --coverage.enabled \
  --coverage.provider v8 \
  --coverage.reporter=lcov \
  --coverage.reporter=html \
  --coverage.include 'src/**/*.{ts,tsx}'

# Open the HTML report
open coverage/index.html
```
Coverage targets to assert: `src/app/page.tsx` line ≥ 95% and branch ≥ 90% (B9–B15 all hit, including the `preview_url`-absent silent gap); `src/components/Dashboard.tsx` `statusStyle` all three outcomes hit.

**Mutation testing — verify test strength:**
```bash
# Backend (Python)
pip install mutmut
mutmut run --paths-to-mutate ai_engine/main.py,ai_engine/services/plan_generator.py
mutmut results              # list surviving mutants
mutmut show <id>            # inspect a surviving mutant

# Frontend (JS/TS)
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker run              # generates reports/mutation/html/index.html
```
Mutation focus: (1) flip `ALLOWED_BLUEPRINTS` membership checks in `_resolve_blueprint_type` (a surviving mutant means TC-04/TC-05 are weak); (2) swap the order of `except OpenAIError` and `except json.JSONDecodeError` in `generate_plan` (a strong suite must detect handler-order regressions); (3) mutate `if (!res.ok)` and the `previewUrl` ternary in `page.tsx` (must be killed by TC-18/TC-20).

### 5.3 Coverage gating recommendations
- Enforce a **minimum 90% branch coverage** gate on `ai_engine/main.py` and `page.tsx` in CI (`pytest --cov-fail-under=90` for branch; `vitest` coverage thresholds in `vitest.config.ts`).
- Add a **mutation score threshold** (e.g. Stryker `--thresholdHigh 80`) so that "covered but unasserted" code (such as the always-`"success"` status, or the dormant `validate_plan`) cannot pass review silently.
- Add one structural regression test that **asserts `validate_plan` is not in the import graph of the active request path** (e.g. scan `ai_engine.main` module dependencies) — this prevents the dead-validation gap from being silently "fixed" by a future import without a corresponding behavior change.