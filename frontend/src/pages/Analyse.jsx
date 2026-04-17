import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import ScoreGauge from '../components/ScoreGauge'
import RiskList from '../components/RiskList'
import SplitView from '../components/SplitView'
import ChannelSelector from '../components/ChannelSelector'

export default function Analyse() {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState('email')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return setError('Entrez un texte à analyser')
    setLoading(true)
    setError('')
    setResult(null)
    const res = await api.analyse(text, channel)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      if (res.status === 402) return setError('Quota mensuel atteint — passez au plan Starter pour continuer')
      return setError(data.error || "Erreur lors de l'analyse")
    }
    setResult(data)
  }

  return (
    <div className="min-h-screen bg-brand-navy">
      <header className="bg-brand-dark border-b border-brand-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">RegulAI</h1>
        <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
          Dashboard →
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Canal de communication
            </label>
            <ChannelSelector value={channel} onChange={setChannel} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Texte à analyser
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Collez ici votre email, SMS, post réseaux sociaux, brief influenceur..."
              rows={6}
              maxLength={4000}
              className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan resize-none"
            />
            <p className="text-xs text-slate-500 mt-1 text-right">{text.length}/4000</p>
          </div>

          {error && (
            <div className="border border-red-400 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !text.trim()}
            className="bg-brand-cyan text-brand-navy font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Analyse en cours...' : 'Analyser la conformité'}
          </button>
        </form>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-brand-dark border border-brand-border rounded-xl p-6">
              <ScoreGauge score={result.score} />
            </div>

            {result.risks?.length > 0 && (
              <div className="bg-brand-dark border border-brand-border rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Zones de risque
                </h2>
                <RiskList risks={result.risks} />
              </div>
            )}

            {result.corrected_text && (
              <div className="bg-brand-dark border border-brand-border rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Version corrigée
                </h2>
                <SplitView original={text} corrected={result.corrected_text} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
