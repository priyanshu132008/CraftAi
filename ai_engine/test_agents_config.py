"""Init all 3 agents and verify none still point at localhost Ollama."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

from ai_engine.agents.architect import ArchitectAgent
from ai_engine.agents.developer import DeveloperAgent
from ai_engine.agents.debugger import DebuggerAgent


def check(name, agent):
    base = agent.base_url
    ok = "localhost" not in base and "127.0.0.1" not in base
    print(f"{name}: base_url={base} model={agent.model} -> {'CLOUD OK' if ok else 'FAIL: local Ollama'}")
    return ok


results = [
    check("ArchitectAgent", ArchitectAgent()),
    check("DeveloperAgent", DeveloperAgent()),
    check("DebuggerAgent", DebuggerAgent()),
]
assert all(results), "An agent still targets localhost:11434"
print("ALL 3 AGENTS ON CLOUD ENDPOINTS")
