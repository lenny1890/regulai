const SEVERITY_STYLES = {
  high:   { dot: 'bg-red-400',    label: 'text-red-400',    bg: 'border rounded-lg px-4 py-3 border-red-400' },
  medium: { dot: 'bg-amber-400',  label: 'text-amber-400',  bg: 'border rounded-lg px-4 py-3 border-amber-400' },
  low:    { dot: 'bg-green-400',  label: 'text-green-400',  bg: 'border rounded-lg px-4 py-3 border-green-400' },
}

export default function RiskList({ risks }) {
  if (!risks?.length) {
    return (
      <div className="flex items-center gap-2 text-brand-green text-sm">
        <span className="w-2 h-2 rounded-full bg-brand-green inline-block" />
        Aucun problème détecté
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {risks.map((risk, i) => {
        const s = SEVERITY_STYLES[risk.severity] || SEVERITY_STYLES.low
        return (
          <li key={i} className={s.bg}>
            <div className="flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
              <div>
                <p className="text-sm text-white">{risk.description}</p>
                <p className={`text-xs mt-0.5 ${s.label}`}>{risk.domain} · {risk.article}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
