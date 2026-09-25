# UI/UX Overhaul Protocol: CraftAI

## Mission
The current Next.js frontend in `craftai-frontend` looks basic, blocky, and cheap. We need it to look like a 2026 Tier-1 developer tool (like Cursor, v0.dev, or Linear). 
You must rewrite `src/app/page.tsx` (the workspace) and `src/app/blueprints/business/page.tsx` (the dashboard) with premium Tailwind CSS styling.

## 1. Workspace UI Upgrade (src/app/page.tsx)
- **Background:** True deep dark mode (e.g., `bg-[#0a0a0a]`).
- **Borders:** Extremely subtle, barely visible borders (`border-white/10`).
- **Prompt Area:** Make the text area look like a floating command palette. Add a subtle inner shadow and a sleek, glowing "Generate" button using gradients (e.g., `bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500`).
- **Sidebar Pipeline:** The animated steps ("Parsing intent...") should use pulsing neon dots and smooth fade-in animations (`animate-pulse`, `transition-all`).
- **JSON Display:** Make the JSON output look like a proper code editor block with syntax highlighting colors (emerald for strings, blue for keys, slate for brackets).

## 2. Mock Dashboard Upgrade (src/app/blueprints/business/page.tsx)
- **Aesthetic:** Vercel / Stripe dashboard vibe.
- **Cards:** Glassmorphism style. Use `bg-white/5 backdrop-blur-md border border-white/10 rounded-xl`.
- **Typography:** Sleek, tight tracking. Make numbers (like Revenue) massive and crisp. Use gradient text for positive percentages (`bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400`).
- **Icons:** Wrap Lucide icons in soft, rounded-full background containers with low opacity (e.g., `bg-blue-500/20 text-blue-400 p-2`).
- **Layout:** Ensure the sidebar is completely distinct from the main content area with a harsh, 1px border.

## Execution
Do not change the API routing logic. Only rewrite the Tailwind classes and JSX layout to implement these high-end visual upgrades immediately.