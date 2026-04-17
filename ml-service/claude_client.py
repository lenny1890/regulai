import os
import json
import anthropic
from prompts import build_system_prompt

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

async def call_claude(text: str, channel: str) -> dict:
    model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")
    system_prompt = build_system_prompt(channel)

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        system=system_prompt,
        messages=[
            {"role": "user", "content": f"Analyse cette communication :\n\n{text[:4000]}"}
        ]
    )

    raw = message.content[0].text.strip()
    return json.loads(raw)
