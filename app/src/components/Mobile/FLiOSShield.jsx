import FLLockup from '../atoms/FLLockup'
import FLIcon from '../atoms/FLIcon'
import FLGraceTimer from '../LockScreen/FLGraceTimer'

export default function FLiOSShield({ appName = 'Instagram', grace = false }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--vellum)',
      color: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--f-sans)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top brand */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FLLockup size={14} />
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 10,
            color: 'var(--ink-mute)', letterSpacing: '0.14em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--moss)' }} />
            screen time · linked
          </div>
        </div>
      </div>

      <hr className="fl-rule" style={{ margin: '18px 24px 0' }} />

      {/* Body */}
      <div style={{ flex: 1, padding: '32px 28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 18 }}>
        <div className="fl-eyebrow" style={{ textAlign: 'center' }}>
          {grace ? 'Grace · open · briefly' : 'The hour is not yet'}
        </div>

        {/* App tile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 74, height: 74,
            background: 'var(--paper)',
            border: '1px solid var(--stone-line)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 36, color: 'var(--ink)' }}>
              {appName[0]}
            </span>
            <div style={{
              position: 'absolute', bottom: -8, right: -8,
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--vellum)',
              border: '1px solid var(--stone-line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FLIcon name="lock" size={13} color="var(--ink)" />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {appName}
          </div>
        </div>

        <h1 style={{
          margin: 0,
          fontFamily: 'var(--f-serif)', fontWeight: 400,
          fontSize: 36, lineHeight: 1.05, letterSpacing: '-0.02em',
          textAlign: 'center',
        }}>
          {grace ? <>The door is <span style={{ fontStyle: 'italic' }}>open.</span></> : <>Sit with the <span style={{ fontStyle: 'italic' }}>urge.</span></>}
        </h1>

        {grace ? (
          <FLGraceTimer until="06:14" />
        ) : (
          <>
            <p style={{ margin: 0, fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, textAlign: 'center', padding: '0 18px' }}>
              A code was sent to Maryam. Ask for it — or close the app and let the hour pass.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <div className="fl-otp" style={{ gap: 6 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="d" style={{ width: 38, height: 50, fontSize: 22, borderBottom: i === 0 ? '2px solid var(--ink)' : '2px solid var(--ink-3)' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginTop: 4 }}>
              <span style={{
                fontFamily: 'var(--f-sans)', fontSize: 11,
                color: 'var(--ink-3)', textDecoration: 'underline',
                textUnderlineOffset: 3, textDecorationColor: 'var(--stone)',
                cursor: 'pointer',
              }}>request a new code</span>
            </div>
          </>
        )}
      </div>

      {/* Bottom info */}
      <div style={{
        margin: '0 24px 24px',
        padding: '14px 0 0',
        borderTop: '1px solid var(--stone-line)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <div>
          <div className="fl-eyebrow" style={{ marginBottom: 4 }}>Until</div>
          <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16 }}>19:00 today</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="fl-eyebrow" style={{ marginBottom: 4 }}>Today</div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--ink)' }}>2 / 5 unlocks</div>
        </div>
      </div>
    </div>
  )
}
