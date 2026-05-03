import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'
import { api } from '../api'
import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
import { computeWordDiff } from '../lib/diff'
import { generateReportPDF } from '../lib/generatePDF'
import Header from '../components/Header'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

const MAX_CHARS = 10000
const REG_TAGS = ['RGPD', 'CNIL', 'Code Conso.', 'ARPP', 'AMF']

const CHANNEL_TYPES = [
  { id: 'email',       label: 'Email' },
  { id: 'sms',         label: 'SMS' },
  { id: 'landing',     label: 'Landing page' },
  { id: 'publicite',   label: 'Publicité' },
  { id: 'social',      label: 'Social' },
  { id: 'influenceur', label: 'Influenceur' },
  { id: 'autre',       label: 'Autre' },
]

function detectChannel(text) {
  if (!text.trim()) return null
  const t = text.toLowerCase()
  if (text.length <= 160 && !text.includes('\n')) return 'sms'
  if (t.includes('objet :') || t.includes('objet:') || t.includes('désabonnement') || t.includes('désinscription') || t.includes('cordialement')) return 'email'
  if (text.length > 400 && (t.includes('téléchargez') || t.includes('inscrivez') || t.includes('essai gratuit') || t.includes('démo'))) return 'landing'
  if (t.includes('offre') || t.includes('% de réduction') || t.includes('gratuit') || t.includes('-')) return 'publicite'
  if ((t.match(/#\w/g) || []).length >= 2) return 'social'
  if (text.length < 300) return 'sms'
  return 'autre'
}

function getChannelLabel(id) {
  return CHANNEL_TYPES.find(c => c.id === id)?.label ?? 'Autre'
}

function sha256(text) {
  // Simple browser-compatible hash using SubtleCrypto
  return Array.from(text).reduce((acc, c) => {
    return ((acc << 5) - acc) + c.charCodeAt(0) | 0
  }, 0).toString(16).replace('-', 'f')
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }
  return text.trim()
}

function scoreMeta(score) {
  if (score >= 80) return {
    badge: 'VERT · CONFORME', title: 'Publication autorisée',
    subtitle: 'Ce texte respecte les réglementations applicables.',
    statusLabel: 'Publication autorisée', statusCls: 'bg-emerald-600 text-white',
    cardCls: 'bg-emerald-50 border-emerald-200',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-500',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  }
  if (score >= 50) return {
    badge: 'ORANGE · MODÉRÉ', title: 'Publication risquée',
    subtitle: "Ce texte présente des risques juridiques modérés. Utilisez la version corrigée pour réduire l'exposition.",
    statusLabel: 'Corrections recommandées', statusCls: 'bg-orange-500 text-white',
    cardCls: 'bg-orange-50 border-orange-200',
    badgeCls: 'bg-orange-100 text-orange-700',
    iconColor: 'text-orange-500',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  }
  return {
    badge: 'ROUGE · BLOQUÉ', title: 'Publication bloquée',
    subtitle: 'Ce texte présente des risques juridiques sérieux. Ne publiez pas sans corrections.',
    statusLabel: 'Publication bloquée', statusCls: 'bg-red-600 text-white',
    cardCls: 'bg-red-50 border-red-200',
    badgeCls: 'bg-red-100 text-red-700',
    iconColor: 'text-red-500',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  }
}

const DOMAIN_CLR = {
  'RGPD': 'bg-blue-100 text-blue-700',
  'CNIL': 'bg-sky-100 text-sky-700',
  'Code de la consommation': 'bg-violet-100 text-violet-700',
  'LCEN': 'bg-cyan-100 text-cyan-700',
  'ARPP': 'bg-amber-100 text-amber-700',
  'AMF': 'bg-rose-100 text-rose-700',
  'Réglementation UE': 'bg-indigo-100 text-indigo-700',
}
const domainCls = d => DOMAIN_CLR[d] || 'bg-slate-100 text-slate-600'

// ── Diff Viewer ────────────────────────────────────────────────────────────────
function DiffViewer({ original, corrected }) {
  const segments = computeWordDiff(original, corrected)
  return (
    <div className="text-sm leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-border">
      {segments.map((seg, i) => {
        if (seg.type === 'delete') return (
          <span key={i} className="bg-red-100 text-red-700 line-through">{seg.text}</span>
        )
        if (seg.type === 'insert') return (
          <span key={i} className="bg-emerald-100 text-emerald-700 underline">{seg.text}</span>
        )
        return <span key={i}>{seg.text}</span>
      })}
    </div>
  )
}

// ── Templates Modal ────────────────────────────────────────────────────────────
function TemplatesModal({ onClose, onSelect }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIndustry, setSelectedIndustry] = useState('Tous')

  useEffect(() => {
    api.getTemplates()
      .then(r => r.json())
      .then(d => { setTemplates(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const industries = ['Tous', ...new Set(templates.map(t => t.industry))]
  const filtered = selectedIndustry === 'Tous' ? templates : templates.filter(t => t.industry === selectedIndustry)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-text">Templates par industrie</h2>
            <p className="text-xs text-muted mt-0.5">Utilisez un exemple pour tester l'analyse</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-border flex gap-2 flex-wrap">
          {industries.map(ind => (
            <button key={ind} onClick={() => setSelectedIndustry(ind)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                selectedIndustry === ind
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-muted hover:text-text'
              }`}>
              {ind}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading && <p className="text-sm text-muted text-center py-8">Chargement...</p>}
          {!loading && filtered.map(t => (
            <div key={t.id} className="border border-border rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer group"
              onClick={() => { onSelect(t.template_text); onClose() }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_compliant ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {t.is_compliant ? 'Conforme' : 'Non-conforme'}
                    </span>
                  </div>
                  {t.description && <p className="text-xs text-muted">{t.description}</p>}
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{t.template_text}</p>
                </div>
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Utiliser →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Duplicate Modal ─────────────────────────────────────────────────────────────
function DuplicateModal({ duplicate, onClose, onAnalyseAnyway }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Analyse similaire détectée</h3>
            <p className="text-xs text-muted mt-1">
              Vous avez déjà analysé ce texte le{' '}
              {new Date(duplicate.created_at).toLocaleDateString('fr-FR')}{' '}
              — score : <span className="font-semibold text-text">{duplicate.score}/100</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={onAnalyseAnyway}
            className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Analyser quand même
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Channel icons ───────────────────────────────────────────────────────────────
const CHANNEL_ICONS = {
  email: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  sms: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  landing: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>,
  publicite: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>,
  social: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>,
  influenceur: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  autre: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
}

const CHANNEL_COLORS = {
  email:      { bg: 'oklch(0.93 0.05 268)', icon: 'oklch(0.46 0.19 268)' },
  sms:        { bg: 'oklch(0.93 0.05 295)', icon: 'oklch(0.42 0.18 295)' },
  landing:    { bg: 'oklch(0.93 0.05 220)', icon: 'oklch(0.42 0.18 220)' },
  publicite:  { bg: 'oklch(0.93 0.07 62)',  icon: 'oklch(0.50 0.18 62)'  },
  social:     { bg: 'oklch(0.93 0.05 148)', icon: 'oklch(0.44 0.16 148)' },
  influenceur:{ bg: 'oklch(0.93 0.05 12)',  icon: 'oklch(0.48 0.18 12)'  },
  autre:      { bg: 'oklch(0.93 0.01 268)', icon: 'oklch(0.50 0.01 268)' },
}

// ── Input View (Layout B — two-column split) ────────────────────────────────────
function InputView({ text, setText, channel, setChannel, onSubmit, loading, draftRestored, onDismissDraft, fileInputRef, onPdfImport, onShowTemplates }) {
  const [editorFocused, setEditorFocused] = useState(false)
  const detectedId = detectChannel(text)
  const effectiveChannel = channel ?? detectedId
  const selChannel = CHANNEL_TYPES.find(c => c.id === effectiveChannel)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {draftRestored && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span className="text-amber-800 font-medium">Brouillon restauré</span>
          </div>
          <button onClick={onDismissDraft} className="text-amber-600 hover:text-amber-800 text-xs underline">
            Ignorer
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left sidebar ── */}
        <div style={{ position: 'sticky', top: 72 }}>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Sidebar header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>Nouvelle analyse</p>
              <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>Choisissez le canal de communication</p>
            </div>

            {/* Channel list */}
            <div>
              {CHANNEL_TYPES.map((c, i) => {
                const sel = effectiveChannel === c.id
                const isAutoDetected = channel === null && detectedId === c.id
                const clr = CHANNEL_COLORS[c.id] || CHANNEL_COLORS.autre
                return (
                  <button key={c.id} onClick={() => setChannel(channel === c.id ? null : c.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 14px', border: 'none',
                      borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                      background: sel ? 'var(--color-primary-light)' : 'transparent',
                      cursor: 'pointer', transition: 'background 0.12s',
                      textAlign: 'left', fontFamily: 'inherit', position: 'relative',
                    }}>
                    {sel && (
                      <div style={{
                        position: 'absolute', left: 0, top: 6, bottom: 6,
                        width: 3, background: 'var(--color-primary)',
                        borderRadius: '0 3px 3px 0',
                      }} />
                    )}
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: sel ? 'var(--color-primary)' : clr.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.12s',
                    }}>
                      <span style={{ color: sel ? '#fff' : clr.icon, display: 'flex' }}>
                        {CHANNEL_ICONS[c.id]}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? 'var(--color-primary)' : 'var(--color-text)', flex: 1 }}>
                      {c.label}
                    </span>
                    {c.id === 'email' && (isAutoDetected || sel) && (
                      <span style={{ background: 'oklch(0.52 0.15 148)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>
                        Auto
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Regulations + privacy note */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-page-bg)' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Réglementations
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {REG_TAGS.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)', fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 10, lineHeight: 1.5 }}>
                Les PDF sont traités localement. Seul le texte extrait est envoyé pour analyse.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right editor ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Editor card */}
          <div
            onFocusCapture={() => setEditorFocused(true)}
            onBlurCapture={() => setEditorFocused(false)}
            style={{
              background: 'var(--color-surface)',
              border: `1.5px solid ${editorFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 12,
              overflow: 'hidden',
              transition: 'border-color 0.15s',
              boxShadow: editorFocused ? '0 0 0 3px oklch(0.46 0.19 268 / 0.08)' : 'none',
            }}>

            {/* Editor header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selChannel && (
                  <>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: CHANNEL_COLORS[selChannel.id]?.bg || CHANNEL_COLORS.autre.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: CHANNEL_COLORS[selChannel.id]?.icon || CHANNEL_COLORS.autre.icon, display: 'flex', transform: 'scale(0.75)' }}>
                        {CHANNEL_ICONS[selChannel.id]}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{selChannel.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>— communication commerciale</span>
                  </>
                )}
                {!selChannel && (
                  <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Sélectionnez un canal</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--color-border)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'inherit', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-page-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  PDF
                </button>
                <button type="button" onClick={onShowTemplates}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--color-border)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'inherit', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-page-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                  Templates
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onPdfImport} />
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit() }}
              placeholder={`Collez ici votre ${effectiveChannel ? getChannelLabel(effectiveChannel).toLowerCase() : 'texte commercial'}...`}
              style={{
                width: '100%', minHeight: 340, padding: '16px', border: 'none',
                outline: 'none', resize: 'vertical', fontSize: 14,
                color: 'var(--color-text)', background: 'transparent',
                lineHeight: 1.65, fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />

            {/* Bottom bar — reactive bg when text entered */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: text.length > 0 ? 'oklch(0.97 0.02 265)' : 'oklch(0.995 0.003 268)',
              borderTop: '1px solid var(--color-border)',
              transition: 'background 0.2s',
            }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                  {text.length.toLocaleString('fr-FR')} / {MAX_CHARS.toLocaleString('fr-FR')} car.
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-faint)', marginLeft: 10 }}>⌘↵ pour analyser</span>
              </div>
              <AnalyseButton onClick={onSubmit} disabled={loading || !text.trim()} loading={loading} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function AnalyseButton({ onClick, disabled, loading }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 20px', borderRadius: 8, border: 'none',
        background: disabled ? 'oklch(0.75 0.05 268)' : 'var(--color-primary)',
        color: '#fff', fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', transition: 'transform 0.1s, box-shadow 0.1s',
        transform: hovered && !disabled ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered && !disabled ? '0 4px 12px oklch(0.46 0.19 268 / 0.35)' : '0 1px 3px oklch(0.46 0.19 268 / 0.2)',
      }}>
      {loading ? (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/><path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Analyse...</>
      ) : (
        <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>Analyser</>
      )}
    </button>
  )
}


// ── Results View ───────────────────────────────────────────────────────────────
function ResultsView({ result, originalText, analysisId, onNewAnalysis }) {
  const [showModifications, setShowModifications] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [showRisks, setShowRisks] = useState(true)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [approving, setApproving] = useState(false)
  const meta = scoreMeta(result.score)

  const hasCorrected = result.corrected_text && result.corrected_version_possible !== false
  const isBlocked = result.corrected_version_possible === false

  async function handleApprove() {
    if (!analysisId) return
    setApproving(true)
    try {
      const res = await api.approveAnalysis(analysisId)
      if (res.ok) {
        setIsApproved(true)
        toast.success('Publication autorisée — analyse validée juridiquement')
      } else {
        toast.error('Impossible de valider : score insuffisant')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setApproving(false)
    }
  }

  function handleCopy(text, label) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copié`))
  }

  function handleDownloadPDF() {
    generateReportPDF(result, originalText)
    toast.success('Rapport PDF téléchargé')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-text">Résultat de l'analyse</h1>
        <button onClick={onNewAnalysis}
          className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text border border-border rounded-lg px-3 py-1.5 bg-surface hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nouvelle analyse
        </button>
      </div>

      {/* ── 1. BANDE SCORE (première priorité) ── */}
      <div className={`border rounded-xl ${meta.cardCls}`} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* Score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span className={`text-3xl font-black leading-none ${meta.iconColor}`}>{result.score}</span>
            <span className="text-xs font-semibold text-muted">/100</span>
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--color-border)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${meta.badgeCls}`}>{meta.badge}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg ${meta.statusCls}`}>{meta.statusLabel}</span>
          </div>
          <p className="text-xs text-muted mt-1">{result.headline || meta.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-border rounded-lg bg-surface text-text hover:bg-slate-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Rapport PDF
          </button>
        </div>
      </div>

      {/* ── 2. VERSION CORRIGÉE ── */}
      {hasCorrected && (
        <div style={{ border: '1.5px solid oklch(0.80 0.08 150)', borderRadius: 14, overflow: 'hidden', background: 'oklch(0.985 0.012 150)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid oklch(0.82 0.07 150)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'oklch(0.55 0.16 150)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'oklch(0.30 0.08 150)', margin: 0 }}>Version conforme — prête à envoyer</p>
                <p style={{ fontSize: 11, color: 'oklch(0.50 0.06 150)', margin: 0 }}>Toutes les corrections réglementaires ont été appliquées</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setShowDiff(v => !v)}
                style={{ fontSize: 11, fontWeight: 600, color: 'oklch(0.46 0.15 150)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', textDecoration: 'underline', textDecorationColor: 'oklch(0.70 0.10 150)' }}>
                {showDiff ? 'Texte final' : 'Voir les diff'}
              </button>
              {result.modifications?.length > 0 && (
                <button onClick={() => setShowModifications(v => !v)}
                  style={{ fontSize: 11, color: 'oklch(0.50 0.06 150)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showModifications ? '↑ Masquer' : '↓ Modifications'}
                </button>
              )}
            </div>
          </div>

          {/* Modifications list */}
          {showModifications && result.modifications?.length > 0 && (
            <div style={{ padding: '10px 18px', background: 'oklch(0.975 0.010 150)', borderBottom: '1px solid oklch(0.84 0.06 150)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'oklch(0.50 0.06 150)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Corrections appliquées :</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.modifications.map((m, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'oklch(0.35 0.06 150)' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="oklch(0.55 0.16 150)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Text */}
          <div style={{ padding: '16px 18px' }}>
            {showDiff ? (
              <DiffViewer original={originalText} corrected={result.corrected_text} />
            ) : (
              <p style={{ fontSize: 13, color: 'oklch(0.25 0.04 150)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, padding: '12px 14px', background: 'oklch(0.975 0.008 150)', borderRadius: 8, border: '1px solid oklch(0.84 0.06 150)' }}>
                {result.corrected_text}
              </p>
            )}
            {/* Copy CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <button onClick={() => handleCopy(result.corrected_text, 'Version conforme')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '8px 16px', background: 'oklch(0.55 0.16 150)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'opacity 0.1s' }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Copier la version conforme
              </button>
              {result.score >= 80 && !isApproved && (
                <button onClick={handleApprove} disabled={approving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '8px 14px', background: 'none', color: 'oklch(0.46 0.15 150)', border: '1.5px solid oklch(0.72 0.10 150)', borderRadius: 8, cursor: approving ? 'not-allowed' : 'pointer', opacity: approving ? 0.6 : 1 }}>
                  {approving ? '...' : 'Autoriser la publication'}
                </button>
              )}
              {isApproved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'oklch(0.46 0.15 150)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  Publication validée
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. NON-CONFORMITÉS (compactes, accordéon) ── */}
      {result.risks?.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <button onClick={() => setShowRisks(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
            <span className="text-sm font-semibold text-text">
              {result.risks.length} point{result.risks.length > 1 ? 's' : ''} de non-conformité
            </span>
            <svg className={`w-4 h-4 text-muted transition-transform ${showRisks ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          {showRisks && (
            <div className="border-t border-border divide-y divide-border">
              {result.risks.map((risk, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">{i + 1}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${domainCls(risk.domain)}`}>{risk.domain}</span>
                    <span className="text-sm font-medium text-text truncate">{risk.title || risk.description}</span>
                  </div>
                  {(risk.why || risk.sanction) && (
                    <div className="mt-2 ml-7 space-y-1.5">
                      {risk.why && <p className="text-xs text-muted leading-relaxed">{risk.why}</p>}
                      {risk.sanction && (
                        <p className="text-xs font-semibold text-text">{risk.sanction}
                          <span className="font-normal text-slate-400"> — plafond légal max.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3b. VERSION NON-FIXABLE ── */}
      {isBlocked && (
        <div className="bg-surface border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">Aucune version conforme possible</p>
              <p className="text-xs text-muted mt-0.5">Ces problèmes nécessitent des changements business, pas seulement rédactionnels.</p>
            </div>
          </div>
          {result.unfixable_reasons?.length > 0 && (
            <ul className="ml-9 space-y-1 mb-2">
              {result.unfixable_reasons.map((r, i) => (
                <li key={i} className="text-xs text-text flex gap-2"><span className="text-red-400 flex-shrink-0">•</span>{r}</li>
              ))}
            </ul>
          )}
          {result.business_level_changes_needed?.length > 0 && (
            <ul className="ml-9 space-y-1">
              {result.business_level_changes_needed.map((c, i) => (
                <li key={i} className="text-xs text-text flex gap-2"><span className="text-amber-500 flex-shrink-0">→</span>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── 4. ANALYSE DÉTAILLÉE (collapsed) ── */}
      {(result.recommendations?.length > 0 || result.sanctions?.length > 0) && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <button onClick={() => setShowDetailedAnalysis(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
            <span className="text-sm font-semibold text-text">Analyse détaillée (sanctions & recommandations)</span>
            <svg className={`w-4 h-4 text-muted transition-transform ${showDetailedAnalysis ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          {showDetailedAnalysis && (
            <div className="border-t border-border p-4 space-y-4">
              {result.sanctions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Sanctions applicables</p>
                  <div className="space-y-2">
                    {result.sanctions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded flex-shrink-0">{s.type}</span>
                        <div>
                          <p className="text-sm font-semibold text-text">{s.magnitude}</p>
                          <p className="text-xs text-muted mt-0.5">{s.legal_basis}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Recommandations</p>
                  <div className="space-y-2">
                    {result.recommendations
                      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))
                      .map((r, i) => {
                        const prioCls = r.priority === 'high' ? 'bg-red-100 text-red-700' : r.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        const prioLabel = r.priority === 'high' ? 'Prioritaire' : r.priority === 'medium' ? 'Recommandé' : 'Optionnel'
                        return (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 border border-border rounded-lg">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${prioCls}`}>{prioLabel}</span>
                            <div>
                              <p className="text-sm font-semibold text-text">{r.action}</p>
                              <p className="text-xs text-muted mt-0.5">{r.justification}</p>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <button onClick={onNewAnalysis}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 border border-border rounded-lg text-text hover:bg-slate-50 transition-colors bg-surface">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nouvelle analyse
        </button>
        <p className="text-xs text-slate-400">
          Analysé le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
        </p>
      </div>
    </div>
  )
}

// ── Analysis Progress ────────────────────────────────────────────────────────────
const ANALYSIS_STEPS = [
  { label: 'Réception et traitement du texte', duration: 600 },
  { label: 'Analyse RGPD et CNIL', duration: 4500 },
  { label: 'Vérification Code de la consommation & ARPP', duration: 4500 },
  { label: 'Génération du rapport de conformité', duration: null },
]

function AnalysisProgress() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    let t
    function advance(i) {
      const s = ANALYSIS_STEPS[i]
      if (!s || s.duration === null) return
      t = setTimeout(() => {
        setStep(i + 1)
        advance(i + 1)
      }, s.duration)
    }
    advance(0)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center gap-8">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4"/>
        <h2 className="text-lg font-bold text-text mb-1">Analyse en cours...</h2>
        <p className="text-sm text-muted">Vérification contre les réglementations françaises</p>
      </div>
      <div className="w-full space-y-2.5">
        {ANALYSIS_STEPS.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
            i < step
              ? 'bg-emerald-50 border-emerald-200'
              : i === step
              ? 'bg-blue-50 border-blue-200 shadow-sm'
              : 'bg-slate-50 border-border opacity-40'
          }`}>
            {i < step ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            ) : i === step ? (
              <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0"/>
            )}
            <span className={`text-sm font-medium ${
              i < step ? 'text-emerald-700' : i === step ? 'text-blue-700' : 'text-muted'
            }`}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────────
export default function Analyse() {
  // Lazy initialisers — loadDraft() s'exécute une seule fois au montage,
  // sans passer par un useEffect qui déclencherait un second render.
  const [text, setText] = useState(() => loadDraft()?.text ?? '')
  const [channel, setChannel] = useState(() => loadDraft()?.channel ?? null)
  const [result, setResult] = useState(null)
  const [analysisId, setAnalysisId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [draftRestored, setDraftRestored] = useState(() => !!loadDraft()?.text)
  const [showTemplates, setShowTemplates] = useState(false)
  const [duplicateData, setDuplicateData] = useState(null)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const fileInputRef = useRef(null)
  const draftTimerRef = useRef(null)

  // Auto-save draft with debounce
  const handleSetText = useCallback((val) => {
    setText(val)
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => saveDraft(val, channel), 1000)
  }, [channel])

  async function handlePdfImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const extracted = await extractPdfText(file)
      const pages = (await (() => {
        return pdfjsLib.getDocument({ data: file.arrayBuffer?.() ?? new ArrayBuffer(0) }).promise
          .then(p => p.numPages).catch(() => 1)
      })())
      handleSetText(extracted.slice(0, MAX_CHARS))
      toast.success(`PDF importé — ${pages} page${pages > 1 ? 's' : ''} extraite${pages > 1 ? 's' : ''}`)
    } catch {
      toast.error('Impossible de lire ce PDF — copiez-collez le texte directement.')
    }
    e.target.value = ''
  }

  async function submitAnalysis() {
    setLoading(true)
    setPendingSubmit(false)
    setDuplicateData(null)
    const effectiveChannel = channel ?? detectChannel(text) ?? 'autre'
    try {
      const res = await api.analyse(text, effectiveChannel)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'analyse")
        return
      }
      clearDraft()
      setResult(data)
      setAnalysisId(data.id ?? null)
      toast.success('Analyse terminée')
    } catch {
      toast.error('Erreur réseau — réessayez.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!text.trim()) { toast.error('Entrez un texte à analyser.'); return }

    // Check for duplicate
    const hash = sha256(text.trim())
    try {
      const res = await api.checkDuplicate(hash)
      if (res.ok) {
        const { duplicate } = await res.json()
        if (duplicate) {
          setDuplicateData(duplicate)
          setPendingSubmit(true)
          return
        }
      }
    } catch {
      // Duplicate check failed (réseau) — on soumet quand même
    }

    await submitAnalysis()
  }

  function handleNewAnalysis() {
    setResult(null)
    setAnalysisId(null)
    setText('')
    setChannel(null)
    setDraftRestored(false)
    clearDraft()
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <Header />
      <main>
        {result ? (
          <ResultsView result={result} originalText={text} analysisId={analysisId} onNewAnalysis={handleNewAnalysis} />
        ) : loading ? (
          <AnalysisProgress />
        ) : (
          <InputView
            text={text} setText={handleSetText}
            channel={channel} setChannel={setChannel}
            onSubmit={handleSubmit}
            loading={loading}
            draftRestored={draftRestored}
            onDismissDraft={() => { setDraftRestored(false); clearDraft() }}
            fileInputRef={fileInputRef}
            onPdfImport={handlePdfImport}
            onShowTemplates={() => setShowTemplates(true)}
          />
        )}
      </main>

      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onSelect={(tpl) => { handleSetText(tpl); toast.success('Template chargé') }}
        />
      )}

      {duplicateData && pendingSubmit && (
        <DuplicateModal
          duplicate={duplicateData}
          onClose={() => { setDuplicateData(null); setPendingSubmit(false) }}
          onAnalyseAnyway={submitAnalysis}
        />
      )}
    </div>
  )
}
