import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const navy = '#1e3a5f'
const navyLight = '#2a4f7c'
const red = '#ef4444'
const accent = '#10b981'
const btnRadius = 40

function ScoreBadge({ score }) {
  const s = score ?? 72
  const label = s >= 85 ? 'Conforme' : s >= 60 ? 'Risque modéré' : 'Non conforme'
  const clr = s >= 85 ? accent : s >= 60 ? '#f59e0b' : red
  const bg = s >= 85 ? '#ecfdf5' : s >= 60 ? '#fffbeb' : '#fef2f2'
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (s / 100) * circ
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={clr} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray .6s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: clr }}>{s}</div>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: clr }}>{label}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Score de conformité</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: bg, color: clr, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{s}/100</div>
      </div>
    </div>
  )
}

function HeroMockup({ score }) {
  const violations = [
    'Absence de lien de désabonnement (RGPD Art. 7)',
    'Mention "gratuit" trompeuse (Code Conso L.121-4)',
    'Données collectées non déclarées CNIL',
  ]
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 24px 80px rgba(30,58,95,.10)', overflow: 'hidden', fontFamily: 'Inter,sans-serif', maxWidth: 540, width: '100%' }}>
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 6, height: 20, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>regulai.fr/analyse</span>
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ScoreBadge score={score} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#374151', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>⚠ Violations détectées (3)</div>
          {violations.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ color: red, fontWeight: 700, fontSize: 14, marginTop: -1 }}>✕</div>
              <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#166534', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: accent, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>✓</span>
            Version conforme générée
          </div>
          <div style={{ fontSize: 11, color: '#14532d', lineHeight: 1.6 }}>
            "… Vous pouvez vous désabonner à tout moment via ce lien. Conformément au RGPD, vos données sont traitées par [Société] et ne seront pas partagées avec des tiers…"
          </div>
          <button style={{ marginTop: 10, background: accent, color: '#fff', border: 'none', borderRadius: btnRadius, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            Copier la version corrigée →
          </button>
        </div>
      </div>
    </div>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: scrolled ? 'rgba(255,255,255,.96)' : 'rgba(255,255,255,.90)', backdropFilter: 'blur(12px)', borderBottom: scrolled ? '1px solid #e5e7eb' : '1px solid transparent', transition: 'all .25s ease' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: navy, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L3 5v4c0 3.5 2.5 6.7 6 7.5C12.5 15.7 15 12.5 15 9V5L9 2z" fill="none" stroke="white" strokeWidth="1.5" />
              <path d="M6.5 9l1.5 1.5L11.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: navy, letterSpacing: '-.02em' }}>Regul<span style={{ color: accent }}>AI</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {[{ label: 'Fonctionnalités', href: '#features' }, { label: 'Tarifs', href: '#pricing' }].map(l => (
            <a key={l.label} href={l.href} style={{ textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 500, transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = navy}
              onMouseLeave={e => e.target.style.color = '#374151'}>
              {l.label}
            </a>
          ))}
          <Link to="/login" style={{ textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 500 }}
            onMouseEnter={e => e.target.style.color = navy}
            onMouseLeave={e => e.target.style.color = '#374151'}>
            Se connecter
          </Link>
          <Link to="/register" style={{ textDecoration: 'none', background: navy, color: '#fff', fontSize: 14, fontWeight: 600, padding: '8px 18px', borderRadius: btnRadius, transition: 'background .15s' }}
            onMouseEnter={e => e.target.style.background = navyLight}
            onMouseLeave={e => e.target.style.background = navy}>
            Essayer gratuitement
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section style={{ paddingTop: 120, paddingBottom: 80, background: 'linear-gradient(160deg,#f8fafc 0%,#fff 60%)' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: navy, marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, display: 'inline-block', boxShadow: '0 0 0 3px #d1fae5' }} />
            Nouveau — Analyse ARPP & Code pénal incluse
          </div>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 800, color: navy, lineHeight: 1.08, letterSpacing: '-.03em', marginBottom: 20 }}>
            Vos communications,<br />
            <span style={{ color: accent }}>conformes en secondes.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.65, marginBottom: 32, maxWidth: 480 }}>
            RegulAI analyse vos emails, SMS, posts et publicités face au RGPD, à la CNIL et au Code de la consommation — et génère une version corrigée publiable immédiatement.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
            <Link to="/register" style={{ textDecoration: 'none', background: navy, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: btnRadius, boxShadow: '0 4px 20px rgba(30,58,95,.3)', display: 'inline-block' }}
              onMouseEnter={e => { e.currentTarget.style.background = navyLight; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = navy; e.currentTarget.style.transform = 'none' }}>
              Analyser gratuitement →
            </Link>
            <a href="#how" style={{ textDecoration: 'none', color: navy, fontWeight: 600, fontSize: 15, padding: '14px 20px', borderRadius: btnRadius, border: '1.5px solid #cbd5e1', display: 'inline-block' }}
              onMouseEnter={e => e.target.style.borderColor = navy}
              onMouseLeave={e => e.target.style.borderColor = '#cbd5e1'}>
              Voir comment ça marche
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex' }}>
              {['#1e3a5f', '#2a4f7c', '#10b981', '#0ea5e9'].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                  {['ML', 'SR', 'AD', 'PB'][i]}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              <strong style={{ color: navy }}>Déjà utilisé</strong> par des équipes marketing en France
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeroMockup score={75} />
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .hero-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  )
}

function Problems() {
  const cards = [
    { icon: '⚖', stat: '20M€', sub: 'ou 4% du CA', title: 'Une amende CNIL peut atteindre 20M€ ou 4% du CA', desc: "Depuis le RGPD, les sanctions explosent. L'ignorance de la loi n'est pas une excuse — même pour les PME." },
    { icon: '📣', stat: '0', sub: 'vérifications', title: 'Vos équipes publient sans vérification juridique systématique', desc: 'Le marketing publie vite. Le juridique intervient après. Résultat : des risques invisibles sur chaque campagne.' },
    { icon: '⏱', stat: '300€', sub: '/ heure', title: "Un avocat coûte 300€/h pour relire une newsletter", desc: "Externaliser la conformité est hors budget. Mais ne rien faire coûte bien plus cher en cas de contrôle CNIL." },
  ]
  return (
    <section id="problems" style={{ padding: '80px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Le problème</div>
          <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, color: navy, letterSpacing: '-.02em' }}>La conformité, un risque que vous portez seuls</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          {cards.map((c, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.04)', transition: 'box-shadow .2s, transform .2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(30,58,95,.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: .06 }}>{c.icon}</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: red }}>{c.stat}</span>
                <span style={{ fontSize: 14, color: '#9ca3af', marginLeft: 4 }}>{c.sub}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: navy, marginBottom: 10, lineHeight: 1.4 }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: 1, icon: '📋', label: 'Collez votre texte', desc: "Collez votre email, SMS, post social ou importez un PDF directement dans l'interface." },
    { n: 2, icon: '⚡', label: 'RegulAI analyse', desc: 'Notre IA croise votre texte avec 7 référentiels réglementaires en quelques secondes.' },
    { n: 3, icon: '📄', label: 'Récupérez la version corrigée', desc: 'Rapport PDF complet + version corrigée publiable, prêts à l\'emploi immédiatement.' },
  ]
  return (
    <section id="how" style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Comment ça marche</div>
          <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, color: navy, letterSpacing: '-.02em' }}>De la rédaction à la conformité en 3 étapes</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 0, position: 'relative' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 32px', position: 'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', top: 28, right: -8, width: 16, height: 2, background: 'linear-gradient(90deg,#e5e7eb,#10b981)', zIndex: 1 }} />
              )}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20, boxShadow: '0 8px 24px rgba(30,58,95,.25)', position: 'relative', zIndex: 2 }}>
                {s.icon}
                <div style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, background: accent, borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>{s.n}</div>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: navy, marginBottom: 10 }}>{s.label}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link to="/register" style={{ textDecoration: 'none', background: navy, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: btnRadius, boxShadow: '0 4px 20px rgba(30,58,95,.25)', display: 'inline-block' }}>
            Essayer maintenant — c'est gratuit →
          </Link>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const feats = [
    { icon: '🔍', title: 'Analyse RGPD / CNIL / Code Conso / ARPP', desc: 'Couverture complète des 7 référentiels réglementaires français et européens.' },
    { icon: '📊', title: 'Score de conformité 0–100', desc: 'Un score clair et actionnable pour mesurer le risque de chaque communication.' },
    { icon: '✅', title: 'Version corrigée publiable', desc: "La version conforme de votre texte, générée instantanément et prête à l'emploi." },
    { icon: '📑', title: 'Export PDF du rapport', desc: 'Un rapport complet avec détail de chaque violation, sa référence légale, et la correction.' },
    { icon: '🗂', title: 'Historique de toutes vos analyses', desc: 'Retrouvez n\'importe quelle analyse passée. Comparez les versions dans le temps.' },
    { icon: '🔁', title: 'Détection de doublons', desc: 'Évitez de réanalyser le même contenu deux fois — RegulAI vous alerte automatiquement.' },
  ]
  return (
    <section id="features" style={{ padding: '80px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Fonctionnalités</div>
          <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, color: navy, letterSpacing: '-.02em' }}>Tout ce dont votre équipe a besoin</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          {feats.map((f, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '24px 24px', border: '1px solid #e5e7eb', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'box-shadow .2s, transform .2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(30,58,95,.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ fontSize: 24, flexShrink: 0, width: 44, height: 44, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const plans = [
    { id: 'free', name: 'Gratuit', price: '0€', sub: 'Pour démarrer', features: ['5 analyses / mois', 'Analyse complète', 'Version corrigée', 'Export PDF'], cta: 'Commencer', featured: false },
    { id: 'starter', name: 'Starter', price: '39€', sub: '/mois', features: ['30 analyses / mois', 'Import PDF', 'Templates de rapports', 'Analytics avancés'], cta: 'Choisir Starter', featured: false },
    { id: 'business', name: 'Business', price: '89€', sub: '/mois', badge: 'Populaire', features: ['Analyses illimitées', 'Accès API', 'Historique illimité', 'Support dédié', '+tous les plans Starter'], cta: 'Choisir Business', featured: true },
    { id: 'agency', name: 'Agency', price: '199€', sub: '/mois', features: ['Multi-comptes', 'Rapports white-label', 'SLA garanti', 'Onboarding dédié', '+tous les plans Business'], cta: 'Nous contacter', featured: false },
  ]
  return (
    <section id="pricing" style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Tarifs</div>
          <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, color: navy, letterSpacing: '-.02em' }}>Simple, transparent, sans engagement</h2>
          <p style={{ fontSize: 15, color: '#6b7280', marginTop: 12 }}>Tous les plans incluent l'accès à RegulAI sans carte de crédit au départ.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 20 }}>
          {plans.map(p => (
            <div key={p.id} style={{ background: p.featured ? navy : '#fff', border: p.featured ? `2px solid ${accent}` : '1px solid #e5e7eb', borderRadius: 18, padding: '28px 24px', boxShadow: p.featured ? `0 16px 48px rgba(30,58,95,.25), 0 0 0 4px ${accent}22` : '0 2px 12px rgba(0,0,0,.04)', position: 'relative', transform: p.featured ? 'scale(1.03)' : 'none', transition: 'all .3s' }}>
              {p.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 20, letterSpacing: '.05em' }}>{p.badge}</div>
              )}
              <div style={{ fontWeight: 800, fontSize: 16, color: p.featured ? '#fff' : navy, marginBottom: 4 }}>{p.name}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: p.featured ? '#fff' : navy }}>{p.price}</span>
                <span style={{ fontSize: 14, color: p.featured ? '#94a3b8' : '#9ca3af', marginLeft: 4 }}>{p.sub}</span>
              </div>
              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: accent, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: p.featured ? '#cbd5e1' : '#4b5563', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/register" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', background: p.featured ? accent : 'transparent', color: p.featured ? '#fff' : navy, border: p.featured ? 'none' : `1.5px solid ${navy}`, fontWeight: 700, fontSize: 14, padding: '11px 0', borderRadius: btnRadius }}>{p.cta}</Link>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/register" style={{ textDecoration: 'none', background: navy, color: '#fff', fontWeight: 700, fontSize: 16, padding: '16px 40px', borderRadius: btnRadius, boxShadow: '0 4px 20px rgba(30,58,95,.25)', display: 'inline-block' }}>
            Commencer gratuitement
          </Link>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 12 }}>Sans carte de crédit · Résiliation à tout moment</div>
        </div>
      </div>
    </section>
  )
}

function Regulations() {
  const regs = ['RGPD', 'CNIL', 'Code de la consommation', 'ARPP', 'Réglementation UE', 'Code pénal (publicité mensongère)', 'ASIP Santé']
  const colors = [
    { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    { bg: '#fdf2f8', text: '#831843', border: '#fbcfe8' },
    { bg: '#f0f9ff', text: '#0c4a6e', border: '#bae6fd' },
    { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
    { bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0' },
  ]
  return (
    <section style={{ padding: '72px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Couverture réglementaire</div>
        <h2 style={{ fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 800, color: navy, letterSpacing: '-.02em', marginBottom: 40 }}>7 référentiels couverts</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {regs.map((r, i) => (
            <div key={i} style={{ background: colors[i].bg, color: colors[i].text, border: `1px solid ${colors[i].border}`, borderRadius: 20, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>{r}</div>
          ))}
        </div>
        <p style={{ marginTop: 28, fontSize: 13, color: '#9ca3af' }}>Mis à jour en continu par notre équipe juridique. Prochainement : DSA, DMA, AI Act.</p>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState(null)
  const faqs = [
    { q: 'RegulAI remplace-t-il un avocat ?', a: "Non. RegulAI est un outil d'aide à la conformité, pas un conseil juridique. Il vous permet de détecter et corriger les risques évidents dans vos communications. Pour des situations complexes ou des questions stratégiques, consultez un avocat spécialisé." },
    { q: 'Mes textes sont-ils stockés ?', a: "Vos textes sont analysés de manière sécurisée. En plan Gratuit et Starter, les textes sont traités sans être conservés. En plan Business et Agency, l'historique est stocké de façon chiffrée et accessible uniquement par votre équipe, conformément au RGPD." },
    { q: 'Quelles réglementations sont couvertes ?', a: "RegulAI couvre actuellement : RGPD, CNIL, Code de la consommation, ARPP, Réglementation UE, Code pénal (publicité mensongère) et ASIP Santé. Nous ajoutons régulièrement de nouveaux référentiels." },
    { q: 'Puis-je analyser des PDF ?', a: "Oui, à partir du plan Starter. Vous pouvez importer vos fichiers PDF directement — RegulAI extrait le texte et l'analyse comme n'importe quel autre contenu." },
    { q: 'Comment fonctionne la facturation ?', a: "Facturation mensuelle, sans engagement annuel. Vous pouvez changer de plan ou résilier à tout moment depuis votre espace client. Les paiements sont sécurisés par Stripe." },
  ]
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800, color: navy, letterSpacing: '-.02em' }}>Questions fréquentes</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: open === i ? '0 4px 20px rgba(30,58,95,.08)' : 'none' }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', textAlign: 'left', padding: '18px 20px', background: open === i ? '#f8fafc' : '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: navy }}>{f.q}</span>
                <span style={{ fontSize: 18, color: '#9ca3af', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform .25s', flexShrink: 0 }}>+</span>
              </button>
              <div style={{ maxHeight: open === i ? 300 : 0, overflow: 'hidden', transition: 'max-height .3s ease' }}>
                <div style={{ padding: '0 20px 18px', fontSize: 13, color: '#4b5563', lineHeight: 1.7 }}>{f.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section style={{ background: navy, padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>Commencez maintenant</div>
        <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 20 }}>
          Protégez vos communications<br />dès aujourd'hui
        </h2>
        <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 36, lineHeight: 1.6 }}>
          Rejoignez les équipes marketing françaises qui utilisent RegulAI pour publier en confiance — sans juriste, sans délai.
        </p>
        <Link to="/register" style={{ textDecoration: 'none', background: '#fff', color: navy, fontWeight: 800, fontSize: 16, padding: '16px 36px', borderRadius: btnRadius, boxShadow: '0 8px 32px rgba(0,0,0,.3)', display: 'inline-block' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none' }}>
          Commencer gratuitement — c'est gratuit
        </Link>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 16 }}>Sans engagement · 5 analyses offertes · Paiement sécurisé Stripe</div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ background: '#0f1e2e', padding: '40px 24px', color: '#64748b' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#1e3a5f', border: '1px solid #2a4f7c', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L3 5v4c0 3.5 2.5 6.7 6 7.5C12.5 15.7 15 12.5 15 9V5L9 2z" fill="none" stroke="white" strokeWidth="1.5" />
              <path d="M6.5 9l1.5 1.5L11.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, color: '#e2e8f0' }}>Regul<span style={{ color: accent }}>AI</span></span>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {['CGU', 'Politique de confidentialité', 'Contact'].map(l => (
            <a key={l} href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}
              onMouseEnter={e => e.target.style.color = '#e2e8f0'}
              onMouseLeave={e => e.target.style.color = '#64748b'}>
              {l}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ color: '#64748b' }}>Paiement sécurisé par Stripe</span>
        </div>
      </div>
      <div style={{ maxWidth: 1120, margin: '20px auto 0', paddingTop: 20, borderTop: '1px solid #1e2d3d', textAlign: 'center', fontSize: 12, color: '#374151' }}>
        © 2026 RegulAI. Tous droits réservés. RegulAI n'est pas un cabinet d'avocats et ne fournit pas de conseil juridique.
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <Nav />
      <Hero />
      <Problems />
      <HowItWorks />
      <Features />
      <Pricing />
      <Regulations />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
