import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { register } from '../api'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Mot de passe : 8 caractères minimum.'); return }
    setLoading(true)
    try {
      await register(email, password)
      toast.success('Compte créé — bienvenue !')
      navigate('/app')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, background: 'oklch(0.46 0.19 268)', borderRadius: 9 }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-extrabold text-text leading-none tracking-tight">RegulAI</p>
            <p className="text-xs text-muted mt-0.5">Conformité des communications</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl shadow-sm p-6">
          <h1 className="text-base font-bold text-text mb-1">Créer un compte</h1>
          <p className="text-xs text-muted mb-5">Commencez à analyser vos communications.</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@entreprise.fr"
                required
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder-slate-400 focus:outline-none focus:border-primary bg-white"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder-slate-400 focus:outline-none focus:border-primary bg-white"
              />
              <p className="text-xs text-muted mt-1">Minimum 8 caractères</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ce service est conforme RGPD. Vos données restent confidentielles.
        </p>
      </div>
    </div>
  )
}
