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
