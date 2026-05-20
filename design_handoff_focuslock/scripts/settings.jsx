// Settings page — full browser tab. Two states: locked (OTP gate) and unlocked.

function FLSettings({ locked = false }) {
  return (
    <div className="fl-screen" style={{
      width: '100%', minHeight: '100%',
      background: 'var(--paper)',
      position: 'relative',
      filter: locked ? 'blur(0)' : 'none',
    }}>
      <FLRunningHead
        left={<>Liber Horarum · <span className="fl-mono" style={{ fontSize: 11 }}>cap. III — settings</span></>}
        center="FocusLock"
        right="wed · 11.iii.mmxxvi"
      />

      {/* Title block */}
      <div style={{ padding: '40px 64px 28px' }}>
        <div className="fl-eyebrow" style={{ marginBottom: 16 }}>Caput tertium</div>
        <h1 style={{
          margin: 0, padding: 0,
          fontFamily: 'var(--f-serif)',
          fontWeight: 400,
          fontSize: 52, lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}>
          The rule of the <span style={{ fontStyle: 'italic' }}>scriptorium.</span>
        </h1>
        <div style={{
          marginTop: 14, maxWidth: 540,
          fontFamily: 'var(--f-sans)', fontSize: 14, lineHeight: 1.55, color: 'var(--ink-3)',
        }}>
          What follows is your covenant with your partner. Every change here is sent to them in writing.
        </div>
      </div>

      <hr className="fl-rule" style={{ margin: '0 64px' }} />

      {/* Three-column body */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        padding: '36px 64px 64px',
        gap: 56,
        filter: locked ? 'blur(6px) saturate(0.6)' : 'none',
        opacity: locked ? 0.6 : 1,
        transition: 'all .3s var(--ease)',
        pointerEvents: locked ? 'none' : 'auto',
      }}>
        {/* Side TOC */}
        <nav style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['I','Domains','active'],
              ['II','Schedule'],
              ['III','Partner'],
              ['IV','Grace'],
              ['V','History'],
              ['VI','Danger'],
            ].map(([num, name, state], i) => (
              <li key={i} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr',
                gap: 10, alignItems: 'baseline',
                color: state ? 'var(--ink)' : 'var(--ink-mute)',
                cursor: 'pointer',
              }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>{num}.</span>
                <span style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: state ? 'italic' : 'normal',
                  fontSize: 16,
                  borderBottom: state ? '1px solid var(--ink)' : 'none',
                  display: 'inline-block', paddingBottom: 1,
                }}>{name}</span>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main columns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* I — Domains */}
          <section>
            <SectionHeading num="I" title="Domains" subtitle="The places you have asked not to go." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--stone-line)', background: 'var(--vellum)' }}>
              {DOMAINS.map((d, i) => (
                <div key={d.domain} style={{
                  display: 'grid', gridTemplateColumns: '28px 24px 1fr auto',
                  alignItems: 'center', gap: 10,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--stone-line)',
                  borderRight: i % 2 === 0 ? '1px solid var(--stone-line)' : 0,
                }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>{String(i+1).padStart(2,'0')}</span>
                  <FLFavicon char={d.domain[0].toUpperCase()} size={18} />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>{d.domain}</span>
                  <span style={{ fontFamily: 'var(--f-sans)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-mute)', textTransform: 'uppercase' }}>{d.cat}</span>
                </div>
              ))}
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: 'var(--paper)',
              }}>
                <FLIcon name="plus" size={14} color="var(--ink-mute)" />
                <span style={{ fontFamily: 'var(--f-sans)', fontSize: 12, color: 'var(--ink-mute)' }}>add another domain · type and press return</span>
              </div>
            </div>
          </section>

          {/* II — Schedule grid */}
          <section>
            <SectionHeading num="II" title="Schedule" subtitle="The hours when these places are forbidden." />
            <ScheduleGrid />
          </section>

          {/* III — Partner */}
          <section>
            <SectionHeading num="III" title="The partner" subtitle="The one who holds the seal." />
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              border: '1px solid var(--stone-line)',
              background: 'var(--vellum)',
            }}>
              <div style={{ padding: '20px 22px', borderRight: '1px solid var(--stone-line)' }}>
                <div className="fl-eyebrow" style={{ marginBottom: 10 }}>Name</div>
                <div style={{ fontFamily: 'var(--f-serif)', fontSize: 22, fontStyle: 'italic' }}>Maryam Okafor</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>maryam@okafor.studio</div>
              </div>
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="fl-eyebrow">Since</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--ink)' }}>vi · feb · mmxxvi</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>34 days · 18 unlocks issued</div>
              </div>
            </div>
            <FLMotto text="Changing the partner requires their consent and a 24-hour cooling period." />
          </section>

          {/* IV — Grace */}
          <section>
            <SectionHeading num="IV" title="Grace & limits" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <NumericChoice label="Grace window" unit="min" choices={[5, 10, 15, 30]} active={10} />
              <NumericChoice label="Daily unlocks" unit="" choices={[1, 3, 5, 7, 10]} active={5} />
            </div>
          </section>

          {/* V — History */}
          <section>
            <SectionHeading num="V" title="Recent unlocks" subtitle="The last seven days, copied from the registry." />
            <div style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)' }}>
              {HISTORY.map((h, i) => (
                <FLLedgerRow key={i} num={i+1} domain={h.domain} meta={h.meta} value={h.value} last={i === HISTORY.length - 1} />
              ))}
            </div>
          </section>

          {/* VI — Danger */}
          <section style={{ borderTop: '1px solid var(--crimson)', paddingTop: 26 }}>
            <SectionHeading num="VI" title="Disable" subtitle="Requires a code, twenty-four hours of waiting, and notice to your partner." />
            <button className="fl-btn fl-btn--ghost" style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)' }}>
              Begin the cooling period
            </button>
          </section>
        </div>
      </div>

      {locked && <FLOtpGate />}
    </div>
  );
}

const DOMAINS = [
  { domain: 'instagram.com', cat: 'social' },
  { domain: 'x.com', cat: 'social' },
  { domain: 'tiktok.com', cat: 'entertainment' },
  { domain: 'reddit.com', cat: 'forum' },
  { domain: 'youtube.com', cat: 'entertainment' },
  { domain: 'facebook.com', cat: 'social' },
  { domain: 'linkedin.com/feed', cat: 'feed only' },
  { domain: 'threads.net', cat: 'social' },
];

const HISTORY = [
  { domain: 'instagram.com', meta: 'wed 14:22 · 8m used of 10', value: 'validated' },
  { domain: 'x.com', meta: 'wed 11:08 · 10m used of 10', value: 'expired' },
  { domain: 'instagram.com', meta: 'tue 18:50 · denied (limit)', value: 'denied' },
  { domain: 'reddit.com', meta: 'tue 14:30 · 6m used of 10', value: 'validated' },
  { domain: 'youtube.com', meta: 'mon 16:14 · requested, unused', value: 'expired' },
];

function SectionHeading({ num, title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-mute)', letterSpacing: '0.1em' }}>{num}.</span>
        <h2 style={{ margin: 0, fontFamily: 'var(--f-serif)', fontWeight: 400, fontSize: 28, letterSpacing: '-0.01em' }}>{title}</h2>
      </div>
      {subtitle && (
        <div style={{
          fontFamily: 'var(--f-serif)', fontStyle: 'italic',
          fontSize: 14, color: 'var(--ink-mute)',
          marginTop: 6, paddingLeft: 26,
        }}>{subtitle}</div>
      )}
    </div>
  );
}

function NumericChoice({ label, unit, choices, active }) {
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
        {choices.map(c => (
          <div key={c} style={{
            flex: 1, padding: '12px 0',
            textAlign: 'center',
            fontFamily: 'var(--f-mono)', fontSize: 12,
            background: c === active ? 'var(--ink)' : 'transparent',
            color: c === active ? 'var(--vellum)' : 'var(--ink-3)',
            borderRight: '1px solid var(--stone-line)',
            cursor: 'pointer',
          }}>{c}{unit && unit[0]}</div>
        ))}
      </div>
    </div>
  );
}

function ScheduleGrid() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  // each row's schedule: array of 24 booleans (true = blocked)
  const sched = days.map((d, i) => {
    if (i < 5) return Array.from({ length: 24 }, (_, h) => h >= 9 && h < 19);
    if (i === 5) return Array.from({ length: 24 }, (_, h) => h >= 10 && h < 14);
    return Array.from({ length: 24 }, () => false);
  });
  return (
    <div style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)' }}>
      {/* Hour labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px repeat(24, 1fr)',
        padding: '6px 0 6px 0',
        borderBottom: '1px solid var(--stone-line)',
        background: 'var(--paper)',
      }}>
        <span />
        {Array.from({ length: 24 }).map((_, h) => (
          <span key={h} style={{
            fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--ink-mute)',
            textAlign: 'center', letterSpacing: '0.04em',
          }}>{h % 6 === 0 ? String(h).padStart(2, '0') : '·'}</span>
        ))}
      </div>
      {days.map((d, i) => (
        <div key={d} style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(24, 1fr)',
          borderBottom: i === 6 ? 0 : '1px solid var(--stone-line)',
          height: 30,
          alignItems: 'stretch',
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 14,
            fontFamily: 'var(--f-serif)', fontSize: 13,
            color: i > 4 ? 'var(--ink-mute)' : 'var(--ink)',
            fontStyle: i > 4 ? 'italic' : 'normal',
            borderRight: '1px solid var(--stone-line)',
          }}>{d}</span>
          {sched[i].map((on, h) => (
            <div key={h} style={{
              borderRight: h === 23 ? 0 : '1px solid var(--stone-line)',
              background: on ? 'var(--ink)' : 'transparent',
              position: 'relative',
            }}>
              {on && i === 2 && h === 14 && (
                <div style={{
                  position: 'absolute', top: '50%', left: '100%',
                  transform: 'translate(8px, -50%)',
                  fontFamily: 'var(--f-serif)', fontStyle: 'italic',
                  fontSize: 11, color: 'var(--bronze)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}>now ◂</div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// OTP gate overlay shown when settings are sealed
function FLOtpGate() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(244,239,227,0.42)',
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        width: 480,
        background: 'var(--vellum)',
        border: '1px solid var(--ink)',
        padding: '36px 40px',
        textAlign: 'center',
        boxShadow: '0 24px 60px rgba(20,18,13,0.18)',
        animation: 'fl-pop .3s var(--ease)',
      }}>
        <FLSeal size={42} char="F" />
        <div className="fl-eyebrow" style={{ marginTop: 18, marginBottom: 6 }}>Sealed by rule</div>
        <h2 style={{
          margin: 0, fontFamily: 'var(--f-serif)', fontWeight: 400, fontSize: 30, lineHeight: 1.15,
        }}>
          The rule is <span style={{ fontStyle: 'italic' }}>under seal.</span>
        </h2>
        <p style={{
          marginTop: 10, marginBottom: 26,
          fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55,
        }}>
          Enter a code from your partner to break the seal for this session.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <FLOtp value="" state="idle" />
        </div>
        <button className="fl-btn fl-btn--quiet">request a new code</button>
      </div>
    </div>
  );
}

Object.assign(window, { FLSettings, FLOtpGate, ScheduleGrid });
