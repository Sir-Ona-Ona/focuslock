// FocusLock — shared brand atoms

// ─────────────────────────────────────────────────────────
// Brand mark — circular bronze seal with serif "F"
// ─────────────────────────────────────────────────────────
function FLSeal({ size = 28, char = "F" }) {
  return (
    <span className="fl-seal" style={{
      width: size, height: size,
      fontSize: size * 0.55,
    }}>{char}</span>
  );
}

// Full wordmark lockup
function FLLockup({ size = 18, dark = false, tagline }) {
  const ink = dark ? '#FAF7EE' : 'var(--ink)';
  const mute = dark ? 'rgba(250,247,238,.55)' : 'var(--ink-mute)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <FLSeal size={size * 1.4} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
          fontFamily: 'var(--f-serif)',
          fontSize: size,
          letterSpacing: '-0.01em',
          color: ink,
          lineHeight: 1,
        }}>
          Focus<span style={{ fontStyle: 'italic' }}>Lock</span>
        </span>
        {tagline && (
          <span style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: mute, lineHeight: 1, marginTop: 3,
          }}>{tagline}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Page header used on lock screen / settings — has the
// running header band with manuscript-margin red rule.
// ─────────────────────────────────────────────────────────
function FLRunningHead({ left, center, right }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '20px 48px 18px',
      borderBottom: '1px solid var(--stone-line)',
      gap: 24,
    }}>
      <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-mute)' }}>{left}</div>
      <div style={{
        fontFamily: 'var(--f-sans)',
        fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase',
        color: 'var(--ink)',
      }}>{center}</div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-mute)', textAlign: 'right' }}>{right}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 6-digit OTP visual — non-interactive renderer.
// State: 'idle' | 'typing' | 'validating' | 'success' | 'error'
// ─────────────────────────────────────────────────────────
function FLOtp({ value = "", state = "idle" }) {
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  const focusedIdx = state === 'typing' ? Math.min(value.length, 5) : -1;
  const cls = ['fl-otp'];
  if (state === 'error') cls.push('error');
  if (state === 'success') cls.push('success');
  return (
    <div className={cls.join(' ')}>
      {digits.map((ch, i) => {
        const c = ['d'];
        if (ch.trim()) c.push('filled');
        if (i === focusedIdx) c.push('active');
        return (
          <div key={i} className={c.join(' ')}>
            {state === 'validating'
              ? <FLDot />
              : (ch.trim() || '')}
          </div>
        );
      })}
    </div>
  );
}

function FLDot() {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: 'var(--ink)', opacity: 0.4,
      animation: 'fl-pulse 1.2s ease-in-out infinite',
    }} />
  );
}

// ─────────────────────────────────────────────────────────
// Subdued favicon disk — initial letter on a stone disk
// ─────────────────────────────────────────────────────────
function FLFavicon({ char = 'I', size = 22, color = 'var(--ink-3)' }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--stone-soft)',
      color: color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--f-serif)',
      fontStyle: 'italic',
      fontSize: size * 0.55,
      flexShrink: 0,
    }}>{char}</span>
  );
}

// ─────────────────────────────────────────────────────────
// Catalog row — used in settings, popup, history.
// Looks like an entry in a scriptorium ledger.
// ─────────────────────────────────────────────────────────
function FLLedgerRow({ num, domain, meta, value, last = false }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 28px 1fr auto',
      alignItems: 'center',
      gap: 14,
      padding: '14px 24px',
      borderBottom: last ? 0 : '1px solid var(--stone-line)',
    }}>
      <span style={{
        fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)',
      }}>{String(num).padStart(2, '0')}</span>
      <FLFavicon char={(domain || '?')[0].toUpperCase()} />
      <div>
        <div style={{ fontSize: 14, color: 'var(--ink)' }}>{domain}</div>
        {meta && <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{meta}</div>}
      </div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Stat block — for popup
// ─────────────────────────────────────────────────────────
function FLStat({ value, label, accent = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontFamily: 'var(--f-serif)',
        fontSize: 28, lineHeight: 1,
        color: accent ? 'var(--bronze)' : 'var(--ink)',
        letterSpacing: '-0.01em',
      }}>{value}</div>
      <div style={{
        fontFamily: 'var(--f-sans)', fontSize: 10,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--ink-mute)',
      }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Small icon set — line icons, monastic style.
// ─────────────────────────────────────────────────────────
function FLIcon({ name, size = 16, color = 'currentColor' }) {
  const s = { width: size, height: size, color, flexShrink: 0 };
  const paths = {
    lock: <><rect x="4" y="9" width="12" height="9" rx="0" stroke={color} strokeWidth="1.4" fill="none" /><path d="M6.5 9V6a3.5 3.5 0 1 1 7 0v3" stroke={color} strokeWidth="1.4" fill="none" /></>,
    clock: <><circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.4" fill="none" /><path d="M10 5.5V10l3 2" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" /></>,
    seal: <><circle cx="10" cy="10" r="6" stroke={color} strokeWidth="1.4" fill="none" /><path d="M10 7v6m-3-3h6" stroke={color} strokeWidth="1.4" /></>,
    mail: <><rect x="3" y="5" width="14" height="10" stroke={color} strokeWidth="1.4" fill="none" /><path d="M3 6l7 5 7-5" stroke={color} strokeWidth="1.4" fill="none" /></>,
    arrow: <path d="M5 10h10m-4-4l4 4-4 4" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    check: <path d="M4 10.5l3.5 3.5L16 6" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    x: <path d="M5 5l10 10M15 5L5 15" stroke={color} strokeWidth="1.4" strokeLinecap="round" />,
    plus: <path d="M10 4v12M4 10h12" stroke={color} strokeWidth="1.4" strokeLinecap="round" />,
    eye: <><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke={color} strokeWidth="1.4" fill="none" /><circle cx="10" cy="10" r="2" stroke={color} strokeWidth="1.4" fill="none" /></>,
    person: <><circle cx="10" cy="7" r="3" stroke={color} strokeWidth="1.4" fill="none" /><path d="M3 17c1-3 4-5 7-5s6 2 7 5" stroke={color} strokeWidth="1.4" fill="none" /></>,
    warning: <path d="M10 3l8 14H2L10 3zM10 8v4m0 2v.5" stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round" />,
    shield: <path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z" stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round" />,
    calendar: <><rect x="3" y="5" width="14" height="12" stroke={color} strokeWidth="1.4" fill="none" /><path d="M3 9h14M7 3v4M13 3v4" stroke={color} strokeWidth="1.4" /></>,
    refresh: <path d="M16 7a7 7 0 1 0 1 5M16 4v3h-3" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    dot: <circle cx="10" cy="10" r="3" fill={color} />,
  };
  return <svg viewBox="0 0 20 20" style={s}>{paths[name]}</svg>;
}

// Tagged motto plate (small italic line in a margin)
function FLMotto({ text }) {
  return (
    <div style={{
      fontFamily: 'var(--f-serif)',
      fontStyle: 'italic',
      fontSize: 13,
      color: 'var(--ink-mute)',
      letterSpacing: '0.01em',
      lineHeight: 1.4,
    }}>{text}</div>
  );
}

// Section eyebrow (centered, with rules)
function FLSectionEyebrow({ children }) {
  return (
    <div className="fl-eyebrow fl-eyebrow-line" style={{ width: '100%' }}>
      <span style={{ flex: 'none' }}>{children}</span>
    </div>
  );
}

// Roman numeral helper
function roman(n) {
  const map = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]];
  let out = '';
  for (const [s, v] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

// keyframe injection (animations referenced from inline styles)
if (typeof document !== 'undefined' && !document.getElementById('fl-keyframes')) {
  const st = document.createElement('style');
  st.id = 'fl-keyframes';
  st.textContent = `
    @keyframes fl-pulse { 0%,100%{opacity:.25} 50%{opacity:.85} }
    @keyframes fl-fade-in { from{opacity:0; transform:translateY(4px)} to{opacity:1; transform:none} }
    @keyframes fl-flash-success {
      0%{background:var(--vellum)} 30%{background:#E7EDD9} 100%{background:var(--vellum)}
    }
    @keyframes fl-pop { 0%{transform:scale(.94); opacity:0} 100%{transform:scale(1); opacity:1} }
  `;
  document.head.appendChild(st);
}

Object.assign(window, {
  FLSeal, FLLockup, FLRunningHead, FLOtp, FLDot, FLFavicon,
  FLLedgerRow, FLStat, FLIcon, FLMotto, FLSectionEyebrow, roman,
});
