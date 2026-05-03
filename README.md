# RegulAI — Conformité des communications commerciales

SaaS B2B qui analyse automatiquement les communications commerciales (emails, SMS, landing pages, publicités) pour détecter les non-conformités RGPD/CNIL et les signaler avec des recommandations concrètes.

## Stack

| Couche | Technologie |
|--------|------------|
| Frontend | React + Vite + Tailwind v4 |
| Backend | Node.js + Express |
| ML Service | Python + FastAPI + Claude (Anthropic) |
| Base de données | PostgreSQL |
| Auth | JWT + refresh tokens |

## Structure du projet

```
regulai/
├── frontend/          # React + Vite (port 5173)
├── backend/           # Node.js + Express (port 3001)
├── ml-service/        # FastAPI + Claude (port 8001)
└── docker-compose.yml # PostgreSQL (port 5434)
```

## Lancer le projet en local

### Prérequis

- Node.js 20+
- Python 3.11+
- Docker + Docker Compose
- Clé API Anthropic

### Installation

```bash
# 1. Démarrer la base de données
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env   # Remplir DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm install
npm run dev

# 3. ML Service
cd ml-service
cp .env.example .env   # Remplir ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# 4. Frontend
cd frontend
npm install
npm run dev
```

L'app est disponible sur `http://localhost:5173`.

### Variables d'environnement

**`backend/.env`**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/regulai
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
FRONTEND_URL=
```

**`ml-service/.env`**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Fonctionnalités

- **Analyse IA** — Soumettre un texte marketing, obtenir un score de conformité 0-100 avec détail par domaine (mentions légales, données personnelles, droit de rétractation...)
- **Recommandations** — Liste des risques détectés avec corrections suggérées
- **Dashboard** — Historique des analyses, évolution du score dans le temps, répartition par canal
- **Multi-canal** — Email, SMS, landing page, publicité, réseaux sociaux, influenceur

## Pricing (roadmap)

| Plan | Prix | Analyses/mois |
|------|------|---------------|
| Free | 0€ | 5 |
| Pro | 39€ | 100 |
| Business | 89€ | 500 |
| Enterprise | 199€ | Illimité |

## Roadmap

- [x] Auth JWT + refresh tokens
- [x] Analyse IA (score + recommandations)
- [x] Dashboard avec graphiques SVG
- [x] Design V2 (oklch, Layout B)
- [ ] Stripe freemium
- [ ] Déploiement Railway + Vercel

## Licence

MIT
