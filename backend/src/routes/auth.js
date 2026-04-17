import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { query } from '../db.js'

export const authRouter = Router()

const ACCESS_EXPIRY = '1h'
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

function signAccess(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY })
}

async function createRefreshToken(userId, res) {
  const token = crypto.randomBytes(40).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS)
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  )
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_EXPIRY_MS,
  })
  return token
}

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email et mot de passe requis (8 chars min)' })
  }
  try {
    const hash = await bcrypt.hash(password, 12)
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email.toLowerCase().trim(), hash]
    )
    const userId = result.rows[0].id
    const accessToken = signAccess(userId)
    await createRefreshToken(userId, res)
    res.status(201).json({ accessToken })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  const result = await query('SELECT id, password_hash FROM users WHERE email = $1', [email?.toLowerCase().trim()])
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Identifiants incorrects' })
  }
  const accessToken = signAccess(user.id)
  await createRefreshToken(user.id, res)
  res.json({ accessToken })
})

authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken
  if (!token) return res.status(401).json({ error: 'Refresh token manquant' })
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const result = await query(
    'SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()',
    [hash]
  )
  if (!result.rows[0]) return res.status(401).json({ error: 'Token invalide ou expiré' })
  const accessToken = signAccess(result.rows[0].user_id)
  res.json({ accessToken })
})
