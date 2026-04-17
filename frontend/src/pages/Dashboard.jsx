import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const CHANNEL_LABELS = {
  email: 'Email', sms: 'SMS', push: 'Push', social: 'Social', influenceur: 'Influenceur'
}

function ScoreBadge({ score }) {
  const cls = score >= 80 ? 'text-brand-green' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-semibold ${cls}`}>{score}</span>
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getDashboard()
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Erreur de chargement'); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center text-slate-400">
      Chargement...
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center text-red-400">
      {error}
    </div>
  )

  const { kpis, history } = data

  return (
    <div className="min-h-screen bg-brand-navy">
      <header className="bg-brand-dark border-b border-brand-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Dashboard</h1>
        <Link to="/" className="text-sm text-slate-400 hover:text-white">← Nouvelle analyse</Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Analyses (30j)', value: kpis.total_analyses },
            { label: 'Score moyen', value: kpis.avg_score ? `${kpis.avg_score}/100` : '—' },
            { label: 'Conformes', value: kpis.compliant_count },
            { label: 'Économies estimées', value: kpis.savings_estimate > 0 ? `${kpis.savings_estimate.toLocaleString('fr-FR')}€` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-brand-dark border border-brand-border rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Historique */}
        <div className="bg-brand-dark border border-brand-border rounded-xl">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-sm font-semibold text-white">Historique des analyses</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-slate-400 text-sm px-6 py-8 text-center">
              Aucune analyse encore — <Link to="/" className="text-brand-cyan">lancer la première</Link>
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Canal</th>
                  <th className="px-6 py-3 text-left">Score</th>
                  <th className="px-6 py-3 text-left">Risques</th>
                </tr>
              </thead>
              <tbody>
                {history.map(a => (
                  <tr key={a.id} className="border-t border-brand-border">
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(a.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-3 text-slate-300">{CHANNEL_LABELS[a.channel] || a.channel}</td>
                    <td className="px-6 py-3"><ScoreBadge score={a.score} /></td>
                    <td className="px-6 py-3 text-slate-400">{a.risks_json?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
