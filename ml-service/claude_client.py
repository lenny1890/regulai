import os
import json
import anthropic
from prompts import build_system_prompt

# Grille de scoring déterministe — calibrée pour être stricte sans être alarmiste
# Philosophie : refléter le risque réel, pas maximiser la peur
_SEVERITY_POINTS = {"high": 18, "medium": 10, "low": 4}
_DOMAIN_MULTIPLIER = {
    "rgpd": 1.3,
    "cnil": 1.2,
    "code de la consommation": 1.1,
    "lcen": 1.0,
    "arpp": 1.0,
    "amf": 1.0,
    "réglementation ue": 1.3,
}
_MAX_DEDUCTION_PER_VIOLATION = 20

def compute_score(risks: list) -> tuple[int, dict]:
    """Calcule le score (0-100) de façon déterministe à partir des violations."""
    deductions = []
    for risk in risks:
        severity = (risk.get("severity") or "medium").lower()
        domain = (risk.get("domain") or "").lower()
        base_pts = _SEVERITY_POINTS.get(severity, 7)
        multiplier = _DOMAIN_MULTIPLIER.get(domain, 1.0)
        points = -min(round(base_pts * multiplier), _MAX_DEDUCTION_PER_VIOLATION)
        deductions.append({
            "domain": risk.get("domain", ""),
            "severity": severity,
            "points": points,
            "title": risk.get("title", ""),
        })

    total_deducted = sum(d["points"] for d in deductions)
    score = max(0, 100 + total_deducted)
    breakdown = {"base": 100, "deductions": deductions, "total_deducted": total_deducted}
    return score, breakdown

def _get_client() -> anthropic.AsyncAnthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY est manquante — impossible de démarrer")
    return anthropic.AsyncAnthropic(api_key=api_key)

async def call_claude(text: str, channel: str) -> dict:
    client = _get_client()
    model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")
    system_prompt = build_system_prompt(channel)

    message = await client.messages.create(
        model=model,
        max_tokens=4096,
        system=system_prompt,
        messages=[
            {"role": "user", "content": f"Analyse cette communication :\n\n{text[:4000]}"}
        ]
    )

    raw = message.content[0].text.strip()
    # Strip markdown code block if present (```json ... ``` or ``` ... ```)
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[: raw.rfind("```")]
        raw = raw.strip()
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Réponse Claude non-JSON : {raw[:200]}") from e

    # Écrase le score Claude par notre grille déterministe
    score, breakdown = compute_score(result.get("risks") or [])
    result["score"] = score
    result["score_breakdown"] = breakdown
    result["compliant"] = score >= 80
    return result
