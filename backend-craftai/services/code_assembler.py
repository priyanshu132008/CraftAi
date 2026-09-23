import os
from pathlib import Path

# Point to the component library you just created
COMPONENT_DIR = Path("ai_engine/component_library")

def get_available_components() -> list[str]:
    """Returns a list of all available component templates."""
    if not COMPONENT_DIR.exists():
        return []
    # Strip the .txt extension so the AI just sees ["HeroSection", "DarkNavbar"]
    return [f.stem for f in COMPONENT_DIR.glob("*.txt")]

def assemble_page(sections: list[str]) -> dict:
    """Stitches requested components into a Next.js page string."""
    component_files = {}
    imports = []
    rendered_components = []

    # 1. Fetch the raw code for each requested component
    for section in sections:
        file_path = COMPONENT_DIR / f"{section}.txt"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                component_files[f"{section}.tsx"] = f.read()
            
            # Prepare the import statement and JSX tag for the main page
            imports.append(f'import {section} from "./components/{section}";')
            rendered_components.append(f'      <{section} />')

    # 2. Wrap them in a Next.js layout template
    page_tsx = f"""
{''.join(imports)}

export default function GeneratedPage() {{
  return (
    <main className="min-h-screen bg-black text-white">
{chr(10).join(rendered_components)}
    </main>
  );
}}
"""
    
    # Return both the main page and the individual component files
    return {
        "page.tsx": page_tsx.strip(),
        "components": component_files
    }