import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '../api'
import Header from '../components/Header'

const LEVEL_OPTIONS = ['Tous les niveaux', 'Conforme', 'Modéré', 'Élevé']

function scoreToBadge(score) {
  if (score >= 80) return {
    label: 'Conforme',
    cls: 'bg-emerald-100 text-emerald-700',
    squareCls: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    level: 'Conforme',
  }
  if (score >= 50) return {
    label: 'Risque modéré',
    cls: 'bg-orange-100 text-orange-700',
    squareCls: 'bg-orange-50 text-orange-600 border-orange-200',
    level: 'Modéré',
  }
  return {
    label: 'Risque élevé',
    cls: 'bg-red-100 text-red-700',
    squareCls: 'bg-red-50 text-red-600 border-red-200',
    level: 'Élevé',
  }
}

function getRegulations(risks_json) {
  const domains = new Set()
  const risks = Array.isArray(risks_json) ? risks_json : []
  for (const r of risks) {
    if (r.domain) domains.add(r.domain)
  }
  return Array.from(domains)
}

function exportSinglePDF(a) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18

  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text("RegulAI \u2014 Rapport d'analyse", margin, 14)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(a.created_at).toLocaleString('fr-FR'), pageW - margin, 14, { align: 'right' })

  let y = 32
  doc.setTextColor(15, 23, 42)

  const badge = scoreToBadge(a.score)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`Score : ${a.score}/100 \u2014 ${badge.label}`, margin, y)
  y += 8

  if (a.headline) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    const lines = doc.splitTextToSize(a.headline, pageW - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 6
  }

  const risks = Array.isArray(a.risks_json) ? a.risks_json : []
  if (risks.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Points de non-conformité', margin, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Réglementation', 'Problème', 'Gravité']],
      body: risks.map(r => [r.domain ?? '', r.title ?? r.description ?? '', r.severity ?? '']),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (a.corrected_text) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Version conforme publiable', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(a.corrected_text, pageW - margin * 2)
    doc.text(lines, margin, y)
  }

  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text("Ce rapport est généré automatiquement par RegulAI. Il ne constitue pas un avis juridique.", margin, pageH - 8)

  doc.save(`regulai-rapport-${a.id?.slice(0, 8) ?? 'export'}.pdf`)
}

function exportBulkPDF(analyses) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18

  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('RegulAI \u2014 Export consolidé', margin, 14)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Exporté le ${new Date().toLocaleString('fr-FR')} \u2014 ${analyses.length} analyse(s)`,
    pageW - margin, 14, { align: 'right' }
  )

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Résumé', 'Canal', 'Score', 'Niveau']],
    body: analyses.map(a => [
      new Date(a.created_at).toLocaleDateString('fr-FR'),
      a.headline || a.channel || '',
      a.channel || '',
      `${a.score}/100`,
      scoreToBadge(a.score).label,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
    columnStyles: { 1: { cellWidth: 70 } },
    margin: { left: margin, right: margin },
  })

  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text("Ce rapport est généré automatiquement par RegulAI. Il ne constitue pas un avis juridique.", margin, pageH - 8)

  doc.save(`regulai-export-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// Modale détail d'une analyse
function AnalysisModal({ id, onClose }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAnalysis(id)
      .then(r => r.json())
      .then(d => { setAnalysis(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const handleKey = useCallback(e => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const badge = analysis ? scoreToBadge(analysis.score) : null
  const risks = analysis ? (Array.isArray(analysis.risks_json) ? analysis.risks_json : []) : []
  const regs = analysis ? getRegulations(analysis.risks_json) : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white rounded-t-xl">
          <div>
            <p className="text-xs text-muted">
              {analysis ? new Date(analysis.created_at).toLocaleString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              }) : ''}
            </p>
            <h2 className="text-base font-bold text-text mt-0.5">Détail de l'analyse</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading && (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && analysis && (
            <>
              {/* Score + badge */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
                <span className="text-3xl font-bold text-text">{analysis.score}/100</span>
              </div>

              {/* Résumé */}
              {analysis.headline && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Résumé</p>
                  <p className="text-sm text-text font-medium">{analysis.headline}</p>
                </div>
              )}

              {/* Points bloquants */}
              {risks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Points bloquants
                  </p>
                  <ul className="space-y-2">
                    {risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="text-text">
                          {r.domain && <span className="font-medium">{r.domain} : </span>}
                          {r.title || r.description || ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Version corrigée */}
              {analysis.corrected_text && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Version corrigée</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-sm text-text leading-relaxed">{analysis.corrected_text}</p>
                  </div>
                </div>
              )}

              {/* Réglementations analysées */}
              {regs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Réglementations analysées
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {regs.map(reg => (
                      <span key={reg} className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Export PDF */}
              <button
                onClick={() => exportSinglePDF(analysis)}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity mt-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exporter le rapport PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Bouton PDF qui récupère les données complètes avant d'exporter
function PDFButton({ analysisId, analysisSummary }) {
  const [exporting, setExporting] = useState(false)

  async function handleClick() {
    setExporting(true)
    try {
      const res = await api.getAnalysis(analysisId)
      const full = await res.json()
      exportSinglePDF(full)
    } catch {
      exportSinglePDF(analysisSummary)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={exporting}
      className="flex items-center gap-1 text-xs font-semibold text-muted border border-border hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {exporting ? (
        <span className="w-3.5 h-3.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      PDF
    </button>
  )
}

export default function History() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('Tous les niveaux')
  const [selected, setSelected] = useState(new Set())
  const [modalId, setModalId] = useState(null)

  useEffect(() => {
    api.getDashboard()
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Erreur de chargement'); setLoading(false) })
  }, [])

  const history = (data?.history || []).filter(a => {
    if (levelFilter !== 'Tous les niveaux') {
      if (scoreToBadge(a.score).level !== levelFilter) return false
    }
    if (search.trim()) {
      const s = search.toLowerCase()
      return (
        a.headline?.toLowerCase().includes(s) ||
        a.channel?.toLowerCase().includes(s) ||
        new Date(a.created_at).toLocaleDateString('fr-FR').includes(s)
      )
    }
    return true
  })

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(
      selected.size === history.length ? new Set() : new Set(history.map(a => a.id))
    )
  }

  function handleBulkExport() {
    exportBulkPDF(history.filter(a => selected.has(a.id)))
  }

  const allSelected = history.length > 0 && selected.size === history.length
  const someSelected = selected.size > 0

  return (
    <div className="min-h-screen bg-page-bg">
      <Header />

      {modalId && <AnalysisModal id={modalId} onClose={() => setModalId(null)} />}

      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">

        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à l'analyse
        </Link>

        <div className="bg-surface border border-border rounded-xl shadow-sm">

          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h1 className="text-lg font-bold text-text">Historique des analyses</h1>
                <p className="text-xs text-muted mt-0.5">Consultez vos analyses passées et exportez les rapports</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-xs text-muted hover:text-text transition-colors"
                >
                  {allSelected ? 'Désélectionner tout' : 'Tout sélectionner'}
                </button>
              )}
              <span className="text-xs text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                {data?.history?.length ?? 0} analyse{(data?.history?.length ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Search + filter */}
          <div className="p-4 border-b border-border flex gap-3">
            <div className="flex-1 relative">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par titre d'analyse..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm text-text placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-surface"
              />
            </div>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* States */}
          {loading && (
            <div className="p-12 flex justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="p-6 text-center text-red-500 text-sm">{error}</div>
          )}
          {!loading && history.length === 0 && (
            <div className="py-16 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-muted">
                {search || levelFilter !== 'Tous les niveaux'
                  ? 'Aucun résultat pour cette recherche.'
                  : "Aucune analyse enregistrée. Les analyses effectuées apparaîtront ici."}
              </p>
            </div>
          )}

          {/* Analysis cards */}
          {!loading && history.length > 0 && (
            <div className="flex flex-col gap-3 p-4">
              {history.map(a => {
                const badge = scoreToBadge(a.score)
                const isChecked = selected.has(a.id)
                const regs = getRegulations(a.risks_json)

                return (
                  <div
                    key={a.id}
                    className={`flex items-start gap-3 p-4 border rounded-xl transition-colors ${isChecked ? 'bg-primary-light border-primary/30' : 'bg-surface border-border hover:border-border-strong'}`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(a.id)}
                      className="mt-1.5 w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer flex-shrink-0"
                    />

                    {/* Square score badge */}
                    <div className={`w-11 h-11 rounded-lg border flex flex-col items-center justify-center flex-shrink-0 ${badge.squareCls}`}>
                      <span className="text-base font-extrabold leading-none">{a.score}</span>
                      <span className="text-[9px] font-medium opacity-70 mt-0.5">/100</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Headline + badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-text leading-snug">
                          {a.headline || <span className="text-muted font-normal italic capitalize">{a.channel}</span>}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Date + canal */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-muted">
                          {new Date(a.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {a.channel && (
                          <span className="text-xs text-faint capitalize">· {a.channel}</span>
                        )}
                      </div>

                      {/* Regulation tags + actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {regs.map(reg => (
                          <span key={reg} className="text-xs px-1.5 py-0.5 rounded-md bg-page-bg border border-border text-muted">
                            {reg}
                          </span>
                        ))}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => setModalId(a.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Voir
                          </button>
                          <PDFButton analysisId={a.id} analysisSummary={a} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Sticky multi-select bar */}
      {someSelected && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between bg-primary text-white px-6 py-4 shadow-xl">
          <p className="text-sm font-semibold">
            {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Désélectionner tout
            </button>
            <button
              onClick={handleBulkExport}
              className="flex items-center gap-2 bg-white text-primary text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exporter en PDF consolidé
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
