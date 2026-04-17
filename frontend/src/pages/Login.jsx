import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, setToken } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await api.login(email, password)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error || 'Erreur de connexion')
    setToken(data.accessToken)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center">
      <div className="w-full max-w-sm bg-brand-dark border border-brand-border rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">RegulAI</h1>
        <p className="text-sm text-slate-400 mb-6">Conformité des communications commerciales</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-cyan text-brand-navy font-semibold rounded-lg py-2.5 hover:opacity-90 disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400 text-center">
          Pas encore de compte ? <Link to="/register" className="text-brand-cyan">Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
