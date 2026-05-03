const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

let accessToken = localStorage.getItem('accessToken') || null

export function setToken(t) {
  accessToken = t
  if (t) localStorage.setItem('accessToken', t)
  else localStorage.removeItem('accessToken')
}

export function getToken() {
  return accessToken
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Identifiants invalides')
  setToken(data.accessToken)
  return data
}

export async function register(email, password) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la création du compte')
  setToken(data.accessToken)
  return data
}

export function logout() {
  setToken(null)
  localStorage.removeItem('accessToken')
}

let _ensureAuthPromise = null
export async function ensureAuth() {
  if (accessToken) return
  if (_ensureAuthPromise) return _ensureAuthPromise
  _ensureAuthPromise = (async () => {
    try {
      const refresh = await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (refresh.ok) {
        const { accessToken: t } = await refresh.json()
        setToken(t)
      }
    } catch { /* ignore */ }
  })()
  await _ensureAuthPromise
  _ensureAuthPromise = null
}

async function authFetch(path, options = {}, retried = false) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && !retried) {
    const refresh = await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (refresh.ok) {
      const { accessToken: newToken } = await refresh.json()
      setToken(newToken)
      return authFetch(path, options, true)
    }
    setToken(null)
    return new Response(null, { status: 401 })
  }
  return res
}

export const api = {
  analyse: (text, channel) =>
    authFetch('/api/analyse', { method: 'POST', body: JSON.stringify({ text, channel }) }),

  checkDuplicate: (textHash) =>
    authFetch('/api/analyse/check-duplicate', { method: 'POST', body: JSON.stringify({ text_hash: textHash }) }),

  approveAnalysis: (id) =>
    authFetch(`/api/analyses/${id}/approve`, { method: 'POST' }),

  getAnalyses: () => authFetch('/api/analyses'),

  getAnalysis: (id) => authFetch(`/api/analyses/${id}`),

  getDashboard: () => authFetch('/api/dashboard'),

  getTemplates: () => authFetch('/api/templates'),

  // Billing
  getBillingStatus: () => authFetch('/api/billing/status'),

  createCheckout: (plan) =>
    authFetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),

  openBillingPortal: () =>
    authFetch('/api/billing/portal', { method: 'POST' }),
}
