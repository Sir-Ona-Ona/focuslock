import { useState } from 'react'
import FLSettings from '../components/Settings/FLSettings'

export default function SettingsPage() {
  const [key, setKey] = useState(0)
  const [startLocked, setStartLocked] = useState(true)

  return (
    <div>
      <div style={{
        background: 'var(--paper)',
        borderBottom: '1px solid var(--stone-line)',
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.16em' }}>STATE</span>
        {['locked', 'unlocked'].map(s => (
          <button
            key={s}
            onClick={() => { setStartLocked(s === 'locked'); setKey(k => k + 1) }}
            style={{
              fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.1em',
              padding: '5px 12px', border: '1px solid',
              borderColor: (startLocked ? 'locked' : 'unlocked') === s ? 'var(--ink)' : 'var(--stone-line)',
              background: (startLocked ? 'locked' : 'unlocked') === s ? 'var(--ink)' : 'transparent',
              color: (startLocked ? 'locked' : 'unlocked') === s ? 'var(--vellum)' : 'var(--ink-mute)',
              cursor: 'pointer', transition: 'all .15s var(--ease)',
            }}
          >
            {s}
          </button>
        ))}
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
          {startLocked ? '· click "Demo: Break the seal" to unlock' : ''}
        </span>
      </div>
      <FLSettings key={key} initialLocked={startLocked} />
    </div>
  )
}
