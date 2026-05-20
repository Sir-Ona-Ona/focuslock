// Android — full-screen overlay block (when blocked app launches).

function FLAndroidOverlay({ appName = "TikTok" }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--vellum)',
      color: 'var(--ink)',
      fontFamily: 'var(--f-sans)',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '20px 24px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <FLLockup size={14} />
        <div style={{
          fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.14em',
          color: 'var(--ink-mute)', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <FLIcon name="shield" size={12} color="var(--moss)" />
          vpn · active
        </div>
      </div>

      <hr className="fl-rule" style={{ margin: '20px 24px 0' }} />

      <div style={{
        flex: 1, padding: '36px 28px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 18,
      }}>
        <div className="fl-eyebrow" style={{ textAlign: 'center' }}>You tried to open</div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'var(--paper)',
            border: '1px solid var(--stone-line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 32 }}>{appName[0]}</span>
            <div style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--ink)', color: 'var(--vellum)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FLIcon name="lock" size={12} color="var(--vellum)" />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{appName}</div>
        </div>

        <h1 style={{
          margin: '4px 0 0',
          fontFamily: 'var(--f-serif)', fontWeight: 400,
          fontSize: 30, lineHeight: 1.08, letterSpacing: '-0.02em',
          textAlign: 'center',
        }}>
          Not <span style={{ fontStyle: 'italic' }}>now.</span>
        </h1>

        <p style={{
          margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5,
          textAlign: 'center', padding: '0 14px',
        }}>
          Your code is with Maryam. The longer you wait, the less you'll want it.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <div className="fl-otp" style={{ gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="d" style={{
                width: 36, height: 48, fontSize: 22,
              }} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <span style={{
            fontFamily: 'var(--f-sans)', fontSize: 11,
            color: 'var(--ink-3)', textDecoration: 'underline',
            textUnderlineOffset: 3, textDecorationColor: 'var(--stone)',
          }}>request a new code</span>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{
        margin: '0 24px 18px',
        padding: '14px 0 0',
        borderTop: '1px solid var(--stone-line)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <div>
          <div className="fl-eyebrow" style={{ marginBottom: 4 }}>Until</div>
          <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 15 }}>19:00 today</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="fl-eyebrow" style={{ marginBottom: 4 }}>Today</div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13 }}>2 / 5</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FLAndroidOverlay });
