import { pool, query } from '../src/db.js'

afterAll(async () => {
  await pool.end()
})

describe('database connection', () => {
  it('connects and queries', async () => {
    const result = await query('SELECT 1 AS val')
    expect(result.rows[0].val).toBe(1)
  })

  it('users table exists', async () => {
    const result = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `)
    expect(result.rows).toHaveLength(1)
  })

  it('analyses table exists', async () => {
    const result = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'analyses'
    `)
    expect(result.rows).toHaveLength(1)
  })
})
