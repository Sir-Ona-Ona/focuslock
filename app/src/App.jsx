import { Routes, Route, NavLink } from 'react-router-dom'
import LockScreenPage from './pages/LockScreenPage'
import PopupPage from './pages/PopupPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'
import EmailPage from './pages/EmailPage'
import MobilePage from './pages/MobilePage'

const NAV = [
  { to: '/', label: 'I · Lock Screen' },
  { to: '/popup', label: 'II · Popup' },
  { to: '/settings', label: 'III · Settings' },
  { to: '/onboarding', label: 'IV · Onboarding' },
  { to: '/email', label: 'V · Email' },
  { to: '/mobile', label: 'VI · Mobile' },
]

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      </nav>
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LockScreenPage />} />
          <Route path="/popup" element={<PopupPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/mobile" element={<MobilePage />} />
        </Routes>
      </div>
    </div>
  )
}
