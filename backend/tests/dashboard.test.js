import request from 'supertest'
import { app } from '../src/server.js'
import { query } from '../src/db.js'

let accessToken

beforeAll(async () => {
  await query("DELETE FROM users WHERE email = 'test_dashboard@regulai.test'")
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'test_dashboard@regulai.test', password: 'password123' })
  accessToken = res.body.accessToken
})

afterAll(async () => {
  await query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = 'test_dashboard@regulai.test')")
  await query("DELETE FROM users WHERE email = 'test_dashboard@regulai.test'")
  // pool.end() géré par setup.test.js (dernier alphabétiquement)
})

describe('GET /api/dashboard', () => {
  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/dashboard')
    expect(res.status).toBe(401)
  })

  it('retourne les KPIs pour un compte vide', async () => {
    const res = await request(app).get('/api/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('kpis')
    expect(res.body).toHaveProperty('history')
    expect(res.body.kpis.total_analyses).toBe(0)
    expect(res.body.kpis.avg_score).toBe(0)
    expect(res.body.kpis.savings_estimate).toBe(0)
    expect(res.body.history).toEqual([])
  })
})
