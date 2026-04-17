# RegulAI V1 — Core App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire l'application RegulAI V1 complète — analyse de communications commerciales via Claude API, auth JWT, quota freemium, Stripe, et interface utilisateur équilibrée (ni trop technique, ni trop vulgarisée).

**Architecture:** Monorepo avec 3 services découplés : frontend React+Vite (Vercel), backend Node+Express (auth/quota/billing), ML service FastAPI Python (pass-through Claude V1, ML réel en V2). PostgreSQL sur Railway pour la persistance.

**Tech Stack:** React 18 + Vite + Tailwind CSS · Node.js 22 + Express · Python 3.11 + FastAPI + httpx · PostgreSQL 15 · JWT (jsonwebtoken) · Stripe · Claude API (Anthropic SDK) · Vitest · pytest · Railway · Vercel

---

## Structure des fichiers

```
regulai/
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js                    ← toutes les requêtes HTTP centralisées
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Analyse.jsx           ← page principale
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   │       ├── ScoreGauge.jsx        ← jauge 0-100 colorée
│   │       ├── RiskList.jsx          ← liste zones de risque
│   │       ├── SplitView.jsx         ← original vs corrigé côte-à-côte
│   │       └── ChannelSelector.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── server.js                 ← point d'entrée Express
│   │   ├── db.js                     ← pool PostgreSQL
│   │   ├── routes/
│   │   │   ├── auth.js               ← register/login/refresh
│   │   │   ├── analyse.js            ← POST /api/analyse + GET /api/analyses
│   │   │   ├── dashboard.js          ← GET /api/dashboard
│   │   │   └── billing.js            ← Stripe checkout + webhook
│   │   ├── middleware/
│   │   │   ├── auth.js               ← vérification JWT
│   │   │   └── quota.js              ← vérification + incrément quota
│   │   └── services/
│   │       └── mlService.js          ← appel vers FastAPI
│   ├── tests/
│   │   ├── auth.test.js
│   │   ├── analyse.test.js
│   │   └── quota.test.js
│   └── package.json
├── ml-service/
│   ├── main.py                       ← FastAPI app
│   ├── claude_client.py              ← appel Anthropic SDK
│   ├── prompts.py                    ← system prompt juridique
│   ├── tests/
│   │   └── test_analyse.py
│   └── requirements.txt
└── package.json                      ← scripts monorepo
```

---

## Task 1 : Setup monorepo + environnement

**Files:**
- Create: `regulai/package.json`
- Create: `regulai/.env.example`
- Create: `regulai/.gitignore`
- Create: `regulai/backend/package.json`
- Create: `regulai/frontend/package.json`
- Create: `regulai/ml-service/requirements.txt`

- [ ] **Step 1.1 : Créer la structure de dossiers**

```bash
mkdir -p regulai/{frontend,backend/src/{routes,middleware,services},ml-service/tests,backend/tests}
cd regulai
```

- [ ] **Step 1.2 : package.json racine (scripts monorepo)**

```json
{
  "name": "regulai",
  "private": true,
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:ml": "cd ml-service && uvicorn main:app --reload --port 8001",
    "test:backend": "cd backend && npm test",
    "test:ml": "cd ml-service && pytest -v"
  }
}
```

- [ ] **Step 1.3 : Initialiser le backend Node**

```bash
cd backend
npm init -y
npm install express pg bcryptjs jsonwebtoken cookie-parser cors dotenv stripe @anthropic-ai/sdk
npm install -D jest supertest
```

`backend/package.json` — ajouter :
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "jest --runInBand"
  },
  "jest": {
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 1.4 : Initialiser le frontend React+Vite**

```bash
cd ../frontend
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom
```

`frontend/tailwind.config.js` :
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0a1520',
          dark: '#0d1f2d',
          border: '#1e3a4a',
          green: '#99e1c3',
          cyan: '#23B8D2',
          amber: '#f59e0b',
        }
      }
    }
  },
  plugins: []
}
```

- [ ] **Step 1.5 : Initialiser le ML service Python**

```bash
cd ../ml-service
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn httpx anthropic python-dotenv pytest pytest-asyncio httpx
pip freeze > requirements.txt
```

- [ ] **Step 1.6 : Créer .env.example**

```bash
# backend/.env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/regulai
JWT_SECRET=change_me_32_chars_minimum
JWT_REFRESH_SECRET=change_me_another_32_chars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ML_SERVICE_URL=http://localhost:8001

# ml-service/.env
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-5
```

- [ ] **Step 1.7 : .gitignore**

```
node_modules/
.env
*.env.local
venv/
__pycache__/
*.pyc
dist/
.vercel/
```

- [ ] **Step 1.8 : Commit initial**

```bash
git init
git add .
git commit -m "chore: initial monorepo setup"
```

---

## Task 2 : Base de données PostgreSQL

**Files:**
- Create: `backend/src/db.js`
- Create: `backend/src/migrations/001_init.sql`

- [ ] **Step 2.1 : Démarrer PostgreSQL local (Docker)**

```bash
docker run --name regulai-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=regulai -p 5432:5432 -d postgres:15
```

Vérifier : `psql postgresql://postgres:postgres@localhost:5432/regulai -c "\dt"`

- [ ] **Step 2.2 : Script de migration**

`backend/src/migrations/001_init.sql` :
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  analyses_count_month INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  input_text TEXT NOT NULL,
  score INTEGER NOT NULL,
  ml_probability REAL NOT NULL,
  risks_json JSONB NOT NULL DEFAULT '[]',
  corrected_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

- [ ] **Step 2.3 : Exécuter la migration**

```bash
psql postgresql://postgres:postgres@localhost:5432/regulai -f backend/src/migrations/001_init.sql
```

Attendu : `CREATE TABLE` × 4 + `CREATE INDEX` × 3

- [ ] **Step 2.4 : Pool PostgreSQL**

`backend/src/db.js` :
```js
import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
})

export async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}
```

- [ ] **Step 2.5 : Ajouter `"type": "module"` au package.json backend**

`backend/package.json` — ajouter `"type": "module"` à la racine du JSON.

- [ ] **Step 2.6 : Commit**

```bash
git add backend/src/db.js backend/src/migrations/ backend/package.json
git commit -m "feat: database schema and connection pool"
```

---

## Task 3 : Auth backend (register / login / refresh)

**Files:**
- Create: `backend/src/routes/auth.js`
- Create: `backend/src/middleware/auth.js`
- Create: `backend/tests/auth.test.js`

- [ ] **Step 3.1 : Écrire les tests d'abord (TDD)**

`backend/tests/auth.test.js` :
```js
import request from 'supertest'
import { app } from '../src/server.js'
import { pool } from '../src/db.js'

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE 'test_%@regulai.test'")
  await pool.end()
})

describe('POST /api/auth/register', () => {
  it('crée un compte et retourne un token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test_1@regulai.test', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('rejette un email déjà utilisé', async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'test_dup@regulai.test', password: 'password123' })
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'test_dup@regulai.test', password: 'password123' })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'test_login@regulai.test', password: 'password123' })
  })

  it('retourne un accessToken pour des credentials valides', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test_login@regulai.test', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('retourne 401 pour un mauvais mot de passe', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test_login@regulai.test', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 3.2 : Lancer les tests pour confirmer l'échec**

```bash
cd backend && npm test -- tests/auth.test.js
```

Attendu : FAIL — "Cannot find module '../src/server.js'"

- [ ] **Step 3.3 : Créer le serveur Express minimal**

`backend/src/server.js` :
```js
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { analyseRouter } from './routes/analyse.js'
import { dashboardRouter } from './routes/dashboard.js'
import { billingRouter } from './routes/billing.js'

export const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api', analyseRouter)
app.use('/api', dashboardRouter)
app.use('/api', billingRouter)

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
}
```

- [ ] **Step 3.4 : Route auth**

`backend/src/routes/auth.js` :
```js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { query } from '../db.js'

export const authRouter = Router()

const ACCESS_EXPIRY = '1h'
const REFRESH_EXPIRY = '30d'
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

function signAccess(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY })
}

async function createRefreshToken(userId, res) {
  const token = crypto.randomBytes(40).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS)
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  )
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_EXPIRY_MS,
  })
  return token
}

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email et mot de passe requis (8 chars min)' })
  }
  try {
    const hash = await bcrypt.hash(password, 12)
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email.toLowerCase().trim(), hash]
    )
    const userId = result.rows[0].id
    const accessToken = signAccess(userId)
    await createRefreshToken(userId, res)
    res.status(201).json({ accessToken })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  const result = await query('SELECT id, password_hash FROM users WHERE email = $1', [email?.toLowerCase().trim()])
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Identifiants incorrects' })
  }
  const accessToken = signAccess(user.id)
  await createRefreshToken(user.id, res)
  res.json({ accessToken })
})

authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken
  if (!token) return res.status(401).json({ error: 'Refresh token manquant' })
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const result = await query(
    'SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()',
    [hash]
  )
  if (!result.rows[0]) return res.status(401).json({ error: 'Token invalide ou expiré' })
  const accessToken = signAccess(result.rows[0].user_id)
  res.json({ accessToken })
})
```

- [ ] **Step 3.5 : Middleware JWT**

`backend/src/middleware/auth.js` :
```js
import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
```

- [ ] **Step 3.6 : Créer les routes stub (pour que le serveur compile)**

`backend/src/routes/analyse.js` :
```js
import { Router } from 'express'
export const analyseRouter = Router()
```

`backend/src/routes/dashboard.js` :
```js
import { Router } from 'express'
export const dashboardRouter = Router()
```

`backend/src/routes/billing.js` :
```js
import { Router } from 'express'
export const billingRouter = Router()
```

- [ ] **Step 3.7 : Lancer les tests**

```bash
cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/regulai JWT_SECRET=test_secret_32_chars_minimum JWT_REFRESH_SECRET=test_refresh_secret npm test -- tests/auth.test.js
```

Attendu : PASS (3 tests)

- [ ] **Step 3.8 : Commit**

```bash
git add backend/src/
git commit -m "feat: auth register/login/refresh with JWT + refresh tokens"
```

---

## Task 4 : ML Service FastAPI (pass-through Claude V1)

**Files:**
- Create: `ml-service/prompts.py`
- Create: `ml-service/claude_client.py`
- Create: `ml-service/main.py`
- Create: `ml-service/tests/test_analyse.py`

- [ ] **Step 4.1 : Écrire les tests**

`ml-service/tests/test_analyse.py` :
```python
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
```

- [ ] **Step 4.2 : Lancer les tests pour confirmer l'échec**

```bash
cd ml-service && source venv/bin/activate && pytest tests/ -v
```

Attendu : FAIL — "cannot import from main"

- [ ] **Step 4.3 : System prompt**

`ml-service/prompts.py` :
```python
CHANNEL_CONTEXT = {
    "email": "un email commercial",
    "sms": "un SMS marketing",
    "push": "une notification push in-app",
    "social": "un post sur les réseaux sociaux",
    "influenceur": "un brief influenceur"
}

def build_system_prompt(channel: str) -> str:
    canal = CHANNEL_CONTEXT.get(channel, "une communication commerciale")
    return f"""Tu es un expert en conformité réglementaire des communications commerciales françaises.

Tu analyses {canal} et tu retournes une évaluation structurée en JSON strict.

Réglementations applicables en V1 :
- RGPD / CNIL : consentement, droit d'opposition, mentions obligatoires (Art. 13, 21)
- Code de la consommation L121-1 : publicité trompeuse, allégations vérifiables, prix

Règles de ton :
- Les descriptions de risque sont en langage professionnel, ni jargon juridique pur ni sur-simplification
- Exemple bon équilibre : "Lien de désinscription absent — obligatoire pour tout email commercial (Art. 21 RGPD)"
- Les articles de loi sont cités en référence, pas en premier plan

Retourne UNIQUEMENT ce JSON (pas de texte autour) :
{{
  "score": <entier 0-100, 100 = parfaitement conforme>,
  "ml_probability": <float 0-1, probabilité de non-conformité>,
  "compliant": <boolean>,
  "risks": [
    {{
      "domain": "<RGPD|Code_conso>",
      "severity": "<high|medium|low>",
      "description": "<phrase courte, équilibre pro/accessible>",
      "article": "<référence légale>"
    }}
  ],
  "corrected_text": "<réécriture complète conforme, ou null si déjà conforme>"
}}"""
```

- [ ] **Step 4.4 : Client Claude**

`ml-service/claude_client.py` :
```python
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
```

- [ ] **Step 4.5 : FastAPI app**

`ml-service/main.py` :
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
import os
from dotenv import load_dotenv
from claude_client import call_claude

load_dotenv()
app = FastAPI()

VALID_CHANNELS = {"email", "sms", "push", "social", "influenceur"}

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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 4.6 : Lancer les tests**

```bash
cd ml-service && source venv/bin/activate && pytest tests/ -v
```

Attendu : PASS (2 tests)

- [ ] **Step 4.7 : Commit**

```bash
git add ml-service/
git commit -m "feat: ML service FastAPI pass-through Claude (V1)"
```

---

## Task 5 : Route d'analyse backend + middleware quota

**Files:**
- Create: `backend/src/middleware/quota.js`
- Create: `backend/src/services/mlService.js`
- Modify: `backend/src/routes/analyse.js`
- Create: `backend/tests/analyse.test.js`

- [ ] **Step 5.1 : Écrire les tests**

`backend/tests/analyse.test.js` :
```js
import request from 'supertest'
import { app } from '../src/server.js'
import { pool, query } from '../src/db.js'

let accessToken, userId

beforeAll(async () => {
  await query("DELETE FROM users WHERE email = 'test_analyse@regulai.test'")
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'test_analyse@regulai.test', password: 'password123' })
  accessToken = res.body.accessToken
  const u = await query("SELECT id FROM users WHERE email = 'test_analyse@regulai.test'")
  userId = u.rows[0].id
})

afterAll(async () => {
  await query("DELETE FROM users WHERE email = 'test_analyse@regulai.test'")
  await pool.end()
})

describe('POST /api/analyse', () => {
  it('retourne 401 sans token', async () => {
    const res = await request(app).post('/api/analyse')
      .send({ text: 'test', channel: 'email' })
    expect(res.status).toBe(401)
  })

  it('retourne 400 si texte vide', async () => {
    const res = await request(app).post('/api/analyse')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: '', channel: 'email' })
    expect(res.status).toBe(400)
  })

  it('retourne 402 si quota dépassé', async () => {
    await query("UPDATE users SET analyses_count_month = 3 WHERE id = $1", [userId])
    const res = await request(app).post('/api/analyse')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: 'Promotion exceptionnelle !', channel: 'email' })
    expect(res.status).toBe(402)
    await query("UPDATE users SET analyses_count_month = 0 WHERE id = $1", [userId])
  })
})
```

- [ ] **Step 5.2 : Lancer pour confirmer l'échec**

```bash
cd backend && npm test -- tests/analyse.test.js
```

Attendu : FAIL — route non définie → 404

- [ ] **Step 5.3 : Service ML**

`backend/src/services/mlService.js` :
```js
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001'

export async function callMlService(text, channel) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`${ML_SERVICE_URL}/analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, channel }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`ML service error: ${res.status}`)
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('ML_TIMEOUT')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
```

- [ ] **Step 5.4 : Middleware quota**

`backend/src/middleware/quota.js` :
```js
import { query } from '../db.js'

const PLAN_LIMITS = { free: 3, starter: 30, pro: Infinity }

export async function checkAndIncrementQuota(req, res, next) {
  const result = await query(
    'SELECT plan, analyses_count_month FROM users WHERE id = $1',
    [req.userId]
  )
  const user = result.rows[0]
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const limit = PLAN_LIMITS[user.plan] ?? 3
  if (user.analyses_count_month >= limit) {
    return res.status(402).json({
      error: 'Quota mensuel atteint',
      plan: user.plan,
      limit,
    })
  }
  req.userPlan = user.plan
  next()
}
```

- [ ] **Step 5.5 : Route analyse**

`backend/src/routes/analyse.js` :
```js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { checkAndIncrementQuota } from '../middleware/quota.js'
import { callMlService } from '../services/mlService.js'
import { query } from '../db.js'

export const analyseRouter = Router()

analyseRouter.post('/analyse', requireAuth, checkAndIncrementQuota, async (req, res) => {
  const { text, channel } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Texte vide' })
  if (!['email', 'sms', 'push', 'social', 'influenceur'].includes(channel)) {
    return res.status(400).json({ error: 'Canal invalide' })
  }

  try {
    const result = await callMlService(text.trim(), channel)

    // Transaction atomique : incrément quota + stockage analyse
    await query('BEGIN')
    await query(
      'UPDATE users SET analyses_count_month = analyses_count_month + 1 WHERE id = $1',
      [req.userId]
    )
    await query(
      `INSERT INTO analyses (user_id, channel, input_text, score, ml_probability, risks_json, corrected_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.userId, channel, text.trim(), result.score, result.ml_probability,
       JSON.stringify(result.risks), result.corrected_text ?? null]
    )
    await query('COMMIT')

    res.json(result)
  } catch (err) {
    await query('ROLLBACK').catch(() => {})
    if (err.message === 'ML_TIMEOUT') {
      return res.status(503).json({ error: 'Service d\'analyse temporairement indisponible' })
    }
    res.status(500).json({ error: 'Erreur lors de l\'analyse' })
  }
})

analyseRouter.get('/analyses', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT id, channel, score, ml_probability, risks_json, created_at
     FROM analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.userId]
  )
  res.json(result.rows)
})

analyseRouter.get('/analyses/:id', requireAuth, async (req, res) => {
  const result = await query(
    'SELECT * FROM analyses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  )
  if (!result.rows[0]) return res.status(404).json({ error: 'Analyse introuvable' })
  res.json(result.rows[0])
})
```

- [ ] **Step 5.6 : Lancer les tests**

```bash
cd backend && npm test -- tests/analyse.test.js
```

Attendu : PASS (3 tests — le test quota ne déclenche pas le ML service réel)

- [ ] **Step 5.7 : Commit**

```bash
git add backend/src/
git commit -m "feat: analyse route with quota middleware and ML service call"
```

---

## Task 6 : Dashboard endpoint

**Files:**
- Modify: `backend/src/routes/dashboard.js`

- [ ] **Step 6.1 : Route dashboard**

`backend/src/routes/dashboard.js` :
```js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db.js'

export const dashboardRouter = Router()

dashboardRouter.get('/dashboard', requireAuth, async (req, res) => {
  const [kpis, history] = await Promise.all([
    query(
      `SELECT
        COUNT(*)::int AS total_analyses,
        ROUND(AVG(score))::int AS avg_score,
        COUNT(*) FILTER (WHERE score >= 80)::int AS compliant_count,
        COUNT(*) FILTER (WHERE score < 60)::int AS risk_count
       FROM analyses
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [req.userId]
    ),
    query(
      `SELECT id, channel, score, risks_json, created_at
       FROM analyses WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.userId]
    ),
  ])

  const { total_analyses, avg_score, compliant_count, risk_count } = kpis.rows[0]

  // Économies estimées : coût moyen sanction CNIL ~50 000€, probabilité simplifiée
  const savings_estimate = risk_count > 0
    ? Math.round(risk_count * 50000 * 0.05)
    : 0

  res.json({
    kpis: { total_analyses, avg_score: avg_score ?? 0, compliant_count, risk_count, savings_estimate },
    history: history.rows,
  })
})
```

- [ ] **Step 6.2 : Tester manuellement**

Démarrer le backend :
```bash
cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/regulai JWT_SECRET=test_secret_32_chars_minimum node src/server.js
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/dashboard
```

Attendu : `{"kpis":{"total_analyses":0,"avg_score":0,...},"history":[]}`

- [ ] **Step 6.3 : Commit**

```bash
git add backend/src/routes/dashboard.js
git commit -m "feat: dashboard endpoint with KPIs and savings estimate"
```

---

## Task 7 : Frontend — base + auth

**Files:**
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/api.js`
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Register.jsx`

- [ ] **Step 7.1 : api.js — client HTTP centralisé**

`frontend/src/api.js` :
```js
const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

let accessToken = localStorage.getItem('accessToken') || null

export function setToken(t) {
  accessToken = t
  if (t) localStorage.setItem('accessToken', t)
  else localStorage.removeItem('accessToken')
}

async function authFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    // Tenter un refresh
    const refresh = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST', credentials: 'include',
    })
    if (refresh.ok) {
      const { accessToken: newToken } = await refresh.json()
      setToken(newToken)
      return authFetch(path, options) // retry
    } else {
      setToken(null)
      window.location.href = '/login'
    }
  }
  return res
}

export const api = {
  register: (email, password) =>
    fetch(`${BASE}/api/auth/register`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    fetch(`${BASE}/api/auth/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  analyse: (text, channel) =>
    authFetch('/api/analyse', {
      method: 'POST',
      body: JSON.stringify({ text, channel }),
    }),

  getAnalyses: () => authFetch('/api/analyses'),

  getDashboard: () => authFetch('/api/dashboard'),
}
```

- [ ] **Step 7.2 : App.jsx avec routing**

`frontend/src/App.jsx` :
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Analyse from './pages/Analyse'
import Dashboard from './pages/Dashboard'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Analyse /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 7.3 : Page Login**

`frontend/src/pages/Login.jsx` :
```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, setToken } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await api.login(email, password)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error || 'Erreur de connexion')
    setToken(data.accessToken)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center">
      <div className="w-full max-w-sm bg-brand-dark border border-brand-border rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">RegulAI</h1>
        <p className="text-sm text-slate-400 mb-6">Conformité des communications commerciales</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-cyan text-brand-navy font-semibold rounded-lg py-2.5 hover:opacity-90 disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400 text-center">
          Pas encore de compte ? <Link to="/register" className="text-brand-cyan">Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7.4 : Page Register (même structure que Login)**

`frontend/src/pages/Register.jsx` :
```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, setToken } from '../api'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) return setError('Mot de passe : 8 caractères minimum')
    setLoading(true)
    setError('')
    const res = await api.register(email, password)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error || 'Erreur lors de l\'inscription')
    setToken(data.accessToken)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center">
      <div className="w-full max-w-sm bg-brand-dark border border-brand-border rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Créer un compte</h1>
        <p className="text-sm text-slate-400 mb-6">3 analyses gratuites par mois</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe (8 chars min)" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-cyan text-brand-navy font-semibold rounded-lg py-2.5 hover:opacity-90 disabled:opacity-50">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400 text-center">
          Déjà un compte ? <Link to="/login" className="text-brand-cyan">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7.5 : Tester visuellement**

```bash
cd frontend && npm run dev
```

Ouvrir http://localhost:5173/register → créer un compte → vérifier la redirection vers "/"

- [ ] **Step 7.6 : Commit**

```bash
git add frontend/src/
git commit -m "feat: frontend auth pages (login/register) with JWT handling"
```

---

## Task 8 : Composants résultat (UX équilibrée)

**Files:**
- Create: `frontend/src/components/ScoreGauge.jsx`
- Create: `frontend/src/components/RiskList.jsx`
- Create: `frontend/src/components/SplitView.jsx`
- Create: `frontend/src/components/ChannelSelector.jsx`

- [ ] **Step 8.1 : ScoreGauge**

`frontend/src/components/ScoreGauge.jsx` :
```jsx
export default function ScoreGauge({ score }) {
  const color = score >= 80 ? '#99e1c3' : score >= 60 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'Conforme' : score >= 60 ? 'Risques modérés' : 'Risques élevés'

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e3a4a" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
          {score}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        <p className="text-xs text-slate-400">Score de conformité</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2 : RiskList**

`frontend/src/components/RiskList.jsx` :
```jsx
const SEVERITY_STYLES = {
  high:   { dot: 'bg-red-400',    label: 'text-red-400',    bg: 'bg-red-400/5 border-red-400/20' },
  medium: { dot: 'bg-amber-400',  label: 'text-amber-400',  bg: 'bg-amber-400/5 border-amber-400/20' },
  low:    { dot: 'bg-green-400',  label: 'text-green-400',  bg: 'bg-green-400/5 border-green-400/20' },
}

export default function RiskList({ risks }) {
  if (!risks?.length) {
    return (
      <div className="flex items-center gap-2 text-brand-green text-sm">
        <span className="w-2 h-2 rounded-full bg-brand-green inline-block" />
        Aucun problème détecté
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {risks.map((risk, i) => {
        const s = SEVERITY_STYLES[risk.severity] || SEVERITY_STYLES.low
        return (
          <li key={i} className={`border rounded-lg px-4 py-3 ${s.bg}`}>
            <div className="flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
              <div>
                <p className="text-sm text-white">{risk.description}</p>
                <p className={`text-xs mt-0.5 ${s.label}`}>{risk.domain} · {risk.article}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 8.3 : SplitView**

`frontend/src/components/SplitView.jsx` :
```jsx
import { useState } from 'react'

export default function SplitView({ original, corrected }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(corrected)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original</p>
        <div className="bg-brand-navy border border-brand-border rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap min-h-24">
          {original}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-brand-green uppercase tracking-wider">Version corrigée</p>
          <button onClick={handleCopy}
            className="text-xs text-brand-cyan hover:text-white transition-colors">
            {copied ? '✓ Copié' : 'Copier'}
          </button>
        </div>
        <div className="bg-brand-navy border border-brand-green/30 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap min-h-24">
          {corrected}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.4 : ChannelSelector**

`frontend/src/components/ChannelSelector.jsx` :
```jsx
const CHANNELS = [
  { id: 'email',      label: 'Email',       icon: '✉️' },
  { id: 'sms',        label: 'SMS',          icon: '💬' },
  { id: 'push',       label: 'Push',         icon: '🔔' },
  { id: 'social',     label: 'Social',       icon: '📱' },
  { id: 'influenceur',label: 'Influenceur',  icon: '🎤' },
]

export default function ChannelSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHANNELS.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            value === c.id
              ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan'
              : 'bg-brand-dark border-brand-border text-slate-400 hover:border-slate-500'
          }`}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 8.5 : Commit**

```bash
git add frontend/src/components/
git commit -m "feat: result components (ScoreGauge, RiskList, SplitView, ChannelSelector)"
```

---

## Task 9 : Page Analyse (UI principale)

**Files:**
- Modify: `frontend/src/pages/Analyse.jsx`

- [ ] **Step 9.1 : Page Analyse complète**

`frontend/src/pages/Analyse.jsx` :
```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import ScoreGauge from '../components/ScoreGauge'
import RiskList from '../components/RiskList'
import SplitView from '../components/SplitView'
import ChannelSelector from '../components/ChannelSelector'

export default function Analyse() {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState('email')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return setError('Entrez un texte à analyser')
    setLoading(true)
    setError('')
    setResult(null)
    const res = await api.analyse(text, channel)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      if (res.status === 402) return setError('Quota mensuel atteint — passez au plan Starter pour continuer')
      return setError(data.error || 'Erreur lors de l\'analyse')
    }
    setResult(data)
  }

  return (
    <div className="min-h-screen bg-brand-navy">
      {/* Header */}
      <header className="bg-brand-dark border-b border-brand-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">RegulAI</h1>
        <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
          Dashboard →
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Canal de communication
            </label>
            <ChannelSelector value={channel} onChange={setChannel} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Texte à analyser
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Collez ici votre email, SMS, post réseaux sociaux, brief influenceur..."
              rows={6}
              maxLength={4000}
              className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan resize-none"
            />
            <p className="text-xs text-slate-500 mt-1 text-right">{text.length}/4000</p>
          </div>

          {error && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !text.trim()}
            className="bg-brand-cyan text-brand-navy font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Analyse en cours...' : 'Analyser la conformité'}
          </button>
        </form>

        {/* Résultats */}
        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-brand-dark border border-brand-border rounded-xl p-6">
              <ScoreGauge score={result.score} />
            </div>

            {result.risks?.length > 0 && (
              <div className="bg-brand-dark border border-brand-border rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Zones de risque
                </h2>
                <RiskList risks={result.risks} />
              </div>
            )}

            {result.corrected_text && (
              <div className="bg-brand-dark border border-brand-border rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Version corrigée
                </h2>
                <SplitView original={text} corrected={result.corrected_text} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 9.2 : Tester end-to-end en local**

1. Démarrer PostgreSQL (docker)
2. `cd ml-service && uvicorn main:app --port 8001`
3. `cd backend && node src/server.js`
4. `cd frontend && npm run dev`

Aller sur http://localhost:5173 → créer un compte → soumettre un texte → vérifier l'affichage du score, des risques, et de la version corrigée.

- [ ] **Step 9.3 : Commit**

```bash
git add frontend/src/pages/Analyse.jsx
git commit -m "feat: analyse page with full result display"
```

---

## Task 10 : Page Dashboard

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 10.1 : Page Dashboard**

`frontend/src/pages/Dashboard.jsx` :
```jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const CHANNEL_LABELS = {
  email: 'Email', sms: 'SMS', push: 'Push', social: 'Social', influenceur: 'Influenceur'
}

function ScoreBadge({ score }) {
  const cls = score >= 80 ? 'text-brand-green' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-semibold ${cls}`}>{score}</span>
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboard().then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center text-slate-400">
      Chargement...
    </div>
  )

  const { kpis, history } = data

  return (
    <div className="min-h-screen bg-brand-navy">
      <header className="bg-brand-dark border-b border-brand-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Dashboard</h1>
        <Link to="/" className="text-sm text-slate-400 hover:text-white">← Nouvelle analyse</Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Analyses (30j)', value: kpis.total_analyses },
            { label: 'Score moyen', value: kpis.avg_score ? `${kpis.avg_score}/100` : '—' },
            { label: 'Conformes', value: kpis.compliant_count },
            { label: 'Économies estimées', value: kpis.savings_estimate > 0 ? `${kpis.savings_estimate.toLocaleString('fr-FR')}€` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-brand-dark border border-brand-border rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Historique */}
        <div className="bg-brand-dark border border-brand-border rounded-xl">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-sm font-semibold text-white">Historique des analyses</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-slate-400 text-sm px-6 py-8 text-center">
              Aucune analyse encore — <Link to="/" className="text-brand-cyan">lancer la première</Link>
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Canal</th>
                  <th className="px-6 py-3 text-left">Score</th>
                  <th className="px-6 py-3 text-left">Risques</th>
                </tr>
              </thead>
              <tbody>
                {history.map(a => (
                  <tr key={a.id} className="border-t border-brand-border hover:bg-brand-navy/50">
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(a.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-3 text-slate-300">{CHANNEL_LABELS[a.channel] || a.channel}</td>
                    <td className="px-6 py-3"><ScoreBadge score={a.score} /></td>
                    <td className="px-6 py-3 text-slate-400">{a.risks_json?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 10.2 : Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: dashboard page with KPIs and analysis history"
```

---

## Task 11 : Stripe freemium

**Files:**
- Modify: `backend/src/routes/billing.js`

- [ ] **Step 11.1 : Configurer les produits Stripe**

Dans le dashboard Stripe (test mode) :
1. Créer un produit "Starter" — 29€/mois recurring → noter le `price_id`
2. Créer un produit "Pro" — 79€/mois recurring → noter le `price_id`
3. Ajouter `STRIPE_STARTER_PRICE_ID` et `STRIPE_PRO_PRICE_ID` dans `.env`

- [ ] **Step 11.2 : Route billing**

`backend/src/routes/billing.js` :
```js
import { Router } from 'express'
import Stripe from 'stripe'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db.js'

export const billingRouter = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

billingRouter.post('/billing/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body
  if (!PRICE_IDS[plan]) return res.status(400).json({ error: 'Plan invalide' })

  const userRes = await query('SELECT email, stripe_customer_id FROM users WHERE id = $1', [req.userId])
  const user = userRes.rows[0]

  let customerId = user.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email })
    customerId = customer.id
    await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.userId])
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/?upgraded=1`,
    cancel_url: `${process.env.FRONTEND_URL}/`,
  })

  res.json({ url: session.url })
})

billingRouter.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return res.status(400).send('Webhook signature invalide')
  }

  if (event.type === 'invoice.paid') {
    const sub = event.data.object
    const customer = await stripe.customers.retrieve(sub.customer)
    const userRes = await query('SELECT id FROM users WHERE stripe_customer_id = $1', [customer.id])
    if (userRes.rows[0]) {
      const planName = sub.amount > 5000 ? 'pro' : 'starter'
      await query('UPDATE users SET plan = $1, analyses_count_month = 0 WHERE id = $2', [planName, userRes.rows[0].id])
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const userRes = await query('SELECT id FROM users WHERE stripe_customer_id = $1', [sub.customer])
    if (userRes.rows[0]) {
      await query("UPDATE users SET plan = 'free' WHERE id = $1", [userRes.rows[0].id])
    }
  }

  res.json({ received: true })
})
```

Note : le webhook utilise `express.raw()` — ajouter l'import d'express dans le fichier : `import express from 'express'`

- [ ] **Step 11.3 : Tester le webhook Stripe en local**

```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

Déclencher un paiement test depuis le dashboard Stripe → vérifier que le plan se met à jour en BDD.

- [ ] **Step 11.4 : Commit**

```bash
git add backend/src/routes/billing.js
git commit -m "feat: Stripe freemium checkout and webhook"
```

---

## Task 12 : Déploiement Railway + Vercel

**Files:**
- Create: `backend/Procfile`
- Create: `ml-service/Procfile`
- Create: `frontend/.env.production`

- [ ] **Step 12.1 : Déployer PostgreSQL sur Railway**

```bash
railway login
railway init
railway add postgresql
railway variables set DATABASE_URL=<auto-set>
```

Exécuter la migration :
```bash
railway run psql $DATABASE_URL -f backend/src/migrations/001_init.sql
```

- [ ] **Step 12.2 : Déployer le backend Node**

```bash
cd backend
railway up
railway variables set PORT=3001 JWT_SECRET=<prod_secret> JWT_REFRESH_SECRET=<prod_secret> \
  ML_SERVICE_URL=<ml_service_url> STRIPE_SECRET_KEY=<sk_live_...> \
  STRIPE_WEBHOOK_SECRET=<whsec_...> FRONTEND_URL=<vercel_url>
```

- [ ] **Step 12.3 : Déployer le ML service Python**

```bash
cd ml-service
railway up --service ml-service
railway variables set ANTHROPIC_API_KEY=<sk-ant-...> CLAUDE_MODEL=claude-sonnet-4-5
```

- [ ] **Step 12.4 : Déployer le frontend sur Vercel**

```bash
cd frontend
vercel --prod
```

Variables Vercel :
```
VITE_BACKEND_URL=https://<backend-railway-url>
```

- [ ] **Step 12.5 : Tester l'app déployée end-to-end**

1. Ouvrir l'URL Vercel
2. Créer un compte
3. Soumettre une communication
4. Vérifier le score + risques + version corrigée
5. Vérifier le dashboard

- [ ] **Step 12.6 : Commit final**

```bash
git add .
git commit -m "chore: deployment config Railway + Vercel"
```

---

## Self-Review

### Couverture spec

| Requirement spec | Tâche |
|---|---|
| Auth JWT + refresh tokens | Task 3 |
| Quota freemium (3/30/∞) | Task 5 (quota middleware) |
| ML service pass-through Claude V1 | Task 4 |
| Flux analyse avec transaction atomique | Task 5 |
| Score + risques vulgarisés + version corrigée | Task 4 (prompts.py) + Task 8 (composants) |
| SplitView original/corrigé | Task 8 |
| Dashboard KPIs + historique | Task 6 + Task 10 |
| Stripe freemium + webhook | Task 11 |
| PostgreSQL schema complet | Task 2 |
| Déploiement Vercel + Railway | Task 12 |
| Gestion erreurs (Claude down, ML timeout, etc.) | Task 5 (route analyse) |
| Données supprimées après 90j | ⚠️ Cron job à ajouter — voir note ci-dessous |

**Note cron 90j :** ajouter dans Task 6 ou en standalone :
```sql
-- À exécuter via pg_cron (Railway) ou cron node
DELETE FROM analyses WHERE created_at < NOW() - INTERVAL '90 days';
```

Pour Railway, ajouter dans `backend/src/server.js` au démarrage :
```js
// Cron quotidien à minuit UTC
setInterval(async () => {
  await query("DELETE FROM analyses WHERE created_at < NOW() - INTERVAL '90 days'")
}, 24 * 60 * 60 * 1000)
```

### Types consistants

- `result.risks` est un tableau — `RiskList` attend un tableau ✓
- `result.corrected_text` peut être `null` — `SplitView` n'est affiché que si truthy ✓
- `score` est un entier 0-100 — `ScoreGauge` l'utilise directement ✓
- `ml_probability` est un float 0-1 — stocké en `REAL` PostgreSQL ✓
