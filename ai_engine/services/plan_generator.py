import requests
import json
from ai_engine.config.settings import GROQ_API_KEY, MODEL_NAME, GROQ_URL
from ai_engine.services.validator import validate_plan


def load_system_prompt():
    with open("ai_engine/prompts/system_prompt.txt", "r") as f:
        return f.read()


SYSTEM_PROMPT = load_system_prompt()


def call_ai(user_prompt: str):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2
    }

    response = requests.post(GROQ_URL, headers=headers, json=payload)

    if response.status_code != 200:
        raise Exception(f"Groq API Error: {response.text}")

    data = response.json()

    return data["choices"][0]["message"]["content"]


def extract_json(text: str):
    try:
        return json.loads(text)
    except:
        # fallback extraction
        start = text.find("{")
        end = text.rfind("}") + 1
        return json.loads(text[start:end])


def generate_plan(prompt: str):
    raw_output = call_ai(prompt)

    parsed = extract_json(raw_output)

    validated = validate_plan(parsed)

    return validated