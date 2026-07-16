import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend-craftai"))

from services.planner import generate_plan


def test_generate_plan_returns_portfolio_sections():
    result = generate_plan("build a portfolio website")

    assert result["type"] == "portfolio"
    assert "Hero" in result["sections"]
    assert "About" in result["sections"]
