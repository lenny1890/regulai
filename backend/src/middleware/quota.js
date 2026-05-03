import { query } from '../db.js'

const PLAN_LIMITS = { free: 5, starter: 30, business: Infinity, agency: Infinity }

export async function checkQuota(req, res, next) {
  const result = await query(
    'SELECT plan, analyses_count_month, analyses_reset_at FROM users WHERE id = $1',
    [req.userId]
  )
  const user = result.rows[0]
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  // Reset mensuel paresseux : si le mois a changé depuis le dernier reset, on remet à zéro
  const resetAt = new Date(user.analyses_reset_at)
  const now = new Date()
  const monthChanged =
    resetAt.getFullYear() !== now.getFullYear() || resetAt.getMonth() !== now.getMonth()

  if (monthChanged) {
    await query(
      'UPDATE users SET analyses_count_month = 0, analyses_reset_at = NOW() WHERE id = $1',
      [req.userId]
    )
    user.analyses_count_month = 0
  }

  const limit = PLAN_LIMITS[user.plan] ?? 5
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
