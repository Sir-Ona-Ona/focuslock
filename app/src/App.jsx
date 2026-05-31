import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'
import LoginPage from './pages/LoginPage'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"      element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/"           element={<Guard><DashboardPage /></Guard>} />
      <Route path="/settings"   element={<Guard><SettingsPage /></Guard>} />
      <Route path="/onboarding" element={<Guard><OnboardingPage /></Guard>} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  )
}
