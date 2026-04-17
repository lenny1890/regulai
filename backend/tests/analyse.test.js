import request from 'supertest'
import { app } from '../src/server.js'
import { pool, query } from '../src/db.js'

let accessToken, userId

beforeAll(async () => {
  await query("DELETE FROM users WHERE email = 'test_analyse@regulai.test'")
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'test_analyse@regulai.test', password: 'password123' })
  accessToken = res.body.accessToken
  const u = await query("SELECT id FROM users WHERE email = 'test_analyse@regulai.test'")
  userId = u.rows[0].id
})

afterAll(async () => {
  await query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId])
  await query("DELETE FROM users WHERE email = 'test_analyse@regulai.test'")
  // pool.end() géré par auth.test.js qui s'exécute après (ordre alphabétique)
})

describe('POST /api/analyse', () => {
  it('retourne 401 sans token', async () => {
    const res = await request(app).post('/api/analyse')
      .send({ text: 'test', channel: 'email' })
    expect(res.status).toBe(401)
  })

  it('retourne 400 si texte vide', async () => {
    const res = await request(app).post('/api/analyse')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: '', channel: 'email' })
    expect(res.status).toBe(400)
  })

  it('retourne 402 si quota dépassé', async () => {
    await query("UPDATE users SET analyses_count_month = 3 WHERE id = $1", [userId])
    const res = await request(app).post('/api/analyse')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: 'Promotion exceptionnelle !', channel: 'email' })
    expect(res.status).toBe(402)
    await query("UPDATE users SET analyses_count_month = 0 WHERE id = $1", [userId])
  })
})
