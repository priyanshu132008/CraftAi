"""Agent 1 — The Architect.

Takes a raw user prompt and produces a structured JSON layout plan: site type,
niche, theme, color palette, sections, features and component requirements.

Uses the standard OpenAI-compatible client format so it can hit a cloud API
endpoint (e.g. Groq) or a local Ollama host, configured via environment vars.
"""
import json
import os
import re
from typing import Optional

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Safe default plan returned when the model output cannot be parsed. Keeps the
# downstream pipeline moving instead of crashing the whole request.
DEFAULT_PLAN = {
    "type": "landing-page",
    "niche": "general",
    "theme": "dark",
    "color_palette": {
        "primary": "#C9A227",
        "secondary": "#1F2937",
        "background": "#0B0F14",
        "accent": "#F5F5F5",
    },
    "sections": ["Navbar", "Hero", "Features", "Footer"],
    "features": ["Responsive layout", "Smooth scroll"],
    "component_requirements": {},
}

SYSTEM_PROMPT = """You are the Architect Agent of a multi-agent website generation system.
Your ONLY job is to analyze a raw user prompt and return a structured layout plan.

Analyze the user's intent carefully:
- What kind of site is this? (dashboard, landing-page, or portfolio)
- What brand niche / industry is it for?
- What theme fits best? (dark or light)
- What color palette suits the brand? (use valid hex codes)
- What sections and features does the site need?

Return ONLY valid JSON in this EXACT structure, with no markdown, no code fences,
and no explanation text:
{
  "type": "dashboard" | "landing-page" | "portfolio",
  "niche": string,
  "theme": "dark" | "light",
  "color_palette": { "primary": string, "secondary": string, "background": string, "accent": string },
  "sections": string[],
  "features": string[],
  "component_requirements": object
}

Rules:
- "type" MUST be one of: "dashboard", "landing-page", "portfolio".
- "theme" MUST be "dark" or "light".
- All color values MUST be valid hex codes (e.g. "#0B0F14").
- "sections" should list page sections in top-to-bottom order, e.g.
  ["Navbar", "Hero", "Features", "Pricing", "Footer"].
- "component_requirements" maps sections to the components they need, e.g.
  {"Hero": ["headline", "subheadline", "cta-button"], "Features": ["card-grid"]}.
- Output the JSON object and NOTHING else."""


class ArchitectAgent:
    """Generates structured JSON layout plans from raw user prompts."""

    def __init__(self, model: Optional[str] = None, base_url: Optional[str] = None,
                 api_key: Optional[str] = None):
        # Env-driven LLM config in standard OpenAI client format. Priority:
        # explicit args > explicit LLM_* env vars > Groq (if key present) >
        # local Ollama host.
        if base_url or api_key or os.getenv("LLM_BASE_URL"):
            self.base_url = base_url or os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
            self.api_key = api_key or os.getenv("LLM_API_KEY", "ollama")
            self.model = model or os.getenv("LLM_MODEL", "deepseek-v4-pro:cloud")
        elif os.getenv("GROQ_API_KEY"):
            # Cloud endpoint (OpenAI-compatible) configured in this repo's .env.
            self.base_url = "https://api.groq.com/openai/v1"
            self.api_key = os.getenv("GROQ_API_KEY")
            # llama-3.3-70b-versatile has been retired on Groq; gpt-oss-120b is
            # the strongest currently-available chat model on this key.
            self.model = model or os.getenv("MODEL_NAME", "openai/gpt-oss-120b")
        else:
            # Default: local Ollama host, same pattern as plan_generator.
            self.base_url = os.getenv("OLLAMA_CLOUD_BASE_URL", "http://localhost:11434/v1")
            self.api_key = os.getenv("OLLAMA_CLOUD_API_KEY", "ollama")
            self.model = model or "deepseek-v4-pro:cloud"

        self.client = OpenAI(base_url=self.base_url, api_key=self.api_key)

    def plan_architecture(self, user_prompt: str) -> dict:
        """Analyze a raw user prompt and return the structured layout plan.

        Falls back to DEFAULT_PLAN if the API call or JSON parsing fails, so
        the pipeline never hard-crashes on a malformed model response.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return self._parse_plan(content)
        except Exception as e:
            print(f"[ArchitectAgent] LLM call failed, using fallback plan: {e}")
            return dict(DEFAULT_PLAN)

    @staticmethod
    def _parse_plan(content: str) -> dict:
        """Parse the model output into a plan dict, tolerating fence wrappers
        and stray text around the JSON object. Raises ValueError if no JSON
        object can be extracted."""
        if not content or not content.strip():
            raise ValueError("empty model response")

        text = content.strip()
        # Strip markdown code fences if the model added them anyway.
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE).strip()

        try:
            plan = json.loads(text)
        except json.JSONDecodeError:
            # Fall back to slicing out the outermost JSON object.
            start, end = text.find("{"), text.rfind("}")
            if start == -1 or end <= start:
                raise ValueError(f"no JSON object found in model output: {text[:200]!r}")
            plan = json.loads(text[start:end + 1])

        if not isinstance(plan, dict):
            raise ValueError("model output is not a JSON object")

        # Normalize constrained fields so downstream stages can trust them.
        if plan.get("type") not in ("dashboard", "landing-page", "portfolio"):
            plan["type"] = DEFAULT_PLAN["type"]
        if plan.get("theme") not in ("dark", "light"):
            plan["theme"] = DEFAULT_PLAN["theme"]
        for field in ("niche", "color_palette", "sections", "features",
                      "component_requirements"):
            plan.setdefault(field, DEFAULT_PLAN[field])

        return plan