import { useState } from 'react'
import FLLockScreen from '../components/LockScreen/FLLockScreen'

const STATES = ['interactive', 'idle', 'validating', 'success', 'error', 'grace', 'ratelimited']

export default function LockScreenPage() {
  const [mode, setMode] = useState('interactive')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      {/* State switcher */}
      <div style={{
        background: 'var(--paper)',
        borderBottom: '1px solid var(--stone-line)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.16em', marginRight: 8 }}>STATE</span>
        {STATES.map(s => (
          <button
            key={s}
            onClick={() => setMode(s)}
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              padding: '5px 12px',
              border: '1px solid',
              borderColor: mode === s ? 'var(--ink)' : 'var(--stone-line)',
              background: mode === s ? 'var(--ink)' : 'transparent',
              color: mode === s ? 'var(--vellum)' : 'var(--ink-mute)',
              cursor: 'pointer',
              transition: 'all .15s var(--ease)',
            }}
          >
            {s}
          </button>
        ))}
        {mode === 'interactive' && (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--moss)', marginLeft: 8 }}>
            ↑ type digits · correct code is 482917
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FLLockScreen
          state={mode === 'interactive' ? undefined : mode}
          domain="instagram.com"
          domainLabel="Instagram"
        />
      </div>
    </div>
  )
}
