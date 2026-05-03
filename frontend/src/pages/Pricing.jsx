import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api, getToken } from '../api'
import Header from '../components/Header'

const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    description: 'Pour découvrir RegulAI',
    features: [
      '5 analyses / mois',
      'Analyse RGPD / CNIL / Code Conso.',
      'Version corrigée publiable',
      'Export PDF',
      'Historique des analyses',
    ],
    cta: 'Votre plan actuel',
    disabled: true,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    description: 'Pour les PME actives',
    features: [
      '30 analyses / mois',
      'Import PDF',
      'Templates par industrie',
      'Détection de doublons',
      'Tableau de bord analytics',
      'Support email prioritaire',
    ],
    cta: 'Passer à Starter',
    highlight: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 89,
    description: 'Pour les équipes marketing',
    features: [
      'Analyses illimitées',
      'Export PDF consolidé (multi-sélection)',
      'API access',
      'Historique illimité',
      'Support dédié',
    ],
    cta: 'Passer à Business',
    highlight: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 199,
    description: 'Pour les agences & grands comptes',
    features: [
      'Tout le plan Business',
      'Multi-comptes clients',
      'Rapports white-label',
      'SLA garanti',
      'Onboarding dédié',
      'Accès API prioritaire',
    ],
    cta: 'Passer à Agency',
    highlight: false,
  },
]

export default function Pricing() {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Paiement réussi — bienvenue sur votre nouveau plan !')
    }
    if (getToken()) {
      api.getBillingStatus()
        .then(r => r.json())
        .then(d => setCurrentPlan(d.plan))
        .catch(() => {})
    }
  }, [searchParams])

  async function handleSubscribe(planId) {
    if (!getToken()) { navigate('/login'); return }
    setLoadingPlan(planId)
    try {
      const res = await api.createCheckout(planId)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      window.location.assign(data.url)
    } catch {
      toast.error('Erreur réseau — réessayez.')
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handlePortal() {
    setLoadingPlan('portal')
    try {
      const res = await api.openBillingPortal()
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      window.location.assign(data.url)
    } catch {
      toast.error('Erreur réseau — réessayez.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text mb-3">Choisissez votre plan</h1>
          <p className="text-muted text-sm max-w-md mx-auto">
            Analysez vos communications en toute conformité. Sans engagement, résiliez quand vous voulez.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {PLANS.map(plan => {
            const isActive = currentPlan === plan.id
            const hl = plan.highlight
            return (
              <div
                key={plan.id}
                className={`border rounded-xl p-6 flex flex-col relative ${
                  hl
                    ? 'border-primary shadow-lg'
                    : 'bg-surface border-border shadow-sm'
                }`}
                style={hl ? { background: 'oklch(0.46 0.19 268)' } : undefined}
              >
                {hl && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'oklch(0.62 0.17 62)', color: 'oklch(0.2 0.06 62)' }}
                    >
                      Recommandé
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h2 className={`text-lg font-bold ${hl ? 'text-white' : 'text-text'}`}>{plan.name}</h2>
                  <p className={`text-xs mt-0.5 ${hl ? 'text-white/70' : 'text-muted'}`}>{plan.description}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className={`text-3xl font-extrabold ${hl ? 'text-white' : 'text-text'}`}>{plan.price}€</span>
                    {plan.price > 0 && <span className={`text-sm ${hl ? 'text-white/60' : 'text-muted'}`}>/mois</span>}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${hl ? 'text-white/90' : 'text-text'}`}>
                      <svg
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${hl ? 'text-white/80' : 'text-emerald-500'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {isActive ? (
                  <div className="mt-auto">
                    <div className={`w-full text-center text-sm font-semibold py-2.5 rounded-lg ${
                      hl
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      Plan actuel
                    </div>
                    {plan.id !== 'free' && (
                      <button
                        onClick={handlePortal}
                        disabled={loadingPlan === 'portal'}
                        className={`w-full mt-2 text-xs underline transition-colors disabled:opacity-50 ${
                          hl ? 'text-white/60 hover:text-white' : 'text-muted hover:text-text'
                        }`}
                      >
                        {loadingPlan === 'portal' ? 'Chargement...' : 'Gérer mon abonnement'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => plan.disabled ? null : handleSubscribe(plan.id)}
                    disabled={plan.disabled || !!loadingPlan}
                    className={`mt-auto w-full text-sm font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      hl
                        ? 'bg-white text-primary hover:bg-white/90'
                        : 'bg-page-bg border border-border text-text hover:bg-border'
                    }`}
                  >
                    {loadingPlan === plan.id ? 'Chargement...' : plan.cta}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-muted">
          Paiement sécurisé par Stripe. Toutes les cartes acceptées. Annulation à tout moment.
        </p>
      </main>
    </div>
  )
}
