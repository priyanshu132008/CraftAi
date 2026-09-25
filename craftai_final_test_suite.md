# CRAFTAI: FINAL WHITE BOX TEST SUITE

**Subject system:** CraftAI — `POST /api/generate` (FastAPI, `ai_engine/main.py`) → `generate_plan` (`ai_engine/services/plan_generator.py`) → Next.js workspace (`craftai-frontend/src/app/page.tsx`).
**Techniques applied (exactly four):** Statement Coverage, Branch/Decision Coverage, Control Flow Testing (cyclomatic complexity + basis paths), Data Flow Testing (DEF-USE chains).
**Scope:** active backend path (`ai_engine.main:app`, `generate_plan`, `_resolve_blueprint_type`) + active frontend workspace (`page.tsx`). No application code was modified.

Reference line anchors (for the assignment's traceability):
- `ai_engine/main.py`: `handle_prompt` L60–78; `_resolve_blueprint_type` L52–57; `ALLOWED_BLUEPRINTS` L40; `_LEGACY_TYPE_MAP` L41–49; `health` L81–83.
- `ai_engine/services/plan_generator.py`: `client` L8–11; `generate_plan` L13–36; happy return L28–29; `except OpenAIError` L31–32; `except json.JSONDecodeError` L33–34; `except Exception` L35–36.
- `craftai-frontend/src/app/page.tsx`: state hooks L101–107; `handleGenerate` L109–144; render branches L155–426; `BACKEND_URL` L17.

---

## 1. Statement Coverage Test Cases

**Goal:** the absolute minimum set of inputs that executes every executable statement in `main.py` and `plan_generator.py` at least once. After mapping every executable line, the irreducible minimum is **4 test inputs** (one per basis path of `generate_plan`, see §3) plus **1 input** for the `health` endpoint and **1 input** that forces the `isinstance(plan, dict)` FALSE branch in `handle_prompt`. Minimum total = **6 inputs**.

### 1.1 Executable-statement inventory

`plan_generator.py`
| Line(s) | Statement | Hit by |
|---|---|---|
| L6 | `load_dotenv()` | any import (module load) |
| L8–11 | `client = OpenAI(...)` | any import |
| L15–16 | `open("ai_engine/prompts/system_prompt.txt").read()` → `system_instruction` | happy path OR any exception raised *after* this line |
| L18–26 | `client.chat.completions.create(...)` → `response` | happy path OR `OpenAIError` OR other exception raised at the call |
| L28 | `content = response.choices[0].message.content` | happy path only (must follow a successful API call) |
| L29 | `return json.loads(content)` | happy path only (valid JSON) |
| L31–32 | `return {"error":"API connection failure", ...}` | input that raises `OpenAIError` |
| L33–34 | `return {"error":"Invalid JSON format returned from model", "raw_content":content}` | input where API succeeds but `content` is non-JSON |
| L35–36 | `return {"error":"An unexpected error occurred", ...}` | input that raises any non-`OpenAIError`, non-`JSONDecodeError` exception |

`main.py`
| Line(s) | Statement | Hit by |
|---|---|---|
| L60–65 | `handle_prompt`: `user_prompt = payload.get("prompt")`; `plan = generate_plan(user_prompt)` | any `POST /api/generate` |
| L69 | `blueprint_type = _resolve_blueprint_type(plan)` | any `POST /api/generate` |
| L71–72 | `if isinstance(plan, dict): plan["type"] = blueprint_type` | TRUE branch: plan is dict; FALSE branch: plan is non-dict |
| L52–57 | `_resolve_blueprint_type` body | any `POST /api/generate` |
| L74–78 | `return {"status":"success", "plan":..., "preview_url":...}` | any `POST /api/generate` |
| L81–83 | `health`: `return {"status":"ok"}` | `GET /api/health` |

### 1.2 Minimum JSON payloads for 100% statement coverage

| Input # | Payload / action | Mechanism to force the path | Statements newly covered |
|---|---|---|---|
| IN-1 | `POST /api/generate` `{"prompt":"A SaaS landing page for an AI note-taking app"}` | Patch `plan_generator.client` so `chat.completions.create` returns an object whose `choices[0].message.content` is a valid JSON string `{"type":"landing-page",...}` | L15–16, L18–26, L28, L29 + `handle_prompt` L62,65,69,71–72(TRUE),74–78 + `_resolve_blueprint_type` L53–57 |
| IN-2 | `POST /api/generate` `{"prompt":"anything"}` | Patch `client.chat.completions.create` to `raise OpenAIError("upstream down")` | L31–32 (`except OpenAIError`) + `handle_prompt` full path with error dict |
| IN-3 | `POST /api/generate` `{"prompt":"anything"}` | Patch `client` to return `content = "not-json{bad"` | L33–34 (`except json.JSONDecodeError`) |
| IN-4 | `POST /api/generate` `{"prompt":"anything"}` | Force a non-`OpenAIError` exception — e.g. patch `open(...)` to `raise FileNotFoundError`, OR send `{"prompt":null}` so `None` flows into the chat message and the SDK raises a `TypeError` | L35–36 (`except Exception`) |
| IN-5 | `POST /api/generate` with a mocked `generate_plan` returning a **non-dict** (e.g. `["not","a","dict"]` or `"raw string"`) | Patch `ai_engine.main.generate_plan` to return a list/string | `handle_prompt` L71 FALSE branch (the `isinstance` guard skips the mutation; `preview_url` is still built from `_resolve_blueprint_type`, which will itself hit the generic-`except` risk — see §2) |
| IN-6 | `GET /api/health` | direct call | `main.py` L81–83 |

**Minimum set = {IN-1, IN-2, IN-3, IN-4, IN-5, IN-6} → 100% statement coverage of both backend files.**

### 1.3 Edge-case statements and how to trigger them

| Edge-case statement | How to trigger |
|---|---|
| `except OpenAIError` (L31) | Unreachable/`OLLAMA_CLOUD_BASE_URL` host, or patch `client.chat.completions.create` to raise `openai.OpenAIError`. |
| `except json.JSONDecodeError` (L33) | Patch the mocked `response.choices[0].message.content` to a non-JSON string (e.g. `"Sure! Here is your plan: ..."`). Note: `content` is guaranteed bound here because `JSONDecodeError` can only originate from `json.loads(content)` on L29. |
| `except Exception` (L35) — **missing-prompt-file variant** | `os.chdir()` to a non-root directory before calling `generate_plan`, so `open("ai_engine/prompts/system_prompt.txt")` raises `FileNotFoundError`. (In the live app `main.py` L18 pins CWD to root, so this is only triggerable by unit tests that bypass the app bootstrap.) |
| `except Exception` (L35) — **null-prompt variant** | Send `{"prompt": null}`; `payload.get("prompt")` → `None` → SDK call with `content=None` typically raises `TypeError`/`BadRequestError` (a non-`OpenAIError` in some client versions) → caught by generic handler. |
| `isinstance(plan, dict)` FALSE (L71) | Mock `generate_plan` to return a non-dict (list/string). **Important structural note:** if `plan` is a non-dict, the *next* call `_resolve_blueprint_type(plan)` on L69 executes `plan.get("type", "dashboard")` on a `list`/`str` → raises `AttributeError`. There is **no try/except in `handle_prompt`**, so this edge case actually produces an unhandled `500`, not the clean `preview_url` path. Document this as a structural defect exposed by statement-coverage edge testing. |
| Module-level `OpenAI(...)` construction (L8–11) | Executed once at import; no runtime trigger needed. |
| `settings.py`'s `raise ValueError("GROQ_API_KEY not found...")` | **Not in the active import graph** (`settings.py` is not imported by `plan_generator.py` or `main.py`). Cannot be triggered through the live request path; only by importing `ai_engine.config.settings` directly in a test. Recorded as out-of-scope for statement coverage of the active path. |

---

## 2. Branch / Decision Coverage Test Cases

**Goal:** force both TRUE and FALSE outcomes at every decision point in the backend parsing logic (`_resolve_blueprint_type`, `handle_prompt`, `generate_plan`'s exception chain) and the frontend routing logic (`handleGenerate`, render ternaries, Next.js static-vs-dynamic route precedence).

### 2.1 Decision-point inventory

| ID | Location | Decision | TRUE outcome | FALSE outcome |
|---|---|---|---|---|
| D1 | `plan_generator.py` implicit | "OpenAIError raised?" | L31 handler runs | fall through to next handler |
| D2 | `plan_generator.py` implicit | "JSONDecodeError raised?" | L33 handler runs | fall through to next handler |
| D3 | `plan_generator.py` implicit | "Any other Exception raised?" | L35 handler runs | none raised (happy) |
| D4 | `main.py` L53 | `plan.get("type", "dashboard")` default used? | key present → use it | key absent → `"dashboard"` |
| D5 | `main.py` L54 | `_LEGACY_TYPE_MAP.get(raw, raw)` legacy hit? | raw ∈ legacy map → remap | raw ∉ legacy map → passthrough |
| D6 | `main.py` L55 | `resolved not in ALLOWED_BLUEPRINTS`? | fallback `"dashboard"` | keep `resolved` |
| D7 | `main.py` L71 | `isinstance(plan, dict)`? | mutate `plan["type"]` | skip mutation |
| D8 | `page.tsx` L110 | `!prompt.trim()`? | early `return` (no fetch) | proceed to fetch |
| D9 | `page.tsx` L133 | `!res.ok`? | throw → catch | parse JSON |
| D10 | `page.tsx` L138 | fetch rejected / exception thrown? | catch sets `error` | success path |
| D11 | `page.tsx` L171 | `!started`? | render idle welcome | render workspace |
| D12 | `page.tsx` L374 | `previewUrl` truthy? | render `<iframe>` | render placeholder/error |
| D13 | `page.tsx` L398 | `error` truthy (within placeholder)? | show error message | show spinner |
| D14 | Next.js router | static segment matches (`dashboard`/`business`/`landing-page`/`portfolio`)? | serve static route | fall through to `[type]` dynamic route |
| D15 | `Dashboard.tsx` | `type === "business"`? | title `"Acme Analytics"` | title `"CraftAI Blueprint"` |
| D16 | `Dashboard.tsx` `statusStyle` | `s==="Paid"` / `s==="Pending"` / else | emerald / amber / rose | (3-way, see §3 conditions) |

### 2.2 `blueprint_type` validation True/False matrix

The `blueprint_type` validation is the cascade D4 → D5 → D6 inside `_resolve_blueprint_type`. Each row forces a specific combination of TRUE/FALSE across D5 (legacy hit) and D6 (in-allowed-set). D4 (key present) is also exercised.

| Input `plan.type` (from LLM) | D4 key present? | D5 legacy hit? | D6 in ALLOWED? | Final `blueprint_type` | `preview_url` path | Branch outcome class |
|---|---|---|---|---|---|---|
| `"dashboard"` | TRUE | FALSE | TRUE (keep) | `"dashboard"` | `/blueprints/dashboard` | **Direct allow (TRUE-keep)** |
| `"landing-page"` | TRUE | FALSE | TRUE (keep) | `"landing-page"` | `/blueprints/landing-page` | Direct allow |
| `"portfolio"` | TRUE | FALSE | TRUE (keep) | `"portfolio"` | `/blueprints/portfolio` | Direct allow |
| `"business"` | TRUE | TRUE | TRUE (post-remap) | `"dashboard"` | `/blueprints/dashboard` | **Legacy remap (TRUE-rebuild)** |
| `"saas"` | TRUE | TRUE | TRUE (post-remap) | `"landing-page"` | `/blueprints/landing-page` | Legacy remap |
| `"website"` | TRUE | TRUE | TRUE (post-remap) | `"landing-page"` | `/blueprints/landing-page` | Legacy remap |
| `"app"` | TRUE | TRUE | TRUE (post-remap) | `"landing-page"` | `/blueprints/landing-page` | Legacy remap |
| `"site"` | TRUE | TRUE | TRUE (post-remap) | `"landing-page"` | `/blueprints/landing-page` | Legacy remap |
| `"analytics"` | TRUE | TRUE | TRUE (post-remap) | `"dashboard"` | `/blueprints/dashboard` | Legacy remap |
| `"admin"` | TRUE | TRUE | TRUE (post-remap) | `"dashboard"` | `/blueprints/dashboard` | Legacy remap |
| `"ecommerce"` | TRUE | FALSE | **FALSE → fallback** | `"dashboard"` | `/blueprints/dashboard` | **Fallback (FALSE→default)** |
| `"blog"` | TRUE | FALSE | FALSE → fallback | `"dashboard"` | `/blueprints/dashboard` | Fallback |
| `"../admin"` (path-injection) | TRUE | FALSE | FALSE → fallback | `"dashboard"` | `/blueprints/dashboard` | Fallback (security boundary) |
| `"PORTFOLIO"` (mixed case) | TRUE | FALSE | TRUE (`"portfolio"`) | `"portfolio"` | `/blueprints/portfolio` | Normalization (`.lower()`) |
| `" Portfolio "` (padded) | TRUE | FALSE | TRUE (`"portfolio"`) | `"portfolio"` | `/blueprints/portfolio` | Normalization (`.strip()`) |
| key absent (`{}`) | **FALSE** | — | — | `"dashboard"` | `/blueprints/dashboard` | **D4 default** |
| `None` (`{"type": null}`) | TRUE | FALSE | FALSE (`"none"`∉allowed) | `"dashboard"` | `/blueprints/dashboard` | Fallback via `str(None)` |

**Structural observation for the assignment:** by construction every legacy-map value (D5 TRUE) remaps into `ALLOWED_BLUEPRINTS`, so the combination "D5 TRUE ∧ D6 TRUE-fallback" is **unreachable**. This is a legitimately infeasible branch pair and should be documented as such rather than tested.

### 2.3 Specific inputs to force True vs. False/Fallback

- **Force D6 TRUE (keep, no fallback):** LLM returns `{"type":"portfolio"}` (or `"dashboard"`/`"landing-page"`). Assertion: `plan["type"]` stays unchanged; `preview_url` ends in `/blueprints/portfolio`.
- **Force D6 FALSE (fallback to `"dashboard"`):** LLM returns `{"type":"ecommerce"}` or `{"type":"../admin"}`. Assertion: `plan["type"]` is overwritten to `"dashboard"`; `preview_url` ends in `/blueprints/dashboard`; no path traversal in the URL.
- **Force D5 TRUE (legacy remap):** LLM returns `{"type":"business"}`. Assertion: `blueprint_type=="dashboard"` even though `"business"` is not in `ALLOWED_BLUEPRINTS`.
- **Force D5 FALSE (passthrough):** LLM returns `{"type":"portfolio"}`. Assertion: no remap; `_LEGACY_TYPE_MAP.get` returns the raw value.
- **Force D4 FALSE (absent key):** LLM returns `{}`. Assertion: `.get("type","dashboard")` supplies `"dashboard"`.
- **Force D7 TRUE:** mock `generate_plan` to return a dict → `plan["type"]` is mutated.
- **Force D7 FALSE:** mock `generate_plan` to return `["list"]` → mutation skipped (and, per §1.3, an `AttributeError` 500 likely raised by D4's `.get` on a list — document this).

### 2.4 Frontend branch inputs (routing)

| Branch | Input | Expected outcome |
|---|---|---|
| D8 TRUE | `prompt=""`, click Generate | no `fetch` call; UI stays on idle/welcome |
| D8 FALSE | `prompt="A dashboard for MRR"` | `fetch` fired |
| D9 TRUE | mock `fetch` → `Response({status:500})` | `throw` → `catch` → `error="Backend responded with 500"` |
| D9 FALSE | mock `fetch` → `Response({status:200, json:{plan,preview_url}})` | success path |
| D10 TRUE | mock `fetch` rejects (network/CORS down) | `error` set; placeholder error shown |
| D10 FALSE | mock `fetch` resolves | success path |
| D11 TRUE | initial render | idle welcome rendered |
| D11 FALSE | `started=true` | workspace layout rendered |
| D12 TRUE | `data.preview_url` present | `<iframe src=preview_url>` rendered |
| D12 FALSE | `data.preview_url` absent/undefined | placeholder (spinner) rendered — **silent gap** |
| D14 static | navigate `/blueprints/landing-page` | static `LandingPageBlueprint` component |
| D14 dynamic | navigate `/blueprints/ecommerce` | dynamic `[type]` → `<Dashboard type="ecommerce">` |
| D15 TRUE | render `<Dashboard type="business">` | title `"Acme Analytics"` |
| D15 FALSE | render `<Dashboard type="dashboard">` | title `"CraftAI Blueprint"` |

---

## 3. Control Flow Testing & Cyclomatic Complexity

### 3.1 Cyclomatic Complexity of `generate_plan` (the AI generation pipeline core)

**Control Flow Graph (CFG).** The `try` body is modelled as a single guarded node (the protected region) that can either complete normally or dispatch to one of the three ordered `except` handlers.

```
        ┌──────────────────────────────────────────────────────────┐
N1 Entry│                                                          │
        ▼                                                          │
   ┌────────────────────┐                                          │
   │ N2 guarded try body│ ── no exception ──▶ N3 success return    │
   │  open(prompt file) │                                              │
   │  client.create()   │ ── OpenAIError ───▶ N4 handler A return   │
   │  content = ...     │                                              │
   │  json.loads(...)   │ ── JSONDecodeError ─▶ N5 handler B return │
   └────────────────────┘ ── other Exception ──▶ N6 handler C return│
                                                                        │
                  N3 / N4 / N5 / N6  ──▶  N7 Exit                       │
```

**Nodes (N = 7):** N1 Entry · N2 guarded try block · N3 success return · N4 `except OpenAIError` return · N5 `except json.JSONDecodeError` return · N6 `except Exception` return · N7 Exit.
**Edges (E = 9):** N1→N2, N2→N3 (normal), N2→N4 (OpenAIError), N2→N5 (JSONDecodeError), N2→N6 (other Exception), N3→N7, N4→N7, N5→N7, N6→N7.

**Cyclomatic complexity:**
> **V(G) = E − N + 2 = 9 − 7 + 2 = 4**

Cross-check via predicate count: V(G) = P + 1, where P = 3 implicit predicates (one per `except` clause). 3 + 1 = **4**. ✅ Matches.

### 3.2 Basis paths through the backend pipeline

Because V(G) = 4, there are exactly **4 linearly independent basis paths** through `generate_plan`. Every other path is a linear combination of these.

| Basis Path | Trace through `generate_plan` | Trigger |
|---|---|---|
| **BP-1 (happy)** | N1→N2→N3→N7 : open prompt → API call OK → `content` valid JSON → `json.loads` succeeds → return plan dict | mocked valid JSON content |
| **BP-2 (API failure)** | N1→N2→N4→N7 : guarded block raises `OpenAIError` → handler A → `{"error":"API connection failure",...}` | mocked `OpenAIError` |
| **BP-3 (bad JSON)** | N1→N2→N5→N7 : API OK, `json.loads` raises `JSONDecodeError` → handler B → `{"error":"Invalid JSON format returned from model","raw_content":content}` | mocked non-JSON `content` |
| **BP-4 (other failure)** | N1→N2→N6→N7 : any non-`OpenAIError`/non-`JSONDecodeError` exception (e.g. `FileNotFoundError`, `TypeError` from `None` prompt) → handler C → `{"error":"An unexpected error occurred",...}` | missing prompt file OR `{"prompt":null}` |

### 3.3 Complexity of the orchestrator + helpers (combined pipeline)

| Unit | Decision nodes | V(G) = P + 1 | Basis paths |
|---|---|---|---|
| `generate_plan` | 3 except predicates | **4** | BP-1..BP-4 (above) |
| `_resolve_blueprint_type` | 2 (`_LEGACY_TYPE_MAP.get` default; `resolved not in ALLOWED_BLUEPRINTS`) | **3** | RP-1 legacy remap; RP-2 direct allow; RP-3 fallback |
| `handle_prompt` | 1 (`isinstance(plan, dict)`) | **2** | HP-1 dict (mutate); HP-2 non-dict (skip) |
| **Whole `handle_prompt`→`generate_plan`→`_resolve_blueprint_type` pipeline** | additive | **4 + 3 + 2 = 9** | 9 independent end-to-end paths |

The 9 end-to-end basis paths are the Cartesian-ish product collapsed to the independent set: 4 (generate_plan) × {dict, non-dict} crossed with the 3 `_resolve` outcomes — but since `_resolve_blueprint_type` is reached on every call, the independent set is the union of:
- BP-1 ⊗ RP-1/RP-2/RP-3 ⊗ HP-1 (happy plan is a dict) → 3 paths
- BP-2/BP-3/BP-4 ⊗ RP-3 (error dicts have no `type` → D4 default → RP-3 fallback) ⊗ HP-1 → 3 paths
- BP-1 ⊗ HP-2 (non-dict plan) → 1 path (structural defect: raises `AttributeError` in `_resolve`)
- HP-1 with a dict whose `type` is a legacy value (RP-1) and with a direct-allowed value (RP-2) → 2 paths already counted above.

So the **9 concrete basis-path test cases** for the pipeline are listed in §3.4.

### 3.4 Concrete test case per independent path

| Path ID | Input | Mock setup | Expected `generate_plan` return | Expected `preview_url` | Expected `status` |
|---|---|---|---|---|---|
| BP-1 / RP-2 / HP-1 | `{"prompt":"landing page for SaaS"}` | `content='{"type":"landing-page",...}'` | plan dict, `type="landing-page"` | `.../blueprints/landing-page` | `success` |
| BP-1 / RP-1 / HP-1 | `{"prompt":"business site"}` | `content='{"type":"business",...}'` | plan dict, `type="business"` | `.../blueprints/dashboard` (legacy remap) | `success`; `plan.type` mutated to `"dashboard"` |
| BP-1 / RP-3 / HP-1 | `{"prompt":"online store"}` | `content='{"type":"ecommerce",...}'` | plan dict, `type="ecommerce"` | `.../blueprints/dashboard` (fallback) | `success`; `plan.type` mutated to `"dashboard"` |
| BP-2 / RP-3 / HP-1 | `{"prompt":"x"}` | `client.create` raises `OpenAIError` | `{"error":"API connection failure",...}` | `.../blueprints/dashboard` (no `type` → default) | `success` (anti-pattern) |
| BP-3 / RP-3 / HP-1 | `{"prompt":"x"}` | `content="not json"` | `{"error":"Invalid JSON format returned from model",...}` | `.../blueprints/dashboard` | `success` (anti-pattern) |
| BP-4 / RP-3 / HP-1 | `{"prompt":"x"}` | `open()` raises `FileNotFoundError` | `{"error":"An unexpected error occurred",...}` | `.../blueprints/dashboard` | `success` (anti-pattern) |
| BP-4 / RP-3 / HP-1 (null) | `{"prompt":null}` | `None` → SDK raises `TypeError` | `{"error":"An unexpected error occurred",...}` | `.../blueprints/dashboard` | `success` (anti-pattern) |
| BP-1 / HP-2 (non-dict) | `{"prompt":"x"}` | mock `generate_plan` returns `["list"]` | `["list"]` | **unhandled 500** (`_resolve` calls `.get` on a list) | `500` — structural defect |
| (orchestrator-only) `GET /api/health` | none | none | n/a | n/a | `{"status":"ok"}` |

---

## 4. Data Flow Testing (DEF-USE Chains)

### 4.1 DU chain for `prompt`

The user's prompt crosses a **network boundary** (browser → FastAPI → LLM SDK). DEF/USE sites:

| Step | Node | DEF or USE | Variable form | File:line |
|---|---|---|---|---|
| 1 | `<textarea>` `onChange` | DEF | `prompt` (React state) | `page.tsx` L203 / L338 |
| 2 | `handleGenerate` guard | USE | `prompt.trim()` (boolean test) | `page.tsx` L110 |
| 3 | `JSON.stringify({prompt})` | USE | `prompt` (serialized into fetch body) | `page.tsx` L131 |
| 4 | HTTP POST body (network) | DEF (re-born) | raw JSON `{"prompt": ...}` | wire |
| 5 | `handle_prompt(payload)` | DEF | `payload` (FastAPI-parsed dict) | `main.py` L61 |
| 6 | `user_prompt = payload.get("prompt")` | DEF | `user_prompt` | `main.py` L62 |
| 7 | `generate_plan(user_prompt)` | USE | `user_prompt` passed as arg | `main.py` L65 |
| 8 | `messages=[{...,"content": user_prompt}]` | USE | `user_prompt` → LLM user message | `plan_generator.py` L22 |
| 9 | `client.chat.completions.create(...)` | USE | outbound to LLM endpoint | `plan_generator.py` L18 |

**Anomalies in the `prompt` DU chain (chain-breaking test targets):**
- **A1 — null prompt:** `{"prompt": null}` → at step 6 `user_prompt = None`; at step 8 `content: None` is sent to the SDK. The SDK typically raises → the value is *used* in an exception path rather than the happy path. The chain is not broken (the value is consumed) but it produces a fault. **Test:** send `{"prompt": null}`, expect `except Exception` (BP-4).
- **A2 — missing key:** `{}` → step 6 `user_prompt = None` (identical downstream to A1). **Test:** send `{}`.
- **A3 — non-string prompt:** `{"prompt": 12345}` → step 6 `user_prompt = 12345`; step 8 `content: 12345` (non-string). Some SDK versions coerce; others raise. **Test:** send `{"prompt": 12345}`, document actual behavior.
- **A4 — empty/whitespace:** `{"prompt": "   "}` → passes the *backend* (no guard at step 6), but the *frontend* D8 guard at step 2 aborts before the fetch. This is an asymmetry: the frontend DEF-side guard exists, the backend USE-side guard does not. **Test:** confirm frontend aborts; confirm backend forwards `"   "` to the LLM.
- **A5 — prompt with control characters / very long string:** boundary test on the serialization at step 3 and the LLM message at step 8.

### 4.2 DU chain for `blueprint_type`

This variable is born in the LLM output, **modified** by the backend fallback cascade, and **used** by both the backend (URL construction) and the Next.js iframe (as an opaque URL). DEF/USE sites:

| Step | Node | DEF or USE | Form | File:line |
|---|---|---|---|---|
| 1 | LLM `json.loads(content)` | DEF (origin) | `plan["type"]` (e.g. `"landing-page"`, `"business"`, `"ecommerce"`) | `plan_generator.py` L29 |
| 2 | `_resolve_blueprint_type(plan)` call | USE | `plan` read | `main.py` L69 |
| 3 | `raw = str(plan.get("type","dashboard")).strip().lower()` | DEF | `raw` (normalized string) | `main.py` L53 |
| 4 | `resolved = _LEGACY_TYPE_MAP.get(raw, raw)` | DEF/MODIFY | `resolved` (legacy-remapped) | `main.py` L54 |
| 5 | `if resolved not in ALLOWED_BLUEPRINTS: resolved = "dashboard"` | MODIFY (conditional DEF) | `resolved` overwritten to `"dashboard"` | `main.py` L55–56 |
| 6 | `return resolved` | USE | returned as `blueprint_type` | `main.py` L57 |
| 7 | `blueprint_type = _resolve_blueprint_type(plan)` | DEF | `blueprint_type` (caller scope) | `main.py` L69 |
| 8 | `plan["type"] = blueprint_type` | USE + MODIFY | written back into `plan` (only if `isinstance(plan, dict)`) | `main.py` L72 |
| 9 | `f".../blueprints/{blueprint_type}"` | USE | interpolated into `preview_url` | `main.py` L77 |
| 10 | HTTP response JSON (network) | DEF (re-born) | `data.preview_url` | wire |
| 11 | `setPreviewUrl(data.preview_url)` | DEF | `previewUrl` (React state) | `page.tsx` L136 |
| 12 | `<iframe src={previewUrl}>` | USE | rendered as iframe source | `page.tsx` L388–390 |
| 13 | Next.js router parses `/blueprints/{type}` | USE | route segment → static or `[type]` dynamic | Next.js file router |

**Anomalies in the `blueprint_type` DU chain (chain-breaking test targets):**
- **B1 — misclassified type interception:** LLM emits `{"type":"business"}` (misclassified — `business` is not a real frontend route). Step 4 remaps `raw="business"` → `resolved="dashboard"`. Step 8 writes `"dashboard"` back into `plan`. Step 9 builds `.../blueprints/dashboard`. **Test:** assert both `plan.type=="dashboard"` AND `preview_url` end with `/blueprints/dashboard` (the write-back at step 8 is what keeps the JSON panel and the iframe in sync — a mutation here is a real bug).
- **B2 — unrecognized type fallback:** LLM emits `{"type":"ecommerce"}`. Steps 4 (no remap) → 5 (`"ecommerce"∉ALLOWED` → overwrite `"dashboard"`). **Test:** assert fallback and that no `ecommerce` segment leaks into the URL.
- **B3 — path-injection type:** LLM emits `{"type":"../admin"}`. Step 3 `str(...).strip().lower()` → `"../admin"`; step 5 fallback → `"dashboard"`. **Test:** assert `preview_url` contains no `..` and resolves to `/blueprints/dashboard`.
- **B4 — type absent:** LLM emits `{}`. Step 3 `plan.get("type","dashboard")` → `"dashboard"`. **Test:** assert `blueprint_type=="dashboard"`.
- **B5 — type is `null`:** LLM emits `{"type": null}`. Step 3 `str(None)` → `"none"` → step 5 fallback → `"dashboard"`. **Test:** assert no `None`/`"null"` reaches the URL.
- **B6 — non-dict plan breaks the chain:** if `generate_plan` returns a non-dict, step 2 (`plan.get`) raises `AttributeError` before `blueprint_type` is ever DEF'd at step 7. The DU chain is **broken** (the variable is never defined) and the request 500s. **Test:** mock `generate_plan` to return `["list"]`, assert HTTP 500 (documents the missing try/except in `handle_prompt`).
- **B7 — frontend never inspects `type`:** on the frontend, `data.plan.type` is **not** a USE site — only `data.preview_url` is used (step 11). **Test:** send a response where `plan.type="dashboard"` but `preview_url=".../blueprints/portfolio"`; assert the iframe loads `/portfolio` (proves the frontend trusts `preview_url`, not `type`).
- **B8 — missing `preview_url`:** backend returns `{plan:{...}}` with no `preview_url`. Step 11 `setPreviewUrl(undefined)`; step 12 `previewUrl` is falsy → iframe not rendered. The `blueprint_type`→iframe chain is **silently broken**. **Test:** assert no `<iframe>` and no error surfaced.

### 4.3 DU-chain-breaking test cases (consolidated)

| ID | Chain | Input / mock | Expected chain behavior |
|---|---|---|---|
| DU-P1 | `prompt` null | `{"prompt": null}` | `user_prompt=None` → LLM SDK fault → BP-4 error dict |
| DU-P2 | `prompt` missing | `{}` | same as DU-P1 |
| DU-P3 | `prompt` non-string | `{"prompt": 12345}` | `user_prompt=12345` → SDK coerces or faults (document) |
| DU-P4 | `prompt` whitespace | `{"prompt":"   "}` | frontend aborts (D8 TRUE); backend (if called directly) forwards to LLM |
| DU-B1 | `blueprint_type` misclassified | mock `type="business"` | remap → `dashboard`; `plan.type` write-back verified |
| DU-B2 | `blueprint_type` unrecognized | mock `type="ecommerce"` | fallback → `dashboard` |
| DU-B3 | `blueprint_type` path-injection | mock `type="../admin"` | fallback collapses to `dashboard`; no traversal in URL |
| DU-B4 | `blueprint_type` absent | mock `{}` | default `dashboard` |
| DU-B5 | `blueprint_type` null | mock `{"type":null}` | `str(None)`→`"none"`→fallback `dashboard` |
| DU-B6 | non-dict plan | mock `generate_plan`→`["list"]` | DU chain breaks at step 2 → HTTP 500 |
| DU-B7 | frontend ignores `type` | `plan.type="dashboard"`, `preview_url=".../portfolio"` | iframe loads `/portfolio` |
| DU-B8 | missing `preview_url` | `{plan:{...}}` (no `preview_url`) | `previewUrl=undefined`; no iframe; no error |

---

## 5. Ready-to-Write Test Outlines

Five fully detailed test case outlines combining Statement (SC), Branch (BC), Control Flow (CF), and Data Flow (DF) techniques. Format: `[Test Case ID] | [Objective] | [Technique Used] | [Input Data] | [Expected Internal Path] | [Expected Output]`.

### TC-FINAL-01 — Happy-path blueprint generation (landing-page)

| Field | Value |
|---|---|
| **Test Case ID** | TC-FINAL-01 |
| **Objective** | Verify the optimal operational path: a valid prompt produces a valid plan, correct `blueprint_type` resolution, write-back into `plan.type`, and a routable `preview_url`. |
| **Technique Used** | SC (execute all happy-path statements) + BC (D5 FALSE, D6 TRUE-keep, D7 TRUE, D9 FALSE, D12 TRUE) + CF (basis path BP-1 ⊗ RP-2 ⊗ HP-1) + DF (full `prompt` and `blueprint_type` DU chains uninterrupted) |
| **Input Data** | `POST /api/generate` `{"prompt":"A SaaS landing page for an AI note-taking app"}`; patch `plan_generator.client.chat.completions.create` to return `choices[0].message.content = '{"type":"landing-page","pages":["home"],"sections":["Hero","Features","CTA"],"style":"modern","colorTheme":"dark","features":["navbar","footer"]}'`. |
| **Expected Internal Path** | `handle_prompt` L62 `user_prompt` DEF → L65 `generate_plan` (BP-1: open prompt file → API call → `content` → `json.loads` succeeds) → L69 `_resolve_blueprint_type` (RP-2: `raw="landing-page"`, no legacy remap, in ALLOWED → keep) → L71 `isinstance` TRUE → L72 `plan["type"]="landing-page"` → L74–78 return. |
| **Expected Output** | HTTP 200; `{"status":"success","plan":{"type":"landing-page",...},"preview_url":"http://localhost:3000/blueprints/landing-page"}`. On the frontend, `setPlan` + `setPreviewUrl` → iframe renders `/blueprints/landing-page` (static `LandingPageBlueprint`). |

### TC-FINAL-02 — Upstream LLM failure (OpenAIError) exposes the always-`"success"` anti-pattern

| Field | Value |
|---|---|
| **Test Case ID** | TC-FINAL-02 |
| **Objective** | Verify the `except OpenAIError` branch executes, the error is nested inside `plan`, and the top-level `status` remains `"success"` (documented defect). |
| **Technique Used** | SC (cover L31–32) + BC (D1 TRUE, D6 FALSE-fallback via absent `type`, D7 TRUE on error dict) + CF (basis path BP-2 ⊗ RP-3 ⊗ HP-1) + DF (`prompt` DEF→USE across network; `blueprint_type` chain originates from an error dict with no `type`) |
| **Input Data** | `POST /api/generate` `{"prompt":"anything"}`; patch `client.chat.completions.create` to `raise openai.OpenAIError("upstream down")`. |
| **Expected Internal Path** | `handle_prompt` L62 → L65 `generate_plan` (BP-2: open prompt file OK → API call raises `OpenAIError` → handler A return) → L69 `_resolve_blueprint_type` (error dict has no `type` → D4 default `"dashboard"` → RP-3) → L71 TRUE (error dict is a dict) → L72 writes `"dashboard"` into the error dict → L74–78 return. |
| **Expected Output** | HTTP 200; `{"status":"success","plan":{"error":"API connection failure","details":"upstream down","type":"dashboard"},"preview_url":"http://localhost:3000/blueprints/dashboard"}`. Frontend `setPlan` stores the error dict; JSON panel renders it; iframe loads `/blueprints/dashboard` (a mock, not a real result). |

### TC-FINAL-03 — Invalid input payload: null prompt trips the generic exception handler

| Field | Value |
|---|---|
| **Test Case ID** | TC-FINAL-03 |
| **Objective** | Verify that a missing/invalid `prompt` is not validated by the backend, flows through the DU chain as `None`, and is caught only by the generic `except Exception` handler — proving the absence of input validation. |
| **Technique Used** | SC (cover L35–36) + BC (D3 TRUE, D4 FALSE→default, D7 TRUE) + CF (basis path BP-4 ⊗ RP-3 ⊗ HP-1) + DF (DU-P1: `prompt` DEF at textarea is bypassed; `user_prompt=None` DEF at L62, USE at L22 as `content:None` → fault) |
| **Input Data** | `POST /api/generate` `{"prompt": null}` (and a second run with `{}`). No patch needed; let the real/mocked SDK receive `content=None`. |
| **Expected Internal Path** | `handle_prompt` L62 `user_prompt = None` → L65 `generate_plan` (BP-4: open prompt file OK → `client.create` with `content=None` raises a non-`OpenAIError` `TypeError`/`BadRequestError` → handler C return) → L69 `_resolve_blueprint_type` (error dict, no `type` → `"dashboard"`) → L71 TRUE → L72 → return. |
| **Expected Output** | HTTP 200; `{"status":"success","plan":{"error":"An unexpected error occurred","details":"<TypeError msg>","type":"dashboard"},"preview_url":"http://localhost:3000/blueprints/dashboard"}`. Documents that invalid payloads yield `status:"success"` with an embedded error — a validation gap. |

### TC-FINAL-04 — Type-drift fallback + path-injection collapse (`blueprint_type` chain)

| Field | Value |
|---|---|
| **Test Case ID** | TC-FINAL-04 |
| **Objective** | Verify that unrecognized / malicious LLM `type` values are collapsed by the fallback branch, that `plan.type` is overwritten, and that no path traversal leaks into `preview_url`. |
| **Technique Used** | SC (cover L55–56 fallback) + BC (D5 FALSE, D6 TRUE-fallback, D7 TRUE) + CF (BP-1 ⊗ RP-3 ⊗ HP-1) + DF (DU-B2 + DU-B3: `blueprint_type` DEF at LLM, MODIFY at L55, USE at L72 write-back and L77 URL interpolation) |
| **Input Data** | Two runs: (a) `content='{"type":"ecommerce",...}'`; (b) `content='{"type":"../admin",...}'`. Both via `POST /api/generate` with a valid prompt. |
| **Expected Internal Path** | `handle_prompt` L62 → L65 BP-1 (valid JSON) → L69 `_resolve_blueprint_type`: L53 `raw="ecommerce"` (resp. `"../admin"`) → L54 no legacy hit → L55 `"ecommerce"`∉`ALLOWED` (resp. `"../admin"`∉`ALLOWED`) → L56 `resolved="dashboard"` → L57 return → L71 TRUE → L72 `plan["type"]="dashboard"` → L77 `preview_url=.../blueprints/dashboard`. |
| **Expected Output** | HTTP 200; both runs: `plan.type=="dashboard"`, `preview_url=="http://localhost:3000/blueprints/dashboard"`, no `ecommerce`/`..` substring in the URL. Frontend iframe loads the dashboard mock. |

### TC-FINAL-05 — Frontend routing fallback + missing `preview_url` silent gap (DU chain break at the iframe)

| Field | Value |
|---|---|
| **Test Case ID** | TC-FINAL-05 |
| **Objective** | Verify (a) the frontend trusts `preview_url` and never inspects `plan.type`, and (b) a "successful" response lacking `preview_url` silently breaks the `blueprint_type`→iframe DU chain without surfacing an error. Also verify the Next.js dynamic `[type]` route catches unknown types. |
| **Technique Used** | SC (cover `handleGenerate` success + render placeholder branch) + BC (D8 FALSE, D9 FALSE, D10 FALSE, D12 TRUE then FALSE, D14 static then dynamic) + CF (frontend basis paths P9 and the `previewUrl`-falsy render branch) + DF (DU-B7: `plan.type` is NOT a frontend USE site; DU-B8: `preview_url` absent → `previewUrl=undefined` → iframe USE never reached) |
| **Input Data** | Render `page.tsx` with mocked `fetch`: (a) resolve `200` with `{plan:{type:"dashboard",...}, preview_url:"http://localhost:3000/blueprints/portfolio"}` (mismatched type vs URL); (b) resolve `200` with `{plan:{type:"dashboard",...}}` (no `preview_url`); then navigate the browser to `/blueprints/ecommerce`. |
| **Expected Internal Path** | `handleGenerate` L110 FALSE → L128 `fetch` → L133 FALSE → L134 `res.json()` → L135 `setPlan` → L136 `setPreviewUrl`: (a) `previewUrl=".../portfolio"` → L374 TRUE → L388 `<iframe src=".../portfolio">`; (b) `previewUrl=undefined` → L374 FALSE → L398 FALSE → spinner placeholder (no error). Router: `/blueprints/ecommerce` → no static match → D14 dynamic `[type]` → `<Dashboard type="ecommerce">`. |
| **Expected Output** | (a) iframe loads `/blueprints/portfolio` despite `plan.type="dashboard"` — proves frontend routes by `preview_url` only. (b) no iframe rendered, `error` remains `null`, UI stuck on spinner — proves the silent gap when `preview_url` is missing. (c) `/blueprints/ecommerce` renders `<Dashboard>` with title `"CraftAI Blueprint"` via the dynamic fallback route. |

---

### Coverage summary (for the assignment's metrics section)

| Technique | Target | Minimum inputs to satisfy |
|---|---|---|
| Statement Coverage | 100% of `main.py` + `plan_generator.py` executable lines | IN-1..IN-6 (§1.2) — 6 inputs |
| Branch Coverage | TRUE + FALSE for D1–D16 | §2.2 matrix + §2.4 inputs (note: D5 TRUE ∧ D6 TRUE-fallback is infeasible by construction) |
| Control Flow (basis paths) | All 4 basis paths of `generate_plan`; all 9 of the combined pipeline | §3.4 — 9 path test cases |
| Data Flow (DU chains) | `prompt` (9 sites) and `blueprint_type` (13 sites), incl. all chain-breaking anomalies | DU-P1..DU-P4 + DU-B1..DU-B8 (§4.3) |

**Structural defects surfaced by this white-box analysis (record in the assignment's findings):**
1. `handle_prompt` has **no try/except** → a non-dict `plan` raises `AttributeError` at `_resolve_blueprint_type`'s `.get` and returns HTTP 500 (DU-B6 / TC edge IN-5).
2. The response **always** returns `status:"success"` even when the plan is an error dict (TC-FINAL-02, TC-FINAL-03).
3. **No backend input validation** on `prompt` — `None`/non-string/whitespace are forwarded to the LLM (DU-P1..P4).
4. `validate_plan` and `plan_schema` are **dead code** in the active path → section/style allow-lists are not enforced.
5. **No timeout** on the backend SDK call or the frontend `fetch` → a hung upstream leaves the UI stuck (TC-FINAL-05(b) behavior).
6. Frontend **silently no-ops** when `preview_url` is absent (DU-B8).
7. `plan_schema.ALLOWED_TYPES` (`portfolio/landing-page/business`) **conflicts** with the active `ALLOWED_BLUEPRINTS` (`dashboard/landing-page/portfolio`) and the system prompt.