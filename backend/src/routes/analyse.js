import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { checkQuota } from '../middleware/quota.js'
import { callMlService } from '../services/mlService.js'
import { query } from '../db.js'

export const analyseRouter = Router()

// Middleware de validation du texte — doit être avant checkAndIncrementQuota
function validateAnalyseInput(req, res, next) {
  const { text, channel } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Texte vide' })
  if (!['email', 'sms', 'push', 'social', 'influenceur'].includes(channel)) {
    return res.status(400).json({ error: 'Canal invalide' })
  }
  next()
}

analyseRouter.post('/analyse', requireAuth, validateAnalyseInput, checkQuota, async (req, res) => {
  const { text, channel } = req.body

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
      return res.status(503).json({ error: "Service d'analyse temporairement indisponible" })
    }
    res.status(500).json({ error: "Erreur lors de l'analyse" })
  }
})

analyseRouter.get('/analyses', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, channel, score, ml_probability, risks_json, created_at
       FROM analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

analyseRouter.get('/analyses/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM analyses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Analyse introuvable' })
    res.json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
