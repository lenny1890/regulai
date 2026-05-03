import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

const { Pool } = pg

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    // Table de tracking des migrations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const migrationsDir = join(__dirname, 'migrations')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const { rows } = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      )
      if (rows.length > 0) {
        console.log(`[migrate] skip  ${file}`)
        continue
      }

      const sql = readFileSync(join(migrationsDir, file), 'utf8')
      await pool.query(sql)
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      console.log(`[migrate] apply ${file}`)
    }

    console.log('[migrate] done')
  } finally {
    await pool.end()
  }
}

migrate().catch(err => {
  console.error('[migrate] error:', err.message)
  process.exit(1)
})
