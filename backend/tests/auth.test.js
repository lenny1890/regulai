import request from 'supertest'
import { app } from '../src/server.js'
import { pool } from '../src/db.js'

afterAll(async () => {
  await pool.query(`
    DELETE FROM refresh_tokens WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE 'test_%@regulai.test'
    )
  `)
  await pool.query("DELETE FROM users WHERE email LIKE 'test_%@regulai.test'")
  // pool.end() géré par setup.test.js (dernier alphabétiquement)
})

describe('POST /api/auth/register', () => {
  it('crée un compte et retourne un token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test_1@regulai.test', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('rejette un email déjà utilisé', async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'test_dup@regulai.test', password: 'password123' })
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'test_dup@regulai.test', password: 'password123' })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'test_login@regulai.test', password: 'password123' })
  })

  it('retourne un accessToken pour des credentials valides', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test_login@regulai.test', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('retourne 401 pour un mauvais mot de passe', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test_login@regulai.test', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/refresh', () => {
  let refreshCookie

  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'test_refresh@regulai.test', password: 'password123' })
    const loginRes = await request(app).post('/api/auth/login')
      .send({ email: 'test_refresh@regulai.test', password: 'password123' })
    refreshCookie = loginRes.headers['set-cookie']
  })

  it('retourne un nouveau accessToken avec un refresh token valide', async () => {
    const res = await request(app).post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('retourne 401 sans cookie', async () => {
    const res = await request(app).post('/api/auth/refresh')
    expect(res.status).toBe(401)
  })
})
