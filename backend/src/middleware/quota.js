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
