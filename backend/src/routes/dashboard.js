import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db.js'

export const dashboardRouter = Router()

dashboardRouter.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [kpis, history, topIssues, scoreEvolution] = await Promise.all([
      query(
        `SELECT
          COUNT(*)::int AS total_analyses,
          ROUND(AVG(score))::int AS avg_score,
          COUNT(*) FILTER (WHERE score >= 80)::int AS compliant_count,
          COUNT(*) FILTER (WHERE score < 50)::int AS risk_count,
          COUNT(*) FILTER (WHERE is_approved = true)::int AS approved_count
         FROM analyses
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
        [req.userId]
      ),
      query(
        `SELECT id, channel, score, headline, risks_json, is_approved, created_at
         FROM analyses WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [req.userId]
      ),
      // Top problèmes récurrents
      query(
        `SELECT risks_json FROM analyses WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 30`,
        [req.userId]
      ),
      // Évolution score sur 30j
      query(
        `SELECT
          DATE_TRUNC('day', created_at)::date AS day,
          ROUND(AVG(score))::int AS avg_score,
          COUNT(*)::int AS count
         FROM analyses WHERE user_id = $1
           AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY day ASC`,
        [req.userId]
      ),
    ])

    const { total_analyses, avg_score, compliant_count, risk_count, approved_count } = kpis.rows[0]

    // Agrégation top issues
    const issueMap = {}
    for (const row of topIssues.rows) {
      const risks = Array.isArray(row.risks_json) ? row.risks_json : []
      for (const r of risks) {
        const key = `${r.domain}::${r.title || r.description || ''}`
        if (!issueMap[key]) issueMap[key] = { domain: r.domain, title: r.title || r.description || '', count: 0 }
        issueMap[key].count++
      }
    }
    const topIssuesList = Object.values(issueMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    res.json({
      kpis: {
        total_analyses,
        avg_score: avg_score ?? 0,
        compliant_count,
        risk_count,
        approved_count,
        compliance_rate: total_analyses > 0 ? Math.round((compliant_count / total_analyses) * 100) : 0,
      },
      history: history.rows,
      top_issues: topIssuesList,
      score_evolution: scoreEvolution.rows,
    })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
