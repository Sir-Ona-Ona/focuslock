import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import LockScreenPage from './pages/LockScreenPage'
import PopupPage from './pages/PopupPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'
import EmailPage from './pages/EmailPage'
import MobilePage from './pages/MobilePage'
import LoginPage from './pages/LoginPage'

const NAV = [
  { to: '/', label: 'I · Lock Screen' },
  { to: '/popup', label: 'II · Popup' },
  { to: '/settings', label: 'III · Settings' },
  { to: '/onboarding', label: 'IV · Onboarding' },
  { to: '/email', label: 'V · Email' },
  { to: '/mobile', label: 'VI · Mobile' },
]

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, logout } = useAuth()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {user && (
        <nav className="canvas-nav">
          <span style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--vellum)',
            marginRight: 16,
            letterSpacing: '-0.01em',
          }}>FocusLock</span>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => isActive ? 'active' : undefined}
            >
              {n.label}
            </NavLink>
          ))}
          <button
            onClick={logout}
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--stone)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            sign out
          </button>
        </nav>
      )}

      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={<Guard><LockScreenPage /></Guard>} />
          <Route path="/popup" element={<Guard><PopupPage /></Guard>} />
          <Route path="/settings" element={<Guard><SettingsPage /></Guard>} />
          <Route path="/onboarding" element={<Guard><OnboardingPage /></Guard>} />
          <Route path="/email" element={<Guard><EmailPage /></Guard>} />
          <Route path="/mobile" element={<Guard><MobilePage /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
