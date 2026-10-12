"""Self-check for the Debugger edit agent's pure logic (no LLM calls).

Run:  PYTHONPATH=. venv/bin/python ai_engine/test_edit_agent.py
"""
from ai_engine.agents.debugger import DebuggerAgent


def make_agent():
    a = object.__new__(DebuggerAgent)  # skip __init__ (no API key needed)
    a.last_edit_error = ""
    a.model = "stub"
    return a


def test_target_matching():
    a = make_agent()
    files = [
        {"path": "src/App.tsx", "content": "x"},
        {"path": "src/components/Menu.tsx", "content": "x"},
        {"path": "src/components/Hero.tsx", "content": "x"},
    ]
    assert a._match_target_file(files, "add more menu options")["path"] \
        == "src/components/Menu.tsx"
    assert a._match_target_file(files, "make the hero brighter")["path"] \
        == "src/components/Hero.tsx"
    assert a._match_target_file(files, "change the footer colors")["path"] \
        == "src/App.tsx"  # no stem match -> entry fallback
    assert a._match_target_file([], "anything") is None
    print("target matching: ok")


def test_relative_structural_check():
    a = make_agent()
    # Apostrophe-heavy generated copy: the ORIGINAL already trips the naive
    # unbalanced heuristic. A patch that keeps the same copy must be
    # ACCEPTED (this was the universal-rejection bug).
    original = (
        "import React from 'react';\n"
        "export default function App() {\n"
        "  return <div>Don&apos;t wait — it's your time}</div>;\n"
        "}\n"
    )
    assert any(p.startswith("unbalanced")
              for p in a.structural_check(original)[1])
    patched = original.replace("your time", "your day")
    assert a._accepts_patch(original, patched), \
        "patch of an already-'unbalanced' original must pass"
    # A patch that introduces NEW imbalance is still rejected.
    broken = original + "\nconst x = ("
    assert not a._accepts_patch(original, broken)
    # Markdown fences always rejected.
    assert not a._accepts_patch(original, "```tsx\n" + original + "\n```")
    print("relative structural check: ok")


def test_fallback_flow():
    a = make_agent()

    class Resp:
        def __init__(self, content):
            self.choices = [type("C", (), {
                "message": type("M", (), {"content": content}),
                "finish_reason": "stop",
            })()]

    calls = []

    def fake_create(**kw):
        calls.append(kw)
        # Call 1 (whole-project patch): unparseable prose.
        # Call 2 (single-file fallback): clean fenced rewrite.
        return Resp("sorry, I cannot do that") if len(calls) == 1 \
            else Resp("```tsx\nOKCODE```")

    a.client = type("C", (), {"chat": type(
        "S", (), {"completions": type(
            "X", (), {"create": staticmethod(fake_create)})})})()

    files = [{"path": "src/App.tsx", "content": "import React from 'react';"},
             {"path": "src/Menu.tsx", "content": "export default () => <nav/>"}]
    changed = a.apply_edit(files, "add menu options")
    assert changed == [{"path": "src/Menu.tsx", "content": "OKCODE"}], changed
    assert len(calls) == 2, "stage-2 fallback must run after stage-1 fails"
    assert calls[1]["messages"][1]["content"].startswith("### FILE: src/Menu.tsx")
    print("fallback flow: ok")


if __name__ == "__main__":
    test_target_matching()
    test_relative_structural_check()
    test_fallback_flow()
    print("all edit-agent self-checks passed")