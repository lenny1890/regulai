import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db.js'

export const dashboardRouter = Router()

dashboardRouter.get('/dashboard', requireAuth, async (req, res) => {
  try {
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
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
