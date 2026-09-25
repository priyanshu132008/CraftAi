# Frontend Emergency Protocol for CraftAI

## Mission Overview
The `craftai-frontend` folder is currently empty. We have a live evaluation tomorrow. The backend FastAPI server is already running perfectly on `http://127.0.0.1:8000`.

## Step 1: Investigate Git
Check the git history and branches for the `craftai-frontend` folder. If the frontend developer pushed code to a different branch (like `dev` or `ui`), switch to it and pull the code. If the code exists, start the dev server (`npm run dev`) and stop here.

## Step 2: Scaffold the Emergency UI (If repo is empty)
If there is no Next.js code in `craftai-frontend`, you must build it right now:
1. Delete the empty `craftai-frontend` folder and run: `npx create-next-app@latest craftai-frontend --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --use-npm`
2. `cd` into `craftai-frontend` and install lucide-react: `npm install lucide-react`

## Step 3: Implement the Workspace Code
Replace the contents of `src/app/page.tsx` with a dark-mode workspace UI. It must contain:
- A text area for the prompt.
- A "Generate" button that sends a POST request to `http://127.0.0.1:8000/api/generate` with the JSON payload `{ "prompt": "<user_input>" }`.
- A left sidebar showing a simulated loading state ("Parsing intent...", "Mapping blueprint...").
- A display area in the sidebar for the returned JSON plan.
- A main content area containing an `<iframe>` that sets its `src` to the returned `preview_url`.

## Step 4: Create the Mock Blueprint Route
The backend is returning `preview_url` as `http://localhost:3000/blueprints/business`. 
To prevent the iframe from hitting a 404, create a stunning, static dark-mode dummy page at `src/app/blueprints/business/page.tsx`. It should look like a real SaaS financial analytics dashboard (use Tailwind to make a sidebar, header, and grid cards for revenue/charts).

## Step 5: Start the Server
Once built, run `npm run dev` on port 3000.