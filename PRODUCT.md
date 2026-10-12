# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React 19 + TypeScript SPA (`frontend/`), Tailwind v4 utilities layer over hand-written CSS tokens, framer-motion, three.js, Monaco editor, Supabase auth; FastAPI + agentic Python backend (`ai_engine/`). Frontend serves on :3000, backend on :8000.

## Users

High-end developers and technical founders *(user-supplied; not interviewed)*. They arrive with a product idea, know what a repository and a preview are, and judge the tool by the quality of what the agents produce — not by hand-holding.

## Product Purpose

CraftAI is an agentic AI development environment: the user describes an app in a prompt, and a multi-agent pipeline — the Architect plans it, the Developer writes the full repository, the Debugger polishes it — returns a running plan, code, and live preview. Success means the user ships or presents a working generated app without leaving the platform.

## Positioning

Not a snippet generator: a full multi-agent pipeline (Architect → Developer → Debugger) that produces complete, deployable projects with live preview and publishing. *(inferred from agent naming in Dashboard copy and GenerateStudio; labeled assumption.)*

## Operating Context

Desktop-first web, used in a focused work session: prompt in → watch the agent pipeline → edit in an IDE-style workspace → preview → deploy/publish. Light ("snow") and dark ("obsidian") themes; dark is the default because the workspace is designed dark-first.

## Capabilities and Constraints

- Prompt console with Build / Chat / Plan modes; generates plans, code, previews (`POST /api/generate`).
- Workspace with file tree, Monaco code viewer, terminal drawer, agent pipeline visualization.
- Connectors view (OAuth to external services), projects grid, search.
- Deploy modal + published-site hosting; Supabase auth (Google/GitHub/email).
- Modes: **Operate** for dashboard/IDE/workspace, **Persuade** for landing/auth pages *(user-supplied)*.

## Brand Commitments

- Name: CraftAI. Voice: precise, technical, confident — the audience is developers; copy may be terse, not hype. *(inferred; labeled assumption)*
- Existing visual identity: obsidian/zinc monochrome + deep electric indigo (#4F46E5) accent, Clash Display for display type, Space Grotesk headings, JetBrains Mono for code. Treat as the incumbent world to refine, not discard.

## Evidence on Hand

- Working frontend surfaces: LandingPage, FeaturesPage, AboutPage, Login/Signup, Dashboard hub, GenerateStudio, ConnectorsView, AiAssistant, DeployModal.
- 3D laptop hero assets in `frontend/src/assets/`; connector logo catalog.
- No customer testimonials, metrics, or case studies exist — do not fabricate any.

## Product Principles

1. The agents are the product — make the pipeline (Architect → Developer → Debugger) visible, legible, and satisfying to watch.
2. Developer-grade craft: if it wouldn't survive a senior engineer's aesthetic judgment, it doesn't ship.
3. One prompt to working app — remove every step between intent and result that isn't the agents working.
4. Dark-first workspace; every surface works in both themes.
5. Motion serves comprehension of agent state, never decoration.

## Accessibility & Inclusion

Keyboard-navigable workspace and visible focus states are baseline for a developer audience; reduced-motion respected (already global). No product-specific standard declared *(open decision)*.