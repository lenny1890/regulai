export default function ScoreGauge({ score }) {
  const color  = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626'
  const label  = score >= 80 ? 'Conforme' : score >= 60 ? 'Risques modérés' : 'Risques élevés'
  const bgColor = score >= 80 ? '#D1FAE5' : score >= 60 ? '#FEF3C7' : '#FEE2E2'

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${(score / 100) * 99.9} 99.9`} strokeLinecap="round"
            className="transition-all duration-700" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold" style={{ color }}>
          {score}
        </span>
      </div>

      <div>
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2"
          style={{ color, backgroundColor: bgColor }}>
          {label}
        </span>
        <p className="text-sm text-slate-500">Score de conformité sur 100</p>
        <div className="mt-2 h-1.5 w-44 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  )
}
