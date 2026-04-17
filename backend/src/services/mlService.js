const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001'

export async function callMlService(text, channel) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`${ML_SERVICE_URL}/analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, channel }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`ML service error: ${res.status}`)
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('ML_TIMEOUT')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
