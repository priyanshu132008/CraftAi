"""Quick end-to-end test for the Agent 1 -> Agent 2 pipeline handoff.

Groq (Architect) creates the JSON plan, local Ollama (Developer) translates
it into a raw Next.js page.tsx.

Run from the project root:
    python ai_engine/test_developer.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agents.architect import ArchitectAgent
from agents.developer import DeveloperAgent


def main():
    architect = ArchitectAgent()
    developer = DeveloperAgent()
    print(f"Architect -> {architect.base_url} | model: {architect.model}")
    print(f"Developer -> {developer.base_url} | model: {developer.model}\n")

    # Stage 1: Architect (Groq) produces the structured plan.
    plan = architect.plan_architecture("Build a sleek portfolio for a freelance photographer.")
    print("=== Architect plan ===")
    print(json.dumps(plan, indent=2))

    # Stage 2: Developer (Ollama) turns the plan into a multi-file project
    # (strict JSON: {"files": [{"path", "content"}, ...]}).
    print("\n=== Developer project files ===")
    files = developer.generate_files(plan, connectors=["supabase"])
    if not files:
        print("[test_developer] Developer returned no files — check Ollama is running.")
        sys.exit(1)

    for f in files:
        print(f"\n--- {f['path']} ({len(f['content'].splitlines())} lines) ---")
        print(f['content'])

    # Sanity checks on the handoff result.
    paths = [f["path"] for f in files]
    print("\n=== Sanity checks ===")
    print(f"file count > 1: {len(paths) > 1}")
    print(f"has package.json: {'package.json' in paths}")
    print(f"has entry src/App.tsx: {'src/App.tsx' in paths}")
    print(f"has connectors file: {any('connectors' in p for p in paths)}")


if __name__ == "__main__":
    main()