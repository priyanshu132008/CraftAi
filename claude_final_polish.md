# CraftAI Master Overhaul Protocol

## 1. Fix the AI Engine Brain (System Prompt)
The LLM is currently outputting random values for the JSON `type` field. 
- Open `ai_engine/prompts/system_prompt.txt` (or wherever the system prompt is defined).
- Add a strict constraint: "You must output a JSON object. The `type` field MUST strictly be one of these three exact strings: 'dashboard', 'landing-page', or 'portfolio'. Do not use any other values like 'business' or 'website'."

## 2. Upgrade the Workspace UI (src/app/page.tsx)
The current UI is too flat. Make it look like an elite Tier-1 tool (Cursor / Linear vibe).
- **Background:** Add a subtle radial gradient or a faint dot-grid pattern behind the dark neutral background (`bg-[#09090b]`).
- **Prompt Bar:** Make it float. Give it a distinct glassmorphic look (`bg-white/5 backdrop-blur-xl border border-white/10`).
- **Generate Button:** Make it pop with a modern gradient (`bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90`).
- **Sidebar:** Add subtle glowing accents. Make the JSON plan text smaller and color-coded like a real Monaco editor (use different text colors for keys and values).

## 3. Build Distinct Blueprints
Right now, the iframe only shows a dashboard. We need distinct pages so the user sees real variety based on their prompt.
- **Build `src/app/blueprints/landing-page/page.tsx`:** Design a stunning, modern SaaS landing page. Include a centered hero section with massive gradient text, a "Get Started" pill button, and a 3-column features grid. Use deep dark mode.
- **Build `src/app/blueprints/portfolio/page.tsx`:** Design a sleek, minimalist creative portfolio. Include a large typography intro ("Hi, I'm a Creator"), a bento-box style image/project grid (use Tailwind placeholder colors like `bg-neutral-800`), and a footer.
- Ensure the existing `business` dashboard is renamed or routed to `dashboard` to match the new strict LLM types.

## Execution
Rewrite the necessary files to achieve this exactly. Do not break the FastAPI routing. Make it look expensive.