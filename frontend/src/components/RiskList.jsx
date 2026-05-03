const SEVERITY = {
  high:   { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-600 border-red-100',   label: 'Critique' },
  medium: { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Modéré' },
  low:    { bar: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-600 border-blue-100',  label: 'Faible' },
}

export default function RiskList({ risks }) {
  if (!risks?.length) {
    return (
      <div className="flex items-center gap-2.5 text-emerald-600 text-sm py-1">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
        Aucun problème détecté — communication conforme
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {risks.map((risk, i) => {
        const s = SEVERITY[risk.severity] || SEVERITY.low
        return (
          <li key={i} className="flex gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${s.bar}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
                {risk.domain && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{risk.domain}</span>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{risk.description}</p>
              {risk.article && (
                <p className="text-xs text-slate-400 mt-1.5">{risk.article}</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
