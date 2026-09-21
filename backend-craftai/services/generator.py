class SafeDict(dict):
    """
    Prevents template rendering crashes. If a placeholder exists in the HTML 
    but the AI didn't provide content for it, this returns an empty string.
    """
    def __missing__(self, key):
        return ""

def generate_content(plan: dict) -> dict:
    """
    Maps the JSON plan into a flat dictionary for template injection.
    """
    blueprint_type = plan.get("type", "portfolio")
    sections = plan.get("sections", [])

    # 1. The Mocked AI Response
    # In Phase 2, this dictionary will be replaced by Priyanshu's AI output.
    # Notice how this resembles a NoSQL document structure.
    ai_generated_data = {
        "name": "Amrit Uikey",
        "about": "Software engineering student focused on scalable backend architectures and document databases.",
        "email": "hello@developer.com",
        "projects": """
            <div class="project">
                <h3>CRAFTAI</h3>
                <p>An AI-powered structured development environment.</p>
            </div>
        """
    }

    # 2. Dynamic Section Mapping
    # Only map content if the user actually requested that section in their plan
    mapped_content = {}
    
    # Always required fields
    mapped_content["name"] = ai_generated_data.get("name")
    
    # Optional sections based on the plan
    if "About" in sections:
        mapped_content["about"] = ai_generated_data.get("about")
        
    if "Projects" in sections:
        mapped_content["projects"] = ai_generated_data.get("projects")
        
    if "Contact" in sections:
        mapped_content["email"] = ai_generated_data.get("email")

    # 3. Return as a SafeDict to prevent formatting crashes
    return SafeDict(mapped_content)