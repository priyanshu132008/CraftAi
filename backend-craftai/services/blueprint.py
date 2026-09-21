import json
from pathlib import Path
from pydantic import BaseModel
from typing import Dict, List, Optional

class BlueprintConfig(BaseModel):
    type: str
    name: str
    description: str
    required_sections: List[str]
    folder_path: Optional[str] = None

class BlueprintRegistry:
    def __init__(self, blueprints_dir: str = "blueprints"):
        self.blueprints_dir = Path(blueprints_dir)
        self.registry: Dict[str, BlueprintConfig] = {}
        self._load_all_blueprints()

    def _load_all_blueprints(self):
        """Scans the blueprints directory and loads all config.json files."""
        if not self.blueprints_dir.exists():
            print(f"Warning: Blueprints directory '{self.blueprints_dir}' not found.")
            return

        for folder in self.blueprints_dir.iterdir():
            if folder.is_dir():
                config_path = folder / "config.json"
                if config_path.exists():
                    try:
                        with open(config_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        
                        blueprint = BlueprintConfig(**data)
                        blueprint.folder_path = str(folder)
                        
                        self.registry[blueprint.type] = blueprint
                        print(f"Loaded blueprint: {blueprint.type}")
                        
                    except Exception as e:
                        print(f"Failed to load blueprint {folder.name}: {str(e)}")

    def get_blueprint_config(self, blueprint_type: str) -> BlueprintConfig:
        if blueprint_type not in self.registry:
            raise ValueError(f"Blueprint type '{blueprint_type}' not found.")
        return self.registry[blueprint_type]

    def get_template_file(self, blueprint_type: str, filename: str) -> str:
        """Reads and returns the raw template string from the physical file."""
        config = self.get_blueprint_config(blueprint_type)
        file_path = Path(config.folder_path) / filename
        
        if not file_path.exists():
            return "" # Return empty string if CSS/JS is missing rather than crashing
            
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

# This instance loads the folders automatically when FastAPI starts
registry = BlueprintRegistry()