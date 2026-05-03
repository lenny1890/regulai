# Handoff

## State
RegulAI V1 est en prod (12/12 tasks). Frontend : https://frontend-ten-vert-25.vercel.app. Backend : https://regulai-production.up.railway.app. GitHub : github.com/lenny1890/regulai. Security fixes commités (refresh token rotation). ML service déployé sur Railway.

## Next
1. **CRITIQUE** : Configurer le webhook Stripe sur dashboard.stripe.com → Developers → Webhooks → Add endpoint (`https://regulai-production.up.railway.app/api/billing/webhook`, events: checkout.session.completed / customer.subscription.updated / customer.subscription.deleted) puis `railway variables set STRIPE_WEBHOOK_SECRET=whsec_...` — sans ça le webhook est exploitable.
2. Ajouter les vraies clés Stripe (sk_test_... + price_IDs) dans Railway variables du service `regulai` pour activer le billing.
3. Optionnel : renommer le projet Vercel de "frontend" à "regulai" sur vercel.com.

## Context
- PostgreSQL Railway sur port 5434 en local (pas 5432). En prod DATABASE_URL est auto-injecté via `${{Postgres.DATABASE_URL}}`.
- ML_SERVICE_URL en prod = `http://ml-service.railway.internal:8001` (réseau interne Railway).
- FRONTEND_URL Railway = `https://frontend-ten-vert-25.vercel.app` (déjà configuré).
- Stripe plans : starter=39€, business=89€, agency=199€. PLAN_LIMITS dans `backend/src/middleware/quota.js`.
