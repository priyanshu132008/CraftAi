# CraftAI Master Context Document

## 1. Project Vision (Final Version - 2026)
CraftAI is an AI-Powered Vibe Coding IDE that transforms natural language prompts into structured, editable web applications. 
Unlike current AI wrappers that hallucinate spaghetti code, CraftAI uses a deterministic pipeline:
Prompt → AI JSON Plan → Structural Validation → Blueprint Selection → Code Generation.
Future features include:
- Multi-Agent workflow (Architect, UI Dev, Backend Dev).
- Abstract Syntax Tree (AST) Diff patching for instant code updates without full file regeneration.
- Browser-Native WebContainers (StackBlitz API) for local execution without heavy servers.

## 2. Immediate Goal (Tomorrow's 2nd Evaluation MVP)
We only have 15-20% of the architecture built, but we have an evaluation tomorrow. We need a "Smoke and Mirrors" MVP.
- We are bypassing the physical File Generator and Monaco IDE for now.
- The AI Engine (Python/FastAPI) successfully generates a JSON plan using a local LLM.
- **The Hack:** The FastAPI backend must intercept the prompt, generate the JSON, read the project `type` (e.g., "dashboard"), and return the JSON plan alongside a hardcoded `preview_url` pointing to a pre-built frontend mock route (e.g., `http://localhost:3000/blueprints/dashboard`).

## 3. Current System State & Tech Stack
- **Frontend:** Next.js, Tailwind, running on localhost:3000 (Built by another team member).
- **Backend:** FastAPI, Python, Uvicorn (My responsibility).
- **AI Engine:** Currently inside the `/ai_engine` folder containing `main.py`, `/services/plan_generator.py`, etc.
- **The Problem:** We are facing a severe `ModuleNotFoundError` when trying to run `uvicorn main:app --reload` from the root directory because the internal imports in `ai_engine` are losing their path references.