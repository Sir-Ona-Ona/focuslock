import { useState } from 'react'
import FLOnboardShell from './FLOnboardShell'
import FLSeal from '../atoms/FLSeal'
import FLFavicon from '../atoms/FLFavicon'
import FLIcon from '../atoms/FLIcon'
import FLMotto from '../atoms/FLMotto'
import ScheduleGrid from '../Settings/ScheduleGrid'
import NumericChoice from '../Settings/NumericChoice'

// ── Step 1 — Intro ────────────────────────────────────────────────────────────
export function FLOnboard1({ onNext }) {
  const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); await onNext().catch(() => {}); setBusy(false) }

  return (
    <FLOnboardShell
      stepNum={1} totalSteps={6}
      kicker="Initiation · I"
      title={<>You are about to <span style={{ fontStyle: 'italic' }}>give away the key.</span></>}
      primary={busy ? 'One moment…' : 'I understand. Begin.'}
      onNext={go}
    >
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--ink-3)', maxWidth: 580 }}>
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
  )
}

// ── Step 2 — Domains ─────────────────────────────────────────────────────────
export function FLOnboard2({ onNext }) {
  const [domains, setDomains] = useState([
    { d: 'instagram.com', on: true },
    { d: 'x.com', on: true },
    { d: 'tiktok.com', on: true },
    { d: 'reddit.com', on: true },
    { d: 'youtube.com', on: true },
    { d: 'facebook.com', on: true },
    { d: 'linkedin.com/feed', on: true },
    { d: 'threads.net', on: false },
    { d: 'pinterest.com', on: false },
  ])
  const [custom, setCustom] = useState('')
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')

  const toggle = (idx) => setDomains(ds => ds.map((d, i) => i === idx ? { ...d, on: !d.on } : d))

  const addCustom = (e) => {
    if (e.key !== 'Enter' || !custom.trim()) return
    const d = custom.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    setDomains(ds => [...ds, { d, on: true }])
    setCustom('')
  }

  const go = async () => {
    setBusy(true); setError('')
    try {
      await onNext(domains.filter(d => d.on).map(d => d.d))
    } catch (err) {
      setError(err.message ?? 'Save failed')
      setBusy(false)
    }
  }

  return (
    <FLOnboardShell
      stepNum={2} totalSteps={6}
      kicker="Step ii · the places"
      title={<>Name the <span style={{ fontStyle: 'italic' }}>refuges</span> that have stopped being a rest.</>}
      primary={busy ? 'Saving…' : "That's the list"}
      onNext={go}
    >
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 580 }}>
        We have set out a common list. Remove what is not yours. Add what is.
      </p>
      {error && <div style={{ color: 'var(--crimson)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>{error}</div>}
      <div style={{
        marginTop: 12,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
        border: '1px solid var(--stone-line)', background: 'var(--vellum)',
      }}>
        {domains.map((it, i) => (
          <div
            key={it.d}
            onClick={() => toggle(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 16px',
              borderRight: (i + 1) % 3 ? '1px solid var(--stone-line)' : 0,
              borderBottom: i < domains.length - (domains.length % 3 || 3) ? '1px solid var(--stone-line)' : 0,
              background: it.on ? 'var(--vellum)' : 'transparent',
              opacity: it.on ? 1 : 0.55,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{
              width: 16, height: 16,
              border: '1.5px solid var(--ink)',
              background: it.on ? 'var(--ink)' : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {it.on && <FLIcon name="check" size={10} color="var(--vellum)" />}
            </span>
            <FLFavicon char={it.d[0].toUpperCase()} size={18} />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>{it.d}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 14, padding: '14px 18px',
        background: 'var(--vellum)', border: '1px solid var(--stone-line)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <FLIcon name="plus" size={14} color="var(--ink-mute)" />
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={addCustom}
          placeholder="add a domain · e.g. nairaland.com · press ↵"
          style={{
            flex: 1, background: 'transparent', border: 0, outline: 'none',
            fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--ink)',
          }}
        />
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.1em' }}>↵</span>
      </div>
    </FLOnboardShell>
  )
}

// ── Step 3 — Schedule ─────────────────────────────────────────────────────────
export function FLOnboard3({ onNext }) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  // Default: Mon–Fri 9–19 blocked
  const defaultMask = Array.from({ length: 24 }, (_, h) => h >= 9 && h < 19)
  const defaultSchedule = [0,1,2,3,4].map(day => ({ day, hourMask: defaultMask }))

  const go = async () => {
    setBusy(true); setError('')
    try {
      await onNext(defaultSchedule)
    } catch (err) {
      setError(err.message ?? 'Save failed')
      setBusy(false)
    }
  }

  return (
    <FLOnboardShell
      stepNum={3} totalSteps={6}
      kicker="Step iii · the hours"
      title={<>Set the hours when these places are <span style={{ fontStyle: 'italic' }}>forbidden.</span></>}
      primary={busy ? 'Saving…' : 'Save the rule'}
      onNext={go}
    >
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 580 }}>
        A day left blank stays restricted for twenty-four hours — the safer default.
        You can edit this anytime from Settings.
      </p>
      {error && <div style={{ color: 'var(--crimson)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>{error}</div>}
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
  )
}

// ── Step 4 — Partner ──────────────────────────────────────────────────────────
export function FLOnboard4({ onNext }) {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  const go = async () => {
    if (!name.trim() || !email.trim()) { setError('Name and email are required'); return }
    setBusy(true); setError('')
    try {
      await onNext({ name: name.trim(), email: email.trim() })
    } catch (err) {
      setError(err.message ?? 'Save failed')
      setBusy(false)
    }
  }

  const inputStyle = {
    border: 0, outline: 'none', background: 'transparent', width: '100%',
    fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--ink)',
  }

  return (
    <FLOnboardShell
      stepNum={4} totalSteps={6}
      kicker="Step iv · the keyholder"
      title={<>Choose the one who will <span style={{ fontStyle: 'italic' }}>hold the seal.</span></>}
      primary={busy ? 'Sending invitation…' : 'Send the request'}
      onNext={go}
    >
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 580 }}>
        They will receive every unlock code by email. They do not need to install anything. They will know each time you ask.
      </p>
      {error && <div style={{ color: 'var(--crimson)', fontFamily: 'var(--f-mono)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{
        marginTop: 14,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
        border: '1px solid var(--stone-line)', background: 'var(--vellum)',
      }}>
        <label style={{ padding: '18px 22px', borderRight: '1px solid var(--stone-line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="fl-eyebrow">Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Maryam Okafor"
            style={inputStyle}
          />
        </label>
        <label style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="fl-eyebrow">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="maryam@example.com"
            style={{ ...inputStyle, fontFamily: 'var(--f-mono)', fontStyle: 'normal', fontSize: 15 }}
          />
        </label>
      </div>
      <div style={{
        marginTop: 18, padding: '16px 20px',
        background: 'var(--paper)', borderLeft: '2px solid var(--bronze)',
        fontFamily: 'var(--f-serif)', fontStyle: 'italic',
        fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 640,
      }}>
        Choose someone who will not be cruel and will not be soft. The good keyholder asks why. Sometimes they say no. Sometimes they hand you the code in silence.{' '}
        <span style={{ fontStyle: 'normal', fontFamily: 'var(--f-sans)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginLeft: 8 }}>
          — from the rule
        </span>
      </div>
    </FLOnboardShell>
  )
}

// ── Step 5 — Grace ────────────────────────────────────────────────────────────
export function FLOnboard5({ onNext }) {
  const [graceWindowMin, setGrace]  = useState(10)
  const [dailyUnlockMax, setDaily]  = useState(5)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState('')

  const go = async () => {
    setBusy(true); setError('')
    try {
      await onNext({ graceWindowMin, dailyUnlockMax })
    } catch (err) {
      setError(err.message ?? 'Save failed')
      setBusy(false)
    }
  }

  return (
    <FLOnboardShell
      stepNum={5} totalSteps={6}
      kicker="Step v · the allowances"
      title={<>How wide is the <span style={{ fontStyle: 'italic' }}>window?</span></>}
      primary={busy ? 'Saving…' : "That's enough"}
      onNext={go}
    >
      <p style={{ fontFamily: 'var(--f-sans)', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 600 }}>
        After a successful unlock, the door stays open for this long. Then it closes — and a new code is already with your partner.
      </p>
      {error && <div style={{ color: 'var(--crimson)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 6 }}>
        <NumericChoice label="Grace window" unit="min" choices={[5, 10, 15, 30]} active={graceWindowMin} onChange={setGrace} />
        <NumericChoice label="Daily unlocks" unit="" choices={[1, 3, 5, 7, 10]} active={dailyUnlockMax} onChange={setDaily} />
      </div>
      <FLMotto text="A door that opens too easily is no door at all." />
    </FLOnboardShell>
  )
}

// ── Step 6 — Covenant ─────────────────────────────────────────────────────────
export function FLOnboard6({ onNext }) {
  const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); await onNext().catch(() => {}); setBusy(false) }

  return (
    <FLOnboardShell
      stepNum={6} totalSteps={6}
      kicker="Step vi · the covenant"
      title={<>The covenant is <span style={{ fontStyle: 'italic' }}>sealed.</span></>}
      primary={busy ? 'One moment…' : 'Enter the scriptorium'}
      secondary="This page is now read-only. Edits require a code."
      onNext={go}
    >
      <div style={{
        marginTop: 6,
        border: '1px solid var(--ink)',
        background: 'var(--vellum)',
        padding: '32px 36px 28px',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 32,
      }}>
        <div>
          <div className="fl-eyebrow" style={{ marginBottom: 18 }}>Your covenant</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['I', <>Your named sites are blocked during your scheduled hours.</>],
              ['II', <>Your partner holds the key. They receive every code you request.</>],
              ['III', <>Each grace window closes automatically. A new code is already waiting.</>],
              ['IV', <>To undo any of this, you must wait twenty-four hours and tell your partner.</>],
              ['V', <>There is no override. There is no shorter path.</>],
            ].map(([n, t]) => (
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
            <div className="fl-eyebrow">Sealed</div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 6 }}>
              setup complete
            </div>
          </div>
        </div>
      </div>
    </FLOnboardShell>
  )
}
