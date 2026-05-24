import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import FLSeal from '../components/atoms/FLSeal'

export default function LoginPage() {
  const [mode, setMode]       = useState('login') // 'login' | 'register'
  const [email, setEmail]     = useState('')
  const [name, setName]       = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)

  const { login, register } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/')
      } else {
        await register(email, name, password)
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const field = { border: 0, borderBottom: '1px solid var(--stone-line)', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'var(--f-mono)', fontSize: 14, color: 'var(--ink)', padding: '10px 0', marginTop: 4 }
  const label = { fontFamily: 'var(--f-sans)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-mute)' }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--vellum)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--paper)',
        border: '1px solid var(--stone-line)',
        padding: '48px 44px 40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <FLSeal size={42} char="F" />
          <div style={{ fontFamily: 'var(--f-serif)', fontSize: 26, marginTop: 14, letterSpacing: '-0.01em' }}>
            {mode === 'login' ? 'Return to the scriptorium.' : <>Give away <span style={{ fontStyle: 'italic' }}>the key.</span></>}
          </div>
          <div style={{ fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
            {mode === 'login'
              ? 'The lock screen is waiting.'
              : 'You will not hold the unlock code. Your partner will.'}
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {mode === 'register' && (
            <label>
              <span style={label}>Your name</span>
              <input style={field} value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Ona Alabi" />
            </label>
          )}

          <label>
            <span style={label}>Email</span>
            <input style={field} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus={mode === 'login'} placeholder="you@example.com" />
          </label>

          <label>
            <span style={label}>Password</span>
            <input style={field} type="password" value={password} onChange={e => setPass(e.target.value)} required placeholder={mode === 'register' ? 'At least 8 characters' : '········'} />
          </label>

          {error && (
            <div style={{
              borderLeft: '2px solid var(--crimson)',
              paddingLeft: 12,
              fontFamily: 'var(--f-sans)',
              fontSize: 13,
              color: 'var(--crimson)',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="fl-btn"
            style={{ marginTop: 4, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'One moment…' : mode === 'login' ? 'Enter' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 28, textAlign: 'center', fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-mute)' }}>
          {mode === 'login' ? (
            <>No account?{' '}
              <button className="fl-btn--quiet" onClick={() => { setMode('register'); setError('') }} style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
                Begin here.
              </button>
            </>
          ) : (
            <>Already joined?{' '}
              <button className="fl-btn--quiet" onClick={() => { setMode('login'); setError('') }} style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
                Return.
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
