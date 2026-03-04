import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from typing import List

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


def build_prompt(new_memory: dict, previous_memories: List[dict]) -> str:
    prev_section = ""
    if previous_memories:
        prev_lines = "\n".join(
            f'[ID {m["id"]}] Goal: {m["goal"]} | Content: {m["content"]}'
            for m in previous_memories
        )
        prev_section = f"\n\nPrevious memories:\n{prev_lines}"

    return f"""You are a learning assistant analyzing memories for the Feynman project.

New memory to analyze:
Goal: {new_memory["goal"]}
Content: {new_memory["content"]}
{prev_section}

Respond ONLY with a valid JSON object in exactly this format (no markdown, no extra text):
{{
  "why_useful": "A concise explanation of why this memory is valuable",
  "applications": ["application 1", "application 2", "application 3"],
  "connections": [list of integer IDs from previous memories that strongly relate],
  "reflection": "A rich synthesis combining why_useful and applications into one paragraph"
}}

Rules:
- connections must only contain IDs from the previous memories list
- connections should be an empty list [] if no previous memories exist or none are relevant
- reflection should be 2-4 sentences
- Respond with raw JSON only"""


def analyze_memory(new_memory: dict, previous_memories: List[dict]) -> dict:
    prompt = build_prompt(new_memory, previous_memories)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a precise JSON-only response assistant.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        timeout=float(os.getenv("OPENAI_TIMEOUT", 30)),
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    result = json.loads(raw)

    # Sanitise connections — ensure they are ints
    connections = [
        int(c)
        for c in result.get("connections", [])
        if str(c).lstrip("-").isdigit()
    ]

    return {
        "reflection": result.get("reflection", ""),
        "connections": connections,
    }
