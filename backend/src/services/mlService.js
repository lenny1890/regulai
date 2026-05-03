const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001'
const MAX_RETRIES = 1
const TIMEOUT_MS = 60000

async function attemptCall(text, channel, signal) {
  const res = await fetch(`${ML_SERVICE_URL}/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, channel }),
    signal,
  })
  if (!res.ok) throw new Error(`ML service error: ${res.status}`)
  return res.json()
}

export async function callMlService(text, channel) {
  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      return await attemptCall(text, channel, controller.signal)
    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') throw new Error('ML_TIMEOUT')
      lastErr = err
      if (attempt < MAX_RETRIES) {
        // Exponential backoff : 1s, 2s
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastErr
}
