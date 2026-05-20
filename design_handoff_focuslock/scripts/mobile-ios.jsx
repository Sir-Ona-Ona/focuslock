// iOS — shield screen (when blocked app launched) + settings + grace state.

function FLiOSShield({ appName = "Instagram", grace = false }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--vellum)',
      color: 'var(--ink)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--f-sans)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top brand & status */}
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
      <div style={{
        flex: 1, padding: '32px 28px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 18,
      }}>
        <div className="fl-eyebrow" style={{ textAlign: 'center' }}>
          {grace ? 'Grace · open · briefly' : 'The hour is not yet'}
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          {/* App tile placeholder */}
          <div style={{
            width: 74, height: 74,
            background: 'var(--paper)',
            border: '1px solid var(--stone-line)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <span style={{
              fontFamily: 'var(--f-serif)', fontStyle: 'italic',
              fontSize: 36, color: 'var(--ink)',
            }}>{appName[0]}</span>
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
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 11,
            color: 'var(--ink-mute)', letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}>{appName}</div>
        </div>

        <h1 style={{
          margin: 0,
          fontFamily: 'var(--f-serif)', fontWeight: 400,
          fontSize: 36, lineHeight: 1.05,
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}>
          {grace ? <>The door is <span style={{ fontStyle: 'italic' }}>open.</span></> : <>Sit with the <span style={{ fontStyle: 'italic' }}>urge.</span></>}
        </h1>

        {grace ? (
          <FLGraceTimer until="06:14" />
        ) : (
          <>
            <p style={{
              margin: 0, fontFamily: 'var(--f-sans)', fontSize: 13,
              color: 'var(--ink-3)', lineHeight: 1.5, textAlign: 'center',
              padding: '0 18px',
            }}>
              A code was sent to Maryam. Ask for it — or close the app and let the hour pass.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <div className="fl-otp" style={{ gap: 6 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="d" style={{
                    width: 38, height: 50, fontSize: 22,
                    borderBottom: i === 0 ? '2px solid var(--ink)' : '2px solid var(--ink-3)',
                  }} />
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'center', gap: 22,
              marginTop: 4,
            }}>
              <span style={{
                fontFamily: 'var(--f-sans)', fontSize: 11,
                color: 'var(--ink-3)', textDecoration: 'underline',
                textUnderlineOffset: 3, textDecorationColor: 'var(--stone)',
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
  );
}

// iOS app — main settings view
function FLiOSApp() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--paper)',
      color: 'var(--ink)',
      fontFamily: 'var(--f-sans)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 22px 0' }}>
        <FLLockup size={13} />
      </div>

      <div style={{ padding: '20px 22px 16px' }}>
        <div className="fl-eyebrow" style={{ marginBottom: 8 }}>Today · wed 11.iii</div>
        <div style={{
          fontFamily: 'var(--f-serif)', fontWeight: 400,
          fontSize: 32, lineHeight: 1.06, letterSpacing: '-0.02em',
        }}>
          You have kept <span style={{ fontStyle: 'italic' }}>3 hours, 14 minutes</span> for yourself.
        </div>
      </div>

      {/* Status card */}
      <div style={{
        margin: '0 22px',
        padding: '16px 18px',
        border: '1px solid var(--stone-line)',
        background: 'var(--vellum)',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
      }}>
        <FLStat value="47" label="Blocked" />
        <FLStat value="2" label="Asks" />
        <FLStat value="5" label="Daily" accent />
      </div>

      {/* List */}
      <div style={{ marginTop: 18, padding: '0 22px' }}>
        <div className="fl-eyebrow" style={{ marginBottom: 8 }}>The rule</div>
        <div style={{ background: 'var(--vellum)', border: '1px solid var(--stone-line)' }}>
          {[
            ['Domains','7'],
            ['Schedule','mon–fri · 09–19'],
            ['Partner','M. Okafor'],
            ['Grace','10 min'],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '13px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--stone-line)' : 0,
            }}>
              <span style={{ fontFamily: 'var(--f-serif)', fontSize: 15 }}>{k}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{v}</span>
                <FLIcon name="arrow" size={12} color="var(--ink-mute)" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Motto */}
      <div style={{ marginTop: 'auto', padding: '24px 22px 18px', textAlign: 'center' }}>
        <FLMotto text="“The work asks for your whole mind.”" />
      </div>
    </div>
  );
}

Object.assign(window, { FLiOSShield, FLiOSApp });
