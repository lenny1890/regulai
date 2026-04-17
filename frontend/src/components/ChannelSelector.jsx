const CHANNELS = [
  { id: 'email',       label: 'Email' },
  { id: 'sms',         label: 'SMS' },
  { id: 'push',        label: 'Push' },
  { id: 'social',      label: 'Social' },
  { id: 'influenceur', label: 'Influenceur' },
]

export default function ChannelSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHANNELS.map(c => (
        <button key={c.id} type="button" onClick={() => onChange(c.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            value === c.id
              ? 'bg-brand-dark border-brand-cyan text-brand-cyan'
              : 'bg-brand-dark border-brand-border text-slate-400 hover:border-slate-500'
          }`}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
