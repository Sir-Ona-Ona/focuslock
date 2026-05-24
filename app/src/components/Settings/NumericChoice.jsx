import { useState } from 'react'

export default function NumericChoice({ label, unit, choices, active: initialActive, onChange }) {
  const [active, setActive] = useState(initialActive)
  const pick = (c) => { setActive(c); onChange?.(c) }
  return (
    <div style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)' }}>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--stone-line)' }}>
        <div className="fl-eyebrow">{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--f-serif)', fontSize: 32, lineHeight: 1, fontStyle: 'italic' }}>{active}</span>
          {unit && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-mute)' }}>{unit}</span>}
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        {choices.map((c, idx) => (
          <div
            key={c}
            onClick={() => pick(c)}
            style={{
              flex: 1,
              padding: '12px 0',
              textAlign: 'center',
              fontFamily: 'var(--f-mono)',
              fontSize: 12,
              background: c === active ? 'var(--ink)' : 'transparent',
              color: c === active ? 'var(--vellum)' : 'var(--ink-3)',
              borderRight: idx < choices.length - 1 ? '1px solid var(--stone-line)' : 0,
              cursor: 'pointer',
              transition: 'all .15s var(--ease)',
              userSelect: 'none',
            }}
          >
            {c}{unit ? unit[0] : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
