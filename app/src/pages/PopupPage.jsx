import { useState } from 'react'
import FLPopup from '../components/Popup/FLPopup'

export default function PopupPage() {
  const [inGrace, setInGrace] = useState(false)

  return (
    <div className="canvas-section" style={{ alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <span className="canvas-label" style={{ margin: 0 }}>II · Extension Popup — 320×460</span>
        <button
          onClick={() => setInGrace(g => !g)}
          style={{
            fontFamily: 'var(--f-mono)', fontSize: 10, padding: '4px 12px',
            border: '1px solid var(--stone-line)', background: 'transparent',
            color: 'var(--ink-mute)', cursor: 'pointer',
          }}
        >
          toggle: {inGrace ? 'grace' : 'focus'}
        </button>
      </div>
      <FLPopup inGrace={inGrace} />
    </div>
  )
}
