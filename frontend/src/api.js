const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

let accessToken = localStorage.getItem('accessToken') || null

export function setToken(t) {
  accessToken = t
  if (t) localStorage.setItem('accessToken', t)
  else localStorage.removeItem('accessToken')
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
    const refresh = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST', credentials: 'include',
    })
    if (refresh.ok) {
      const { accessToken: newToken } = await refresh.json()
      setToken(newToken)
      return authFetch(path, options, true)
    }
    setToken(null)
    window.location.href = '/login'
    return new Response(null, { status: 401 })
  }
  return res
}

export const api = {
  register: (email, password) =>
    fetch(`${BASE}/api/auth/register`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    fetch(`${BASE}/api/auth/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  analyse: (text, channel) =>
    authFetch('/api/analyse', {
      method: 'POST',
      body: JSON.stringify({ text, channel }),
    }),

  getAnalyses: () => authFetch('/api/analyses'),

  getDashboard: () => authFetch('/api/dashboard'),
}
