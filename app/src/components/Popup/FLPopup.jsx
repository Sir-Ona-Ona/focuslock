import FLLockup from '../atoms/FLLockup'
import FLFavicon from '../atoms/FLFavicon'
import FLStat from '../atoms/FLStat'
import FLIcon from '../atoms/FLIcon'

export default function FLPopup({ inGrace = false, graceDomain = 'instagram.com', graceLeft = '6m 12s' }) {
  return (
    <div style={{
      width: 320,
      height: 460,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--vellum)',
      border: '1px solid var(--stone-line)',
      boxShadow: '0 18px 40px rgba(20,18,13,0.18)',
      fontFamily: 'var(--f-sans)',
      color: 'var(--ink)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid var(--stone-line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <FLLockup size={15} tagline="Scriptorium" />
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.1em' }}>
          14:22
        </span>
      </div>

      {/* Status */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--stone-line)' }}>
        <div className="fl-eyebrow" style={{ marginBottom: 8 }}>Status</div>
        {inGrace ? (
          <div>
            <div style={{ fontFamily: 'var(--f-serif)', fontSize: 21, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              Grace · <span style={{ fontStyle: 'italic' }}>{graceDomain}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bronze)' }} />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>{graceLeft} remaining</span>
            </div>
            <div className="fl-tick" style={{ marginTop: 12 }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <i key={i} style={{ background: i >= 12 ? 'var(--bronze)' : 'var(--stone-line)' }} />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: 'var(--f-serif)', fontSize: 22, lineHeight: 1.15 }}>
              Focus · <span style={{ fontStyle: 'italic' }}>in progress</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--moss)',
                boxShadow: '0 0 0 3px rgba(79,91,65,.15)',
              }} />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>
                09:00 — 19:00 · 4h 38m left
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{
        padding: '16px 18px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 14,
        borderBottom: '1px solid var(--stone-line)',
      }}>
        <FLStat value="47" label="Blocked" />
        <FLStat value="2" label="Unlocks" />
        <FLStat value="3h" label="Saved" accent />
      </div>

      {/* Watched today */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div className="fl-eyebrow" style={{ padding: '14px 18px 8px' }}>Watched today</div>
        {[
          ['instagram.com', '14 attempts'],
          ['x.com', '8 attempts'],
          ['reddit.com', '6 attempts'],
        ].map(([d, m]) => (
          <div key={d} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 18px',
            borderTop: '1px solid var(--stone-line)',
          }}>
            <FLFavicon char={d[0].toUpperCase()} size={18} />
            <span style={{ flex: 1, fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{d}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>{m}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid var(--stone-line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--paper)',
      }}>
        <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-mute)' }}>
          Settings · sealed
        </span>
        <button style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          color: 'var(--ink)',
          fontSize: 11,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--f-sans)',
        }}>
          Open settings
          <FLIcon name="arrow" size={12} />
        </button>
      </div>
    </div>
  )
}
