from ai_engine.models.plan_schema import ALLOWED_TYPES, ALLOWED_SECTIONS, ALLOWED_STYLES


def validate_plan(plan: dict):
    if not isinstance(plan, dict):
        raise ValueError("Invalid plan format")

    # TYPE
    if plan.get("type") not in ALLOWED_TYPES:
        plan["type"] = "portfolio"

    # SECTIONS
    sections = plan.get("sections", [])
    if not isinstance(sections, list):
        sections = []

    clean_sections = [s for s in sections if s in ALLOWED_SECTIONS]

    # Always ensure Hero exists
    if "Hero" not in clean_sections:
        clean_sections.insert(0, "Hero")

    plan["sections"] = clean_sections

    # STYLE
    if plan.get("style") not in ALLOWED_STYLES:
        plan["style"] = "modern"

    # DEFAULTS
    plan.setdefault("pages", ["home"])
    plan.setdefault("colorTheme", "dark")
    plan.setdefault("features", ["navbar", "footer"])

    return plan