import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, setToken } from '../api'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) return setError('Mot de passe : 8 caractères minimum')
    setLoading(true)
    setError('')
    const res = await api.register(email, password)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error || "Erreur lors de l'inscription")
    setToken(data.accessToken)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center">
      <div className="w-full max-w-sm bg-brand-dark border border-brand-border rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Créer un compte</h1>
        <p className="text-sm text-slate-400 mb-6">3 analyses gratuites par mois</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe (8 chars min)" required
            className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-cyan text-brand-navy font-semibold rounded-lg py-2.5 hover:opacity-90 disabled:opacity-50">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400 text-center">
          Déjà un compte ? <Link to="/login" className="text-brand-cyan">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
