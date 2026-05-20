import FLRunningHead from '../atoms/FLRunningHead'
import FLIcon from '../atoms/FLIcon'

function roman(n) {
  const map = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]]
  let out = ''
  for (const [s, v] of map) while (n >= v) { out += s; n -= v }
  return out
}

export default function FLOnboardShell({ stepNum, totalSteps, title, kicker, children, primary, secondary, onNext }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--paper)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: 'var(--f-sans)',
      color: 'var(--ink)',
    }}>
      <FLRunningHead
        left={<>Liber Horarum · <span className="fl-mono" style={{ fontSize: 11 }}>cap. I — initiation</span></>}
        center="FocusLock"
        right={<>step {roman(stepNum)} of {roman(totalSteps)}</>}
      />

      {/* Progress bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '14px 48px',
        borderBottom: '1px solid var(--stone-line)',
        alignItems: 'center',
      }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} style={{
            flex: 1,
            height: 2,
            background: i < stepNum ? 'var(--ink)' : 'var(--stone-line)',
            transition: 'background .3s var(--ease)',
          }} />
        ))}
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        padding: '48px 64px 36px',
        overflow: 'auto',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {kicker && <div className="fl-eyebrow">{kicker}</div>}
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--f-serif)',
            fontWeight: 400,
            fontSize: 46,
            lineHeight: 1.06,
            letterSpacing: '-0.02em',
          }}>{title}</h1>
          <div style={{ marginTop: 6 }}>{children}</div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        padding: '16px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--stone-line)',
        background: 'var(--vellum)',
      }}>
        <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-mute)' }}>
          {secondary || 'Or, leave with no harm done.'}
        </span>
        <button className="fl-btn" onClick={onNext}>
          {primary || 'Continue'}
          <FLIcon name="arrow" size={14} color="currentColor" />
        </button>
      </div>
    </div>
  )
}
