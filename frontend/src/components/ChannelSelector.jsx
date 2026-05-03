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
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            value === c.id
              ? 'bg-brand-cyan border-brand-cyan text-white shadow-sm'
              : 'border-brand-border text-brand-text-secondary hover:border-slate-400 hover:text-brand-text bg-white'
          }`}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
