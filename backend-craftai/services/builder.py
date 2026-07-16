import os
import uuid

def build_project(blueprint, content):
    project_id = str(uuid.uuid4())[:6]
    folder = f"generated-projects/project-{project_id}"

    os.makedirs(folder, exist_ok=True)

    files = {}

    for filename, template in blueprint.items():
        final_code = template.format(**content)

        path = os.path.join(folder, filename)

        with open(path, "w") as f:
            f.write(final_code)

        files[filename] = final_code

    return folder, files