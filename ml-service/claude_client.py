import os
import json
import anthropic
from prompts import build_system_prompt

def _get_client() -> anthropic.AsyncAnthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY est manquante — impossible de démarrer")
    return anthropic.AsyncAnthropic(api_key=api_key)

async def call_claude(text: str, channel: str) -> dict:
    client = _get_client()
    model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")
    system_prompt = build_system_prompt(channel)

    message = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system_prompt,
        messages=[
            {"role": "user", "content": f"Analyse cette communication :\n\n{text[:4000]}"}
        ]
    )

    raw = message.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Réponse Claude non-JSON : {raw[:200]}") from e
