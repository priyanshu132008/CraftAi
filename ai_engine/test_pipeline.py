"""Master 3-agent pipeline test: Architect (Groq) -> Developer (Ollama) ->
Debugger (NVIDIA).

Run from the project root:
    python ai_engine/test_pipeline.py
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agents.architect import ArchitectAgent
from agents.developer import DeveloperAgent
from agents.debugger import DebuggerAgent

PROMPT = "Build a sleek SaaS landing page for an AI accounting tool."


def sanity_check(files: list) -> bool:
    """Pipeline succeeds when the Developer returned a parseable multi-file
    project with a React entry and no markdown fences in the content."""
    if not isinstance(files, list) or not files:
        return False
    paths = [f["path"] for f in files]
    has_entry = any(p in ("src/App.tsx", "src/app/page.tsx", "App.tsx", "page.tsx")
                   for p in paths)
    no_fences = not any("```" in f["content"] for f in files)
    return has_entry and no_fences


def main():
    print(f"Prompt: {PROMPT}\n")

    architect = ArchitectAgent()
    developer = DeveloperAgent()
    debugger = DebuggerAgent()
    print(f"Step A (Architect) -> {architect.base_url} | {architect.model}")
    print(f"Step B (Developer) -> {developer.base_url} | {developer.model}")
    print(f"Step C (Debugger)  -> {debugger.base_url} | {debugger.model}\n")

    # Step A: Groq generates the JSON plan.
    t0 = time.time()
    plan = architect.plan_architecture(PROMPT)
    step_a = time.time() - t0
    print(f"=== Step A: Architect plan ({step_a:.1f}s) ===")
    print(json.dumps(plan, indent=2))

    # Step B: Ollama turns the plan into a multi-file project (JSON files[]).
    t0 = time.time()
    files = developer.generate_files(plan)
    step_b = time.time() - t0
    if not files:
        print("[pipeline] FAILED: Developer returned no files.")
        sys.exit(1)
    print(f"\n=== Step B: Developer files ({step_b:.1f}s) ===")
    for f in files:
        print(f"  {f['path']} ({len(f['content'].splitlines())} lines)")
    print(f"file count: {len(files)}")

    # Step C: NVIDIA validates and fixes the entry page.
    t0 = time.time()
    entry = next((f for f in files
                  if f["path"] in ("src/App.tsx", "src/app/page.tsx", "App.tsx",
                                   "page.tsx")), files[0])
    final_code = debugger.validate_and_fix_code(plan, entry["content"])
    step_c = time.time() - t0
    if not final_code:
        print("[pipeline] FAILED: Debugger returned empty code.")
        sys.exit(1)
    entry["content"] = final_code
    print(f"\n=== Step C: Debugger final entry code ({step_c:.1f}s) ===")
    print(f"lines: {len(final_code.splitlines())}")

    print("\n=== Timing summary ===")
    print(f"Step A (Groq, Architect):   {step_a:6.1f}s")
    print(f"Step B (Ollama, Developer):{step_b:6.1f}s")
    print(f"Step C (NVIDIA, Debugger): {step_c:6.1f}s")
    print(f"Total: {step_a + step_b + step_c:.1f}s")

    print("\n=== Sanity checks on the generated project ===")
    ok = sanity_check(files)
    paths = [f["path"] for f in files]
    print(f"file count: {len(files)}")
    print(f"has React entry: {'src/App.tsx' in paths}")
    print(f"contains markdown fence: {any('```' in f['content'] for f in files)}")
    if ok:
        print("\nSUCCESS: 3-provider agentic pipeline complete.")
    else:
        print("\nFAILED: final_code did not pass sanity checks.")
        sys.exit(1)


if __name__ == "__main__":
    main()