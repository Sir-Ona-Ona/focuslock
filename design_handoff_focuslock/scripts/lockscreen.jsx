// Lock Screen — the centerpiece. Full-bleed page with all 6 states.
// Default state is interactive: type 6 digits → validate. 482917 = success.

const CORRECT_CODE = "482917";

function FLLockScreen({
  state: forcedState,
  domain = "instagram.com",
  domainLabel = "Instagram",
  restrictionEnd = "7:00 PM",
  timeLeft = "4h 38m",
  unlockNum = 2,
  unlockMax = 5,
  motto = "Deep work is rare and valuable.",
  graceUntil,
  date = "Wed · ii March mmxxvi",
  hour = "II",
}) {
  // Local state for interactive default
  const [val, setVal] = React.useState("");
  const [internalState, setInternalState] = React.useState("idle");
  const [requestPulse, setRequestPulse] = React.useState(false);

  const state = forcedState || internalState;
  const isInteractive = !forcedState;

  // Auto-validate when 6 chars typed
  React.useEffect(() => {
    if (!isInteractive) return;
    if (val.length === 6) {
      setInternalState("validating");
      const t = setTimeout(() => {
        if (val === CORRECT_CODE) {
          setInternalState("success");
        } else {
          setInternalState("error");
          setTimeout(() => { setVal(""); setInternalState("idle"); }, 1400);
        }
      }, 900);
      return () => clearTimeout(t);
    }
  }, [val, isInteractive]);

  // Reset success after delay
  React.useEffect(() => {
    if (state === "success" && isInteractive) {
      const t = setTimeout(() => { setVal(""); setInternalState("idle"); }, 2200);
      return () => clearTimeout(t);
    }
  }, [state, isInteractive]);

  const onKey = (e) => {
    if (!isInteractive || state === 'validating' || state === 'success') return;
    if (e.key === 'Backspace') setVal(v => v.slice(0, -1));
    else if (/^\d$/.test(e.key) && val.length < 6) setVal(v => v + e.key);
  };

  const requestCode = () => {
    setRequestPulse(true);
    setTimeout(() => setRequestPulse(false), 1400);
  };

  // Compose body content based on state
  const isGrace = state === 'grace';
  const isRate = state === 'ratelimited';

  return (
    <div
      className="fl-screen"
      tabIndex={0}
      onKeyDown={onKey}
      style={{
        width: '100%', height: '100%',
        background: 'var(--vellum)',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        outline: 'none',
        animation: state === 'success' ? 'fl-flash-success 1.4s var(--ease)' : undefined,
      }}>
      {/* Manuscript margin rule, far left */}
      <div className="fl-margin-rule" style={{ left: 64 }} />
      <div className="fl-margin-rule" style={{ right: 64, opacity: 0.18 }} />

      <FLRunningHead
        left={<span>Liber Horarum &nbsp; · &nbsp; <span style={{ fontStyle: 'normal', fontFamily: 'var(--f-mono)', fontSize: 11 }}>{date}</span></span>}
        center="FocusLock"
        right={<span>{hour} &nbsp; / &nbsp; XII</span>}
      />

      {/* Tampering / status strip — extension active heartbeat */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 48px',
        borderBottom: '1px solid var(--stone-line)',
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--moss)', boxShadow: '0 0 0 3px rgba(79,91,65,.18)' }} />
          extension · active · heartbeat 14m ago
        </span>
        <span>partner · m. okafor &nbsp;·&nbsp; restricted until {restrictionEnd}</span>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr',
        placeItems: 'center',
        padding: '40px 48px 32px',
        position: 'relative',
      }}>
        <div style={{
          width: '100%', maxWidth: 720,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 28,
        }}>
          {/* Eyebrow: canonical hour stamp */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <hr className="fl-rule" style={{ width: 48 }} />
            <FLSeal size={36} char="F" />
            <hr className="fl-rule" style={{ width: 48 }} />
          </div>

          <div className="fl-eyebrow" style={{ textAlign: 'center' }}>
            {isGrace ? 'Grace · in progress' : isRate ? 'Limit reached for this day' : 'The hour is not yet'}
          </div>

          {/* Big serif headline */}
          <div style={{
            fontFamily: 'var(--f-serif)',
            fontSize: 64,
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            color: 'var(--ink)',
            maxWidth: 640,
          }}>
            {state === 'success' && <>You may pass.<br/><span style={{ fontStyle: 'italic', color: 'var(--moss)' }}>Briefly.</span></>}
            {state === 'error' && <>That is not<br/><span style={{ fontStyle: 'italic', color: 'var(--crimson)' }}>the code.</span></>}
            {state === 'validating' && <><span style={{ fontStyle: 'italic' }}>Asking</span> the bell-ringer…</>}
            {isGrace && <><span style={{ fontStyle: 'italic' }}>Granted.</span> Return when finished.</>}
            {isRate && <>The well is dry.<br/><span style={{ fontStyle: 'italic' }}>Try tomorrow.</span></>}
            {state === 'idle' && <>Sit with the urge<br/>to visit <span style={{ fontStyle: 'italic' }}>{domainLabel}</span>.</>}
          </div>

          {/* Sub copy */}
          <div style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 15, lineHeight: 1.5,
            color: 'var(--ink-3)',
            textAlign: 'center',
            maxWidth: 480,
            textWrap: 'pretty',
          }}>
            {state === 'idle' && <>A one‑time code was sent to your accountability partner. <span className="fl-serif-it">Ask them for it</span> — or wait until the hour passes.</>}
            {state === 'validating' && <>Verifying the code against the seal in the registry.</>}
            {state === 'success' && <>A ten‑minute window opens for <span className="fl-mono">{domain}</span>. Then it closes.</>}
            {state === 'error' && <>The digits you entered do not match. The partner may have mistyped — no penalty. Ask again.</>}
            {isGrace && <>The window will close automatically. A new code is already with your partner.</>}
            {isRate && <>You have requested {unlockMax} of {unlockMax} unlocks today. The limit resets at midnight, local time.</>}
          </div>

          {/* OTP or grace timer */}
          <div style={{ marginTop: 8, minHeight: 64 }}>
            {isGrace ? (
              <FLGraceTimer until={graceUntil || '10:00'} />
            ) : isRate ? (
              <FLLockedOutGate />
            ) : (
              <FLOtp value={val} state={state === 'idle' && val.length > 0 ? 'typing' : state} />
            )}
          </div>

          {/* Tertiary actions row */}
          {!isGrace && !isRate && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 28,
              marginTop: 4,
            }}>
              <button
                onClick={requestCode}
                disabled={state !== 'idle'}
                style={{
                  background: 'transparent', border: 0, padding: 0, cursor: state === 'idle' ? 'pointer' : 'default',
                  fontFamily: 'var(--f-sans)', fontSize: 12,
                  color: 'var(--ink-3)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 4,
                  textDecorationColor: 'var(--stone)',
                  letterSpacing: '0.04em',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  opacity: state === 'idle' ? 1 : 0.4,
                }}>
                {requestPulse ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <FLIcon name="check" size={14} color="var(--moss)" />
                    sent to partner
                  </span>
                ) : 'Request a new code'}
              </button>
              <span style={{ width: 1, height: 14, background: 'var(--stone-line)' }} />
              <button
                onClick={() => setVal('')}
                disabled={!val}
                style={{
                  background: 'transparent', border: 0, padding: 0, cursor: val ? 'pointer' : 'default',
                  fontFamily: 'var(--f-sans)', fontSize: 12,
                  color: val ? 'var(--ink-3)' : 'var(--ink-mute)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 4,
                  textDecorationColor: 'var(--stone)',
                  letterSpacing: '0.04em',
                  opacity: val ? 1 : 0.5,
                }}>Clear</button>
            </div>
          )}
        </div>

        {/* Bottom ledger info pinned at the bottom */}
        <div style={{
          position: 'absolute', left: 48, right: 48, bottom: 28,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          alignItems: 'end',
          gap: 32,
          paddingTop: 18,
          borderTop: '1px solid var(--stone-line)',
        }}>
          <div>
            <div className="fl-eyebrow" style={{ marginBottom: 6 }}>Domain</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FLFavicon char={domain[0].toUpperCase()} size={18} />
              <span className="fl-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>{domain}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="fl-eyebrow" style={{ marginBottom: 8 }}>Time remaining</div>
            <div style={{
              fontFamily: 'var(--f-serif)', fontStyle: 'italic',
              fontSize: 22, color: 'var(--ink)', lineHeight: 1,
            }}>{timeLeft}</div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 4 }}>
              until {restrictionEnd}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="fl-eyebrow" style={{ marginBottom: 6 }}>Unlocks today</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              {Array.from({ length: unlockMax }).map((_, i) => (
                <span key={i} style={{
                  width: 14, height: 14,
                  borderRadius: '50%',
                  border: '1px solid var(--ink-3)',
                  background: i < unlockNum ? 'var(--ink)' : 'transparent',
                }} />
              ))}
              <span style={{ marginLeft: 8, fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                {unlockNum} / {unlockMax}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer motto */}
      <div style={{
        padding: '16px 48px 22px',
        textAlign: 'center',
        borderTop: '1px solid var(--stone-line)',
        fontFamily: 'var(--f-serif)', fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink-mute)',
      }}>
        “{motto}”
      </div>
    </div>
  );
}

// Grace timer — large clock face with concentric ring countdown
function FLGraceTimer({ until = '10:00' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 18,
    }}>
      <div style={{
        position: 'relative',
        width: 76, height: 76,
      }}>
        <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--stone-line)" strokeWidth="2" />
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--bronze)" strokeWidth="2"
            strokeDasharray={2 * Math.PI * 36}
            strokeDashoffset={2 * Math.PI * 36 * 0.32}
            strokeLinecap="butt" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 18, color: 'var(--ink)', lineHeight: 1 }}>{until}</span>
          <span style={{ fontFamily: 'var(--f-sans)', fontSize: 8, letterSpacing: '0.22em', color: 'var(--ink-mute)', marginTop: 4 }}>LEFT</span>
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
  );
}

function FLLockedOutGate() {
  return (
    <div style={{
      padding: '14px 22px',
      border: '1px solid var(--crimson)',
      borderLeft: '3px solid var(--crimson)',
      background: 'rgba(122,46,38,0.04)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <FLIcon name="warning" size={20} color="var(--crimson)" />
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>No codes will be issued</div>
        <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2, fontFamily: 'var(--f-mono)' }}>
          resets · 00:00 local · in 7h 12m
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FLLockScreen, FLGraceTimer, FLLockedOutGate });
