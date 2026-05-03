from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
import os
import logging
from dotenv import load_dotenv
from claude_client import call_claude

logger = logging.getLogger(__name__)

load_dotenv()
app = FastAPI()

VALID_CHANNELS = {"email", "sms", "push", "social", "influenceur", "landing", "publicite", "autre"}

class AnalyseRequest(BaseModel):
    text: str
    channel: str

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("text cannot be empty")
        return v.strip()

    @field_validator("channel")
    @classmethod
    def channel_valid(cls, v):
        if v not in VALID_CHANNELS:
            raise ValueError(f"channel must be one of {VALID_CHANNELS}")
        return v

@app.post("/analyse")
async def analyse(req: AnalyseRequest):
    try:
        result = await call_claude(req.text, req.channel)
        return result
    except Exception as e:
        logger.exception("Erreur lors de l'analyse Claude")
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'analyse")

@app.get("/health")
def health():
    return {"status": "ok"}
