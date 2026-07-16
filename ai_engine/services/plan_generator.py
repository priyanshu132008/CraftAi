import os
import json
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url=os.getenv("OLLAMA_CLOUD_BASE_URL", "http://localhost:11434/v1"),
    api_key=os.getenv("OLLAMA_CLOUD_API_KEY", "ollama")
)

def generate_plan(user_prompt: str):
    try:
        with open("ai_engine/prompts/system_prompt.txt", "r") as f:
            system_instruction = f.read()
        
        response = client.chat.completions.create(
            model="deepseek-v4-pro:cloud",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
        
    except OpenAIError as api_err:
        return {"error": "API connection failure", "details": str(api_err)}
    except json.JSONDecodeError:
        return {"error": "Invalid JSON format returned from model", "raw_content": content}
    except Exception as e:
        return {"error": "An unexpected error occurred", "details": str(e)}
