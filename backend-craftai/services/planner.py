def generate_plan(prompt: str):
    prompt = prompt.lower()

    if "portfolio" in prompt:
        return {
            "type": "portfolio",
            "sections": ["Hero", "About", "Projects", "Contact"]
        }

    return {
        "type": "portfolio",
        "sections": ["Hero", "About", "Contact"]
    }