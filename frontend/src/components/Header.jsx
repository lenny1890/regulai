import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../api'

const NAV = [
  { path: '/',           label: 'Analyser' },
  { path: '/historique', label: 'Historique' },
  { path: '/dashboard',  label: 'Tableau de bord' },
  { path: '/pricing',    label: 'Tarifs' },
]

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="sticky top-0 z-20 border-b border-border"
      style={{
        background: 'oklch(1 0 0 / 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4"
        style={{ height: 52 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 28, height: 28,
              background: 'oklch(0.46 0.19 268)',
              borderRadius: 7,
            }}
          >
            <svg className="w-[15px] h-[15px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-sm font-extrabold text-text tracking-tight">RegulAI</span>
        </div>

        {/* Nav + logout */}
        <div className="flex items-center gap-0.5">
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV.map(({ path, label }) => {
              const active = pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-page-bg border border-border text-text'
                      : 'text-muted hover:text-text hover:bg-page-bg'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Mobile nav */}
          <nav className="flex sm:hidden items-center gap-0.5">
            {NAV.map(({ path, label }) => {
              const active = pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-page-bg border border-border text-text'
                      : 'text-muted hover:text-text hover:bg-page-bg'
                  }`}
                >
                  {label.charAt(0)}
                </Link>
              )
            })}
          </nav>

          <button
            onClick={handleLogout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="ml-1.5 p-2 rounded-lg text-muted hover:text-text hover:bg-page-bg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
