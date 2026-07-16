import sys
from pathlib import Path

# Ensure tests can import the backend package even with folder name containing '-'
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend-craftai"))

from fastapi.testclient import TestClient
from unittest.mock import patch
import main

client = TestClient(main.app)


def test_generate_plan_endpoint():
    # Patch the route's local generate_plan reference to avoid calling real implementation
    with patch("routes.plan.generate_plan") as mock_generate:
        mock_generate.return_value = {"type": "portfolio", "sections": ["Hero", "About", "Contact"]}

        resp = client.post("/generate-plan", json={"prompt": "build a portfolio website"})

        assert resp.status_code == 200
        assert resp.json() == {"type": "portfolio", "sections": ["Hero", "About", "Contact"]}
