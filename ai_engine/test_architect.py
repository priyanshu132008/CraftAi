"""Quick end-to-end test for Agent 1 (Architect Agent).

Run from the project root:
    python ai_engine/test_architect.py
"""
import json
import sys
from pathlib import Path

# Make `agents.architect` importable no matter where the script is launched
# from (python ai_engine/test_architect.py puts ai_engine/ on sys.path[0]
# already, but be explicit so `python -m` or other CWDs work too).
sys.path.insert(0, str(Path(__file__).resolve().parent))

from agents.architect import ArchitectAgent


def main():
    agent = ArchitectAgent()
    print(f"LLM endpoint: {agent.base_url} | model: {agent.model}\n")

    plan = agent.plan_architecture("Build a luxury watch brand landing page")
    print("ArchitectAgent output:")
    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()