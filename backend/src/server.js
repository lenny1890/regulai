import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { authRouter } from './routes/auth.js'
import { analyseRouter } from './routes/analyse.js'
import { dashboardRouter } from './routes/dashboard.js'
import { billingRouter } from './routes/billing.js'

export const app = express()

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : [/^http:\/\/localhost:\d+$/]

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
// Raw body requis pour la vérification de signature du webhook Stripe
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(cookieParser())

// Rate limiting — protège l'endpoint d'analyse (appels Claude coûteux)
const analyseLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 20,                      // 20 analyses/min par IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de requêtes — réessayez dans une minute.' },
  skip: () => process.env.NODE_ENV === 'test',
})

// Rate limiting global — protège toutes les routes auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives — réessayez dans 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
})

// Health check (pas de auth, utilisé par Railway / Docker healthcheck)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

app.use('/api/auth', authLimiter, authRouter)
app.use('/api', analyseRouter)
app.use('/api/analyse', analyseLimiter)
app.use('/api', dashboardRouter)
app.use('/api', billingRouter)

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
}
