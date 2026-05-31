import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const [mode, setMode]     = useState('login')
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [password, setPass] = useState('')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--navy)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 26,
            marginBottom: 16,
          }}>F</div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--f-sans)', fontWeight: 700,
            fontSize: 24, color: 'var(--navy)', letterSpacing: '-0.02em',
          }}>
            FocusLock
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--navy-4)', lineHeight: 1.5 }}>
            {mode === 'login'
              ? 'Sign in to your account'
              : 'Create your account to get started'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--stone-line)',
          borderRadius: 8,
          padding: '36px 40px 32px',
          boxShadow: '0 1px 4px rgba(13,31,60,.06)',
        }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {mode === 'register' && (
              <Field label="Your name" type="text" value={name} onChange={setName} placeholder="Ona Alabi" autoFocus />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus={mode === 'login'} />
            <Field label="Password" type="password" value={password} onChange={setPass} placeholder={mode === 'register' ? 'At least 8 characters' : '········'} />

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--banner-danger)',
                border: '1px solid #FCA5A5',
                borderRadius: 4,
                fontSize: 13,
                color: 'var(--crimson)',
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 4,
                height: 44, width: '100%',
                background: busy ? 'var(--navy-4)' : 'var(--navy)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontFamily: 'var(--f-sans)',
                fontSize: 14,
                fontWeight: 600,
                cursor: busy ? 'default' : 'pointer',
                transition: 'background .15s',
              }}
            >
              {busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--navy-mute)' }}>
            {mode === 'login' ? (
              <>No account?{' '}
                <button onClick={() => { setMode('register'); setError('') }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--navy-3)', fontWeight: 600, fontSize: 13, padding: 0,
                }}>Create one</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError('') }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--navy-3)', fontWeight: 600, fontSize: 13, padding: 0,
                }}>Sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--navy-4)',
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoFocus={autoFocus}
        style={{
          border: '1px solid var(--stone-line)',
          borderRadius: 4,
          padding: '10px 12px',
          fontFamily: 'var(--f-mono)',
          fontSize: 14,
          color: 'var(--navy)',
          background: '#fff',
          outline: 'none',
          transition: 'border-color .15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--navy)'}
        onBlur={e => e.target.style.borderColor = 'var(--stone-line)'}
      />
    </div>
  )
}
