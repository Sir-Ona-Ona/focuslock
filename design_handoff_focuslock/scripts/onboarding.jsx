// Onboarding — 6 steps. Each rendered as a standalone screen.

function FLOnboardShell({ stepNum, totalSteps, title, kicker, children, primary, secondary }) {
  return (
    <div className="fl-screen" style={{
      width: '100%', height: '100%',
      background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      <FLRunningHead
        left={<>Liber Horarum · <span className="fl-mono" style={{ fontSize: 11 }}>cap. I — initiation</span></>}
        center="FocusLock"
        right={<>step {roman(stepNum)} of {roman(totalSteps)}</>}
      />

      {/* Progress dots */}
      <div style={{
        display: 'flex', gap: 4, padding: '14px 48px',
        borderBottom: '1px solid var(--stone-line)',
        alignItems: 'center',
      }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} style={{
            flex: 1, height: 2,
            background: i < stepNum ? 'var(--ink)' : 'var(--stone-line)',
          }} />
        ))}
      </div>

      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr',
        padding: '48px 64px 36px',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {kicker && <div className="fl-eyebrow">{kicker}</div>}
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--f-serif)', fontWeight: 400,
            fontSize: 46, lineHeight: 1.06, letterSpacing: '-0.02em',
          }}>{title}</h1>
          <div style={{ marginTop: 6 }}>{children}</div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        padding: '16px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--stone-line)',
        background: 'var(--vellum)',
      }}>
        <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-mute)' }}>
          {secondary || 'Or, leave with no harm done.'}
        </span>
        <button className="fl-btn">
          {primary || 'Continue'}
          <FLIcon name="arrow" size={14} color="currentColor" />
        </button>
      </div>
    </div>
  );
}

// Step 1 — cover
function FLOnboard1() {
  return (
    <FLOnboardShell stepNum={1} totalSteps={6} kicker="Initiation · I" title={<>
      You are about to <span style={{ fontStyle: 'italic' }}>give away the key.</span>
    </>} primary="I understand. Begin.">
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--ink-3)', maxWidth: 580, textWrap: 'pretty' }}>
        FocusLock sends every unlock code to another person. You will not have it. To enter Instagram or any other named place during your focus hours, you must ask them — by text, by call, in person.
      </p>
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--ink-3)', maxWidth: 580, marginTop: 4 }}>
        This is the whole product. There is no override, no emergency button, no clever workaround that we have not closed. <span className="fl-serif-it">If that frightens you, it is working.</span>
      </p>
      <div style={{
        marginTop: 26,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
        border: '1px solid var(--stone-line)', background: 'var(--vellum)',
      }}>
        {[
          ['I', 'Choose the places you will not go.'],
          ['II', 'Choose the hours when this is true.'],
          ['III', 'Choose the one who holds the key.'],
        ].map(([n, t], i) => (
          <div key={n} style={{
            padding: '22px 22px',
            borderRight: i < 2 ? '1px solid var(--stone-line)' : 0,
          }}>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--bronze)', letterSpacing: '0.16em', marginBottom: 12 }}>{n}.</div>
            <div style={{ fontFamily: 'var(--f-serif)', fontSize: 18, lineHeight: 1.3 }}>{t}</div>
          </div>
        ))}
      </div>
    </FLOnboardShell>
  );
}

// Step 2 — add blocked domains
function FLOnboard2() {
  return (
    <FLOnboardShell stepNum={2} totalSteps={6} kicker="Step ii · the places" title={<>
      Name the <span style={{ fontStyle: 'italic' }}>refuges</span> that have stopped being a rest.
    </>} primary="That's the list">
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 580 }}>
        We have set out a common list. Remove what is not yours. Add what is.
      </p>

      <div style={{
        marginTop: 12,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
        border: '1px solid var(--stone-line)', background: 'var(--vellum)',
      }}>
        {[
          { d: 'instagram.com', on: true },
          { d: 'x.com', on: true },
          { d: 'tiktok.com', on: true },
          { d: 'reddit.com', on: true },
          { d: 'youtube.com', on: true },
          { d: 'facebook.com', on: true },
          { d: 'linkedin.com/feed', on: true },
          { d: 'threads.net', on: false },
          { d: 'pinterest.com', on: false },
        ].map((it, i) => (
          <div key={it.d} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px',
            borderRight: (i + 1) % 3 ? '1px solid var(--stone-line)' : 0,
            borderBottom: i < 6 ? '1px solid var(--stone-line)' : 0,
            background: it.on ? 'var(--vellum)' : 'transparent',
            opacity: it.on ? 1 : 0.55,
          }}>
            <span style={{
              width: 16, height: 16,
              border: '1.5px solid var(--ink)',
              background: it.on ? 'var(--ink)' : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {it.on && <FLIcon name="check" size={10} color="var(--vellum)" />}
            </span>
            <FLFavicon char={it.d[0].toUpperCase()} size={18} />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>{it.d}</span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 14,
        padding: '14px 18px',
        background: 'var(--vellum)',
        border: '1px solid var(--stone-line)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <FLIcon name="plus" size={14} color="var(--ink-mute)" />
        <input placeholder="add a domain · e.g. nairaland.com" style={{
          flex: 1, background: 'transparent', border: 0, outline: 'none',
          fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--ink)',
        }} />
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.1em' }}>↵</span>
      </div>
    </FLOnboardShell>
  );
}

// Step 3 — schedule
function FLOnboard3() {
  return (
    <FLOnboardShell stepNum={3} totalSteps={6} kicker="Step iii · the hours" title={<>
      Set the hours when these places are <span style={{ fontStyle: 'italic' }}>forbidden.</span>
    </>} primary="Save the rule">
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 580 }}>
        Drag across the grid. A day left blank stays restricted for twenty-four hours — the safer default.
      </p>
      <ScheduleGrid />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 6, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: 'var(--ink)' }} />blocked
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: 'var(--vellum)', border: '1px solid var(--stone-line)' }} />open
        </span>
        <span style={{ marginLeft: 'auto' }}>timezone · africa/lagos (auto)</span>
      </div>
    </FLOnboardShell>
  );
}

// Step 4 — partner
function FLOnboard4() {
  return (
    <FLOnboardShell stepNum={4} totalSteps={6} kicker="Step iv · the keyholder" title={<>
      Choose the one who will <span style={{ fontStyle: 'italic' }}>hold the seal.</span>
    </>} primary="Send the request">
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 580 }}>
        They will receive every unlock code by email. They do not need to install anything. They will know each time you ask.
      </p>

      <div style={{
        marginTop: 14,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
        border: '1px solid var(--stone-line)', background: 'var(--vellum)',
      }}>
        <label style={{ padding: '18px 22px', borderRight: '1px solid var(--stone-line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="fl-eyebrow">Name</span>
          <input defaultValue="Maryam Okafor" style={{
            border: 0, outline: 'none', background: 'transparent',
            fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--ink)',
          }} />
        </label>
        <label style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="fl-eyebrow">Email</span>
          <input defaultValue="maryam@okafor.studio" style={{
            border: 0, outline: 'none', background: 'transparent',
            fontFamily: 'var(--f-mono)', fontSize: 15, color: 'var(--ink)',
          }} />
        </label>
      </div>

      <div style={{
        marginTop: 18,
        padding: '16px 20px',
        background: 'var(--paper)',
        borderLeft: '2px solid var(--bronze)',
        fontFamily: 'var(--f-serif)', fontStyle: 'italic',
        fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5,
        maxWidth: 640,
      }}>
        Choose someone who will not be cruel and will not be soft. The good keyholder asks why. Sometimes they say no. Sometimes they hand you the code in silence. <span style={{ fontStyle: 'normal', fontFamily: 'var(--f-sans)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginLeft: 8 }}>— from the rule</span>
      </div>
    </FLOnboardShell>
  );
}

// Step 5 — grace + limit
function FLOnboard5() {
  return (
    <FLOnboardShell stepNum={5} totalSteps={6} kicker="Step v · the allowances" title={<>
      How wide is the <span style={{ fontStyle: 'italic' }}>window?</span>
    </>} primary="That's enough">
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 600 }}>
        After a successful unlock, the door stays open for this long. Then it closes — and a new code is already with your partner.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 6 }}>
        <NumericChoice label="Grace window" unit="min" choices={[5, 10, 15, 30]} active={10} />
        <NumericChoice label="Daily unlocks" unit="" choices={[1, 3, 5, 7, 10]} active={5} />
      </div>
      <FLMotto text="A door that opens too easily is no door at all." />
    </FLOnboardShell>
  );
}

// Step 6 — covenant
function FLOnboard6() {
  return (
    <FLOnboardShell stepNum={6} totalSteps={6} kicker="Step vi · the covenant" title={<>
      The covenant is <span style={{ fontStyle: 'italic' }}>sealed.</span>
    </>} primary="Enter the scriptorium" secondary="This page is now read-only. Edits require a code.">
      <div style={{
        marginTop: 6,
        border: '1px solid var(--ink)',
        background: 'var(--vellum)',
        padding: '32px 36px 28px',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 32,
      }}>
        <div>
          <div className="fl-eyebrow" style={{ marginBottom: 18 }}>The covenant of ona alabi · xi march mmxxvi</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['I', <>I name <em style={{ fontStyle: 'italic' }}>seven places</em> as forbidden during my focus hours.</>],
              ['II', <>I will keep watch from <em style={{ fontStyle: 'italic' }}>9:00 to 19:00</em>, Monday through Friday; Saturday morning until early afternoon.</>],
              ['III', <>I name <em style={{ fontStyle: 'italic' }}>Maryam Okafor</em> as the holder of my key. They will receive every code I request.</>],
              ['IV', <>I may pass through the door <em style={{ fontStyle: 'italic' }}>five times a day</em>, and each pass lasts <em style={{ fontStyle: 'italic' }}>ten minutes</em>. Then it closes.</>],
              ['V', <>To undo any of this, I must wait twenty-four hours, ask my partner, and tell them so. There is no shorter path.</>],
            ].map(([n, t], i) => (
              <li key={n} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 14, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--bronze)', letterSpacing: '0.1em' }}>{n}.</span>
                <span style={{ fontFamily: 'var(--f-serif)', fontSize: 16, lineHeight: 1.5 }}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          paddingLeft: 32, borderLeft: '1px dashed var(--stone)',
        }}>
          <FLSeal size={68} char="F" />
          <div style={{ textAlign: 'center' }}>
            <div className="fl-eyebrow">Witnessed by</div>
            <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, marginTop: 6 }}>M. Okafor</div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 4 }}>email · sent · 11.iii 09:14</div>
          </div>
        </div>
      </div>
    </FLOnboardShell>
  );
}

Object.assign(window, {
  FLOnboard1, FLOnboard2, FLOnboard3, FLOnboard4, FLOnboard5, FLOnboard6,
});
