import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from main import app

MOCK_CLAUDE_RESPONSE = {
    "score": 72,
    "ml_probability": 0.61,
    "compliant": False,
    "risks": [
        {
            "domain": "RGPD",
            "severity": "high",
            "description": "Lien de désinscription absent — obligatoire pour tout email commercial",
            "article": "Art. 21 RGPD"
        }
    ],
    "corrected_text": "Version corrigée ici..."
}

@pytest.mark.asyncio
async def test_analyse_returns_result():
    with patch('main.call_claude', new_callable=AsyncMock, return_value=MOCK_CLAUDE_RESPONSE):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post('/analyse', json={
                'text': 'Profitez de notre offre exceptionnelle !',
                'channel': 'email'
            })
    assert res.status_code == 200
    data = res.json()
    assert 'score' in data
    assert 'risks' in data
    assert 0 <= data['score'] <= 100

@pytest.mark.asyncio
async def test_analyse_rejects_empty_text():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post('/analyse', json={'text': '', 'channel': 'email'})
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_analyse_handles_claude_error():
    with patch('main.call_claude', new_callable=AsyncMock, side_effect=ValueError("Réponse Claude non-JSON")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post('/analyse', json={'text': 'test', 'channel': 'email'})
    assert res.status_code == 500
