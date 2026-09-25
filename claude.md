# Instructions for Claude

You are acting as the Lead Backend & AI Architect for CraftAI. Your immediate directive is to fix the FastAPI routing and server startup crash so we can present our MVP tomorrow.

## Immediate Tasks:
1. **Fix the Uvicorn Startup Crash:** 
   Analyze the current directory structure. The user is trying to launch the FastAPI server from the root `CraftAi` folder, but the API and AI logic live inside `/ai_engine`. 
   Fix the import paths. You may either create a wrapper `main.py` at the root that correctly imports the `ai_engine` app, or refactor the internal `ai_engine` imports so `uvicorn ai_engine.main:app` runs perfectly without `ModuleNotFoundError`.

2. **Verify the Generation Endpoint:**
   Ensure the `POST /api/generate` route is functioning. It must:
   - Accept a JSON payload with a `prompt` string.
   - Pass it to the existing `generate_plan` service.
   - Return a JSON response containing: `status`, `plan` (the JSON from the AI), and `preview_url` (formatted as `http://localhost:3000/blueprints/{blueprint_type}`).

3. **Enable CORS:**
   Ensure `fastapi-cors` or standard FastAPI CORSMiddleware is correctly applied so the Next.js frontend (port 3000) can hit this backend without browser blocking.

## Constraints:
- Do not rewrite the existing `plan_generator.py` logic; it works. Focus purely on the FastAPI wrapper, paths, and routing.
- Do not prompt the user for manual terminal tests until you have confidently mapped the Python `sys.path` or refactored the imports.