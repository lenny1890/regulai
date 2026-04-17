export default function ScoreGauge({ score }) {
  const color = score >= 80 ? '#99e1c3' : score >= 60 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'Conforme' : score >= 60 ? 'Risques modérés' : 'Risques élevés'

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e3a4a" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
          {score}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        <p className="text-xs text-slate-400">Score de conformité</p>
      </div>
    </div>
  )
}
