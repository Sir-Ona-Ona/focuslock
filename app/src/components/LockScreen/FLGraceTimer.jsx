export default function FLGraceTimer({ until = '10:00' }) {
  const circumference = 2 * Math.PI * 36
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ position: 'relative', width: 76, height: 76 }}>
        <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--stone-line)" strokeWidth="2" />
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke="var(--bronze)"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.32}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 18, color: 'var(--ink)', lineHeight: 1 }}>
            {until}
          </span>
          <span style={{
            fontFamily: 'var(--f-sans)', fontSize: 8,
            letterSpacing: '0.22em', color: 'var(--ink-mute)', marginTop: 4,
          }}>LEFT</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="fl-eyebrow">Grace window</div>
        <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--ink)' }}>
          closes at 14:32
        </div>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
          new code already sent
        </div>
      </div>
    </div>
  )
}
