import FLSettings from '../components/Settings/FLSettings'
import { useAuth } from '../lib/AuthContext'

export default function SettingsPage() {
  const { logout } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <FLSettings initialLocked={false} onSignOut={logout} />
    </div>
  )
}
