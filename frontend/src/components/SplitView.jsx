import { useState } from 'react'

export default function SplitView({ original, corrected }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(corrected)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original</p>
        <div className="bg-brand-navy border border-brand-border rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap min-h-24">
          {original}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-brand-green uppercase tracking-wider">Version corrigée</p>
          <button onClick={handleCopy}
            className="text-xs text-brand-cyan hover:text-white transition-colors">
            {copied ? '✓ Copié' : 'Copier'}
          </button>
        </div>
        <div className="bg-brand-navy border border-brand-border rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap min-h-24">
          {corrected}
        </div>
      </div>
    </div>
  )
}
