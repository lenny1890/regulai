import { pool } from '../src/db.js'

// Dernier fichier alphabétiquement — ferme le pool partagé
afterAll(async () => {
  await pool.end()
})

// Placeholder — real tests added in subsequent tasks
describe('setup', () => {
  it('runs', () => {
    expect(true).toBe(true);
  });
});
