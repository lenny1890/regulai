import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Header from '../components/Header'

const CHANNEL_LABEL = { email: 'Email', sms: 'SMS', landing: 'Landing', publicite: 'Pub', social: 'Social', influenceur: 'Influence', autre: 'Autre' }
const CHANNEL_COLOR = { email: 'oklch(0.46 0.19 268)', sms: 'oklch(0.42 0.18 295)', landing: 'oklch(0.42 0.18 220)', publicite: 'oklch(0.50 0.18 62)', social: 'oklch(0.44 0.16 148)', influenceur: 'oklch(0.48 0.18 12)', autre: 'oklch(0.50 0.01 268)' }

function ScoreBadge({ score }) {
  if (score >= 80) return <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">Conforme</span>
  if (score >= 50) return <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-100 text-orange-700">Modéré</span>
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-100 text-red-700">Élevé</span>
}

// Pure SVG line chart with area fill
function SvgLineChart({ data }) {
  const W = 400, H = 140, PAD = { top: 10, right: 10, bottom: 28, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (!data || data.length < 2) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="text-xs text-muted">Pas assez de données</span>
    </div>
  )

  const values = data.map(d => d.avg_score)
  const minV = 0, maxV = 100
  const xStep = innerW / (data.length - 1)

  const toX = i => PAD.left + i * xStep
  const toY = v => PAD.top + innerH - ((v - minV) / (maxV - minV)) * innerH

  const pts = data.map((d, i) => `${toX(i)},${toY(d.avg_score)}`).join(' ')
  const areaPath = [
    `${toX(0)},${PAD.top + innerH}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.avg_score)}`),
    `${toX(data.length - 1)},${PAD.top + innerH}`,
  ].join(' ')

  const yTicks = [0, 25, 50, 75, 100]
  const xTicks = data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1)
    .map((d, _, arr) => {
      const i = data.indexOf(d)
      const dt = new Date(d.day)
      return { x: toX(i), label: `${dt.getDate()}/${dt.getMonth() + 1}` }
    })

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.46 0.19 268)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="oklch(0.46 0.19 268)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={toY(v)} x2={PAD.left + innerW} y2={toY(v)} stroke="oklch(0.89 0.012 268)" strokeWidth={0.8} />
          <text x={PAD.left - 6} y={toY(v) + 3.5} textAnchor="end" fontSize={9} fill="oklch(0.52 0.018 268)">{v}</text>
        </g>
      ))}
      {/* Area fill */}
      <polygon points={areaPath} fill="url(#areaGrad)" />
      {/* Line */}
      <polyline points={pts} fill="none" stroke="oklch(0.46 0.19 268)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots on data points */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.avg_score)} r={2.5} fill="oklch(0.46 0.19 268)" />
      ))}
      {/* X axis labels */}
      {xTicks.map(({ x, label }, i) => (
        <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="oklch(0.52 0.018 268)">{label}</text>
      ))}
    </svg>
  )
}

// SVG horizontal bar chart by channel
function SvgBarChart({ history }) {
  const counts = {}
  history.forEach(a => { counts[a.channel] = (counts[a.channel] || 0) + 1 })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  if (!entries.length) return null

  const maxVal = entries[0][1]
  const BAR_H = 20, GAP = 8, PAD_LEFT = 72, PAD_RIGHT = 36, W = 400

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${entries.length * (BAR_H + GAP)}`}>
      {entries.map(([ch, count], i) => {
        const barW = Math.max(4, ((count / maxVal) * (W - PAD_LEFT - PAD_RIGHT)))
        const y = i * (BAR_H + GAP)
        const color = CHANNEL_COLOR[ch] || CHANNEL_COLOR.autre
        return (
          <g key={ch}>
            <text x={PAD_LEFT - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize={11} fontWeight={500} fill="oklch(0.14 0.025 268)">
              {CHANNEL_LABEL[ch] || ch}
            </text>
            <rect x={PAD_LEFT} y={y} width={barW} height={BAR_H} rx={4} fill={color} opacity={0.85} />
            <text x={PAD_LEFT + barW + 6} y={y + BAR_H / 2 + 4} fontSize={10} fontWeight={600} fill="oklch(0.52 0.018 268)">
              {count}
            </text>
          </g>
        )
      })}
    </svg>
  )
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
    <div className="min-h-screen bg-page-bg">
      <Header />
      <div className="flex items-center justify-center py-20 text-muted text-sm">Chargement...</div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-page-bg">
      <Header />
      <div className="flex items-center justify-center py-20 text-red-500 text-sm">{error}</div>
    </div>
  )

  const { kpis, history } = data
  const hasAnalyses = history.length > 0
  const scoreEvolution = data.score_evolution || []
  const topIssues = data.top_issues || []

  return (
    <div className="min-h-screen bg-page-bg">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Tableau de bord</h1>
          <p className="text-sm text-muted mt-1">Vue d'ensemble de votre conformité juridique</p>
        </div>

        {!hasAnalyses ? (
          /* Onboarding card */
          <div className="bg-surface border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-base font-bold text-text mb-1">Bienvenue sur votre tableau de bord</h2>
            <p className="text-sm text-muted mb-6">Voici comment bien démarrer</p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text mb-3">Analysez votre première communication</p>
                  <Link to="/"
                    className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                    Lancer une analyse
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">Corrigez les points identifiés</p>
                  <p className="text-xs text-muted mt-0.5">Le moteur vous indiquera quoi changer</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">Suivez votre évolution</p>
                  <p className="text-xs text-muted mt-0.5">Vos statistiques apparaîtront ici après 3 analyses</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Analyses (30j)',     value: kpis.total_analyses },
                { label: 'Score moyen',        value: kpis.avg_score ? `${kpis.avg_score}/100` : '—' },
                { label: 'Conformes',          value: kpis.compliant_count },
                { label: 'Approuvées',         value: kpis.approved_count ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                  <p className="text-xs text-muted mb-1.5">{label}</p>
                  <p className="text-3xl font-extrabold text-text">{value}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

              {/* Score evolution */}
              <div className="bg-surface border border-border rounded-xl shadow-sm p-5">
                <h2 className="text-sm font-semibold text-text mb-1">Évolution du score (30j)</h2>
                <p className="text-xs text-muted mb-4">Score moyen par jour sur la période</p>
                <SvgLineChart data={scoreEvolution} />
              </div>

              {/* Bar chart by channel */}
              <div className="bg-surface border border-border rounded-xl shadow-sm p-5">
                <h2 className="text-sm font-semibold text-text mb-1">Analyses par canal</h2>
                <p className="text-xs text-muted mb-4">Volume analysé par type de communication</p>
                <SvgBarChart history={history} />
              </div>
            </div>

            {/* Top issues */}
            {topIssues.length > 0 && (
              <div className="bg-surface border border-border rounded-xl shadow-sm mb-6">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold text-text">Vos erreurs les plus fréquentes</h2>
                  <p className="text-xs text-muted mt-0.5">Top 3 des points bloquants récurrents</p>
                </div>
                <div className="divide-y divide-border">
                  {topIssues.slice(0, 3).map((issue, i) => {
                    const pct = Math.round((issue.count / (topIssues[0]?.count || 1)) * 100)
                    return (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium text-text">{issue.title}</span>
                          </div>
                          <span className="text-xs text-muted">{issue.count}x</span>
                        </div>
                        {issue.domain && (
                          <p className="text-xs text-muted mb-2 ml-7">{issue.domain}</p>
                        )}
                        <div className="ml-7 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent history table */}
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text">Analyses récentes</h2>
                <Link to="/historique" className="text-xs text-primary hover:underline font-medium">
                  Voir tout →
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50">
                    {['Date', 'Canal', 'Score', 'Risques', 'Niveau'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 5).map((a, i) => {
                    const scoreColor = a.score >= 80 ? 'text-emerald-600' : a.score >= 50 ? 'text-orange-500' : 'text-red-500'
                    return (
                      <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
                        <td className="px-5 py-3.5 text-muted text-xs">
                          {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 text-text capitalize">{a.channel}</td>
                        <td className={`px-5 py-3.5 font-semibold ${scoreColor}`}>{a.score}</td>
                        <td className="px-5 py-3.5 text-muted">{a.risks_json?.length ?? 0}</td>
                        <td className="px-5 py-3.5"><ScoreBadge score={a.score} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
