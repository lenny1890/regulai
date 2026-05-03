import { Router } from 'express'
import { createHash } from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import { checkQuota } from '../middleware/quota.js'
import { callMlService } from '../services/mlService.js'
import { query } from '../db.js'

export const analyseRouter = Router()

const VALID_CHANNELS = ['email', 'sms', 'push', 'social', 'influenceur', 'landing', 'publicite', 'autre']

function validateAnalyseInput(req, res, next) {
  const { text, channel } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Texte vide' })
  if (text.trim().length < 10) return res.status(400).json({ error: 'Texte trop court (minimum 10 caractères)' })
  if (text.trim().length > 10000) return res.status(400).json({ error: 'Texte trop long (maximum 10 000 caractères)' })
  if (!VALID_CHANNELS.includes(channel)) {
    return res.status(400).json({ error: 'Type de contenu invalide' })
  }
  next()
}

analyseRouter.post('/analyse', requireAuth, validateAnalyseInput, checkQuota, async (req, res) => {
  const { text, channel } = req.body
  const textHash = createHash('sha256').update(text.trim()).digest('hex')

  try {
    const result = await callMlService(text.trim(), channel)

    await query('BEGIN')
    await query(
      'UPDATE users SET analyses_count_month = analyses_count_month + 1 WHERE id = $1',
      [req.userId]
    )
    await query(
      `INSERT INTO analyses
        (user_id, channel, input_text, score, ml_probability, risks_json, corrected_text,
         headline, corrected_version_possible, unfixable_reasons, recommendations, sanctions, modifications, text_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        req.userId, channel, text.trim(), result.score, result.ml_probability ?? 0,
        JSON.stringify(result.risks ?? []),
        result.corrected_text ?? null,
        result.headline ?? null,
        result.corrected_version_possible ?? true,
        JSON.stringify(result.unfixable_reasons ?? null),
        JSON.stringify(result.recommendations ?? []),
        JSON.stringify(result.sanctions ?? []),
        JSON.stringify(result.modifications ?? []),
        textHash,
      ]
    )
    await query('COMMIT')

    res.json({ ...result, text_hash: textHash })
  } catch (err) {
    await query('ROLLBACK').catch(() => {})
    if (err.message === 'ML_TIMEOUT') {
      return res.status(503).json({ error: "Service d'analyse temporairement indisponible" })
    }
    res.status(500).json({ error: "Erreur lors de l'analyse" })
  }
})

// Vérification de doublon avant analyse
analyseRouter.post('/analyse/check-duplicate', requireAuth, async (req, res) => {
  const { text_hash } = req.body
  if (!text_hash) return res.status(400).json({ error: 'text_hash requis' })
  try {
    const result = await query(
      `SELECT id, score, headline, created_at FROM analyses
       WHERE user_id = $1 AND text_hash = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.userId, text_hash]
    )
    res.json({ duplicate: result.rows[0] ?? null })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Approbation d'une analyse (score >= 80)
analyseRouter.post('/analyses/:id/approve', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `UPDATE analyses SET is_approved = true
       WHERE id = $1 AND user_id = $2 AND score >= 80
       RETURNING id, is_approved, score`,
      [req.params.id, req.userId]
    )
    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Analyse introuvable ou score insuffisant (< 80)' })
    }
    res.json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

analyseRouter.get('/analyses', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, channel, score, headline, risks_json, is_approved, created_at
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

// Templates par industrie
analyseRouter.get('/templates', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, industry, description, template_text, is_compliant FROM industry_templates ORDER BY industry, name'
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
