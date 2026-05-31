import { useState, useEffect, useRef } from 'react'
import FLRunningHead from '../atoms/FLRunningHead'
import FLFavicon from '../atoms/FLFavicon'
import FLLedgerRow from '../atoms/FLLedgerRow'
import FLMotto from '../atoms/FLMotto'
import FLIcon from '../atoms/FLIcon'
import SectionHeading from './SectionHeading'
import ScheduleGrid, { maskToSchedule, scheduleToMask } from './ScheduleGrid'
import NumericChoice from './NumericChoice'
import FLOtpGate from './FLOtpGate'
import { api } from '../../lib/api'
import { subscribe } from '../../lib/events'

const TOC = [
  ['I', 'Domains'],
  ['II', 'Schedule'],
  ['III', 'Partner'],
  ['IV', 'Grace'],
  ['V', 'History'],
  ['VI', 'Danger'],
]

// Tiny save-button component
function SaveBtn({ busy, saved, onClick, label = 'Save changes' }) {
  return (
    <button
      className="fl-btn"
      onClick={onClick}
      disabled={busy}
      style={{ marginTop: 14, fontSize: 12, opacity: busy ? 0.6 : 1 }}
    >
      {busy ? 'Saving…' : saved ? '✓ Saved' : label}
    </button>
  )
}

export default function FLSettings({ initialLocked = true, onSignOut }) {
  const [locked, setLocked]           = useState(initialLocked)
  const [activeSection, setActiveSection] = useState('I')
  const [settings, setSettings]       = useState(null)
  const [history, setHistory]         = useState([])

  // ── Domains state ───────────────────────────────────────────────────────────
  const [domList, setDomList]     = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [domBusy, setDomBusy]     = useState(false)
  const [domSaved, setDomSaved]   = useState(false)

  // ── Schedule state ──────────────────────────────────────────────────────────
  const scheduleRef = useRef(null) // stores current mask schedule from ScheduleGrid
  const [schedBusy, setSchedBusy] = useState(false)
  const [schedSaved, setSchedSaved] = useState(false)

  // ── Partner state ───────────────────────────────────────────────────────────
  const [partnerName, setPartnerName]   = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [partnerBusy, setPartnerBusy]   = useState(false)
  const [partnerSaved, setPartnerSaved] = useState(false)
  const [partnerErr, setPartnerErr]     = useState('')

  // ── Grace state ─────────────────────────────────────────────────────────────
  const [graceMin, setGraceMin]     = useState(10)
  const [dailyMax, setDailyMax]     = useState(5)
  const [graceBusy, setGraceBusy]   = useState(false)
  const [graceSaved, setGraceSaved] = useState(false)

  // ── Disable state ───────────────────────────────────────────────────────────
  const [disableBusy, setDisableBusy]     = useState(false)
  const [disableStatus, setDisableStatus] = useState(null) // 'requested' | 'confirmed' | null

  // Load data
  useEffect(() => {
    api.settings.get().then(data => {
      setSettings(data)
      setDomList(data.domains ?? [])
      setPartnerName(data.partner?.name ?? '')
      setPartnerEmail(data.partner?.email ?? '')
      setGraceMin(data.graceWindowMin ?? 10)
      setDailyMax(data.dailyUnlockMax ?? 5)
      if (data.schedule?.length) scheduleRef.current = data.schedule
    }).catch(() => {})
    api.unlock.history().then(r => setHistory(r.history ?? [])).catch(() => {})
  }, [])

  // Real-time disable sync via SSE
  useEffect(() => {
    const unsubReq = subscribe('disable_requested', () => {
      setDisableStatus('requested')
      // Refresh settings so confirmsAt timestamp is up to date
      api.settings.get().then(data => setSettings(data)).catch(() => {})
    })

    const unsubConf = subscribe('disable_confirmed', () => {
      setDisableStatus('confirmed')
      api.settings.get().then(data => setSettings(data)).catch(() => {})
    })

    return () => { unsubReq(); unsubConf() }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const addDomain = (e) => {
    if (e.key !== 'Enter' || !newDomain.trim()) return
    const d = newDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!domList.find(x => x.domain === d)) {
      setDomList(prev => [...prev, { id: Date.now().toString(), domain: d, category: '' }])
    }
    setNewDomain('')
    setDomSaved(false)
  }

  const removeDomain = (id) => {
    setDomList(prev => prev.filter(d => d.id !== id))
    setDomSaved(false)
  }

  const saveDomains = async () => {
    setDomBusy(true)
    try {
      await api.settings.domains(domList.map(d => ({ domain: d.domain, category: d.category })))
      setDomSaved(true)
      setTimeout(() => setDomSaved(false), 2000)
    } catch (err) { alert(err.message) }
    finally { setDomBusy(false) }
  }

  const saveSchedule = async () => {
    setSchedBusy(true)
    try {
      await api.settings.schedule(scheduleRef.current)
      setSchedSaved(true)
      setTimeout(() => setSchedSaved(false), 2000)
    } catch (err) { alert(err.message) }
    finally { setSchedBusy(false) }
  }

  const savePartner = async () => {
    setPartnerErr('')
    if (!partnerName.trim() || !partnerEmail.trim()) {
      setPartnerErr('Name and email are required'); return
    }
    setPartnerBusy(true)
    try {
      await api.settings.partner({ name: partnerName.trim(), email: partnerEmail.trim() })
      setPartnerSaved(true)
      setTimeout(() => setPartnerSaved(false), 2000)
      // Refresh partner status
      const data = await api.settings.get()
      setSettings(data)
    } catch (err) { setPartnerErr(err.message ?? 'Save failed') }
    finally { setPartnerBusy(false) }
  }

  const saveGrace = async () => {
    setGraceBusy(true)
    try {
      await api.settings.grace({ graceWindowMin: graceMin, dailyUnlockMax: dailyMax })
      setGraceSaved(true)
      setTimeout(() => setGraceSaved(false), 2000)
    } catch (err) { alert(err.message) }
    finally { setGraceBusy(false) }
  }

  const partner = settings?.partner ?? null

  const inputStyle = {
    border: 0, borderBottom: '1px solid var(--stone-line)', outline: 'none',
    background: 'transparent', width: '100%', padding: '8px 0',
    fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)',
  }

  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: 'var(--paper)', position: 'relative',
      fontFamily: 'var(--f-sans)', color: 'var(--ink)',
    }}>
      <FLRunningHead
        left={<>Liber Horarum · <span className="fl-mono" style={{ fontSize: 11 }}>cap. III — settings</span></>}
        center="FocusLock"
        right={
          <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {onSignOut && (
              <button onClick={onSignOut} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.14em',
                color: 'var(--ink-mute)', padding: 0, textTransform: 'uppercase',
              }}>
                sign out
              </button>
            )}
          </span>
        }
      />

      <div style={{ padding: '40px 64px 28px' }}>
        <div className="fl-eyebrow" style={{ marginBottom: 16 }}>Caput tertium</div>
        <h1 style={{ margin: 0, fontFamily: 'var(--f-serif)', fontWeight: 400, fontSize: 52, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          The rule of the <span style={{ fontStyle: 'italic' }}>scriptorium.</span>
        </h1>
        <div style={{ marginTop: 14, maxWidth: 540, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-3)' }}>
          What follows is your covenant with your partner. Every change here is sealed until you enter a code.
        </div>
      </div>

      <hr className="fl-rule" style={{ margin: '0 64px' }} />

      <div style={{
        display: 'grid', gridTemplateColumns: '180px 1fr',
        padding: '36px 64px 64px', gap: 56,
        filter: locked ? 'blur(6px) saturate(0.6)' : 'none',
        opacity: locked ? 0.6 : 1,
        transition: 'all .3s var(--ease)',
        pointerEvents: locked ? 'none' : 'auto',
      }}>
        {/* TOC */}
        <nav style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TOC.map(([num, name]) => (
              <li key={num} onClick={() => setActiveSection(num)} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10,
                alignItems: 'baseline', color: activeSection === num ? 'var(--ink)' : 'var(--ink-mute)', cursor: 'pointer',
              }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>{num}.</span>
                <span style={{
                  fontFamily: 'var(--f-serif)', fontStyle: activeSection === num ? 'italic' : 'normal',
                  fontSize: 16, borderBottom: activeSection === num ? '1px solid var(--ink)' : 'none',
                  display: 'inline-block', paddingBottom: 1,
                }}>{name}</span>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* I — Domains */}
          <section>
            <SectionHeading num="I" title="Domains" subtitle="The places you have asked not to go." />
            <div style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)' }}>
              {domList.length === 0 && (
                <div style={{ padding: '14px 16px', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-mute)', gridColumn: '1/-1' }}>
                  No domains yet.
                </div>
              )}
              {domList.map((d, i) => (
                <div key={d.id} style={{
                  display: 'grid', gridTemplateColumns: '28px 24px 1fr auto',
                  alignItems: 'center', gap: 10,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--stone-line)',
                }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <FLFavicon char={d.domain[0].toUpperCase()} size={18} />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>{d.domain}</span>
                  <button
                    onClick={() => removeDomain(d.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: 4 }}
                    title="Remove"
                  >
                    <FLIcon name="x" size={12} color="currentColor" />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--paper)' }}>
                <FLIcon name="plus" size={14} color="var(--ink-mute)" />
                <input
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  onKeyDown={addDomain}
                  placeholder="add a domain · press ↵"
                  style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--ink)' }}
                />
              </div>
            </div>
            <SaveBtn busy={domBusy} saved={domSaved} onClick={saveDomains} />
          </section>

          {/* II — Schedule */}
          <section>
            <SectionHeading num="II" title="Schedule" subtitle="The hours when these places are forbidden. Click or drag to toggle." />
            <ScheduleGrid
              value={settings?.schedule}
              onChange={s => { scheduleRef.current = s }}
            />
            <SaveBtn busy={schedBusy} saved={schedSaved} onClick={saveSchedule} />
          </section>

          {/* III — Partner */}
          <section>
            <SectionHeading num="III" title="The partner" subtitle="The one who holds the seal. Changing them sends a fresh invitation." />
            <div style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <label style={{ padding: '18px 22px', borderRight: '1px solid var(--stone-line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="fl-eyebrow">Name</span>
                  <input
                    value={partnerName}
                    onChange={e => { setPartnerName(e.target.value); setPartnerSaved(false) }}
                    placeholder="Maryam Okafor"
                    style={inputStyle}
                  />
                </label>
                <label style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="fl-eyebrow">Email</span>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={e => { setPartnerEmail(e.target.value); setPartnerSaved(false) }}
                    placeholder="maryam@example.com"
                    style={{ ...inputStyle, fontFamily: 'var(--f-mono)', fontStyle: 'normal', fontSize: 14 }}
                  />
                </label>
              </div>
              {partner && (
                <div style={{ padding: '10px 22px', borderTop: '1px solid var(--stone-line)', display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: partner.status === 'active' ? 'var(--moss)' : 'var(--bronze)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {partner.status === 'active' ? '● active' : '○ invitation pending'}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
                    {partner.codesIssued} codes issued
                  </span>
                </div>
              )}
            </div>
            {partnerErr && (
              <div style={{ marginTop: 8, fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--crimson)' }}>{partnerErr}</div>
            )}
            <SaveBtn busy={partnerBusy} saved={partnerSaved} onClick={savePartner} label="Save & send invitation" />
            <FLMotto text="Changing the partner requires their consent. A fresh invitation email is sent immediately." />
          </section>

          {/* IV — Grace */}
          <section>
            <SectionHeading num="IV" title="Grace & limits" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <NumericChoice label="Grace window" unit="min" choices={[5, 10, 15, 30]} active={graceMin} onChange={v => { setGraceMin(v); setGraceSaved(false) }} />
              <NumericChoice label="Daily unlocks" unit="" choices={[1, 3, 5, 7, 10]} active={dailyMax} onChange={v => { setDailyMax(v); setGraceSaved(false) }} />
            </div>
            <SaveBtn busy={graceBusy} saved={graceSaved} onClick={saveGrace} />
          </section>

          {/* V — History */}
          <section>
            <SectionHeading num="V" title="Recent unlocks" subtitle="The last ten entries, copied from the registry." />
            <div style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)' }}>
              {history.length === 0 && (
                <div style={{ padding: '16px', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-mute)' }}>No unlocks yet.</div>
              )}
              {history.slice(0, 10).map((h, i) => (
                <FLLedgerRow
                  key={h.id}
                  num={i + 1}
                  domain={h.domain}
                  meta={new Date(h.requestedAt).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  value={h.outcome}
                  last={i === Math.min(history.length, 10) - 1}
                />
              ))}
            </div>
          </section>

          {/* VI — Danger */}
          <section style={{ borderTop: '1px solid var(--crimson)', paddingTop: 26 }}>
            <SectionHeading
              num="VI"
              title="Disable"
              subtitle="Requires a code, twenty-four hours of waiting, and notice to your partner."
            />

            {/* Live SSE banner — disable_requested */}
            {disableStatus === 'requested' && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                border: '1px solid var(--bronze)',
                background: 'rgba(155,107,43,.07)',
                fontFamily: 'var(--f-mono)', fontSize: 12,
                color: 'var(--bronze)',
                letterSpacing: '0.04em',
              }}>
                ○ cooling period started — you can confirm after 24 hours
                {settings?.disableRequest?.confirmsAt && (
                  <> · {new Date(settings.disableRequest.confirmsAt).toLocaleString('en-GB')}</>
                )}
              </div>
            )}

            {/* Live SSE banner — disable_confirmed */}
            {disableStatus === 'confirmed' && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                border: '1px solid var(--crimson)',
                background: 'rgba(192,57,43,.07)',
                fontFamily: 'var(--f-mono)', fontSize: 12,
                color: 'var(--crimson)',
                letterSpacing: '0.04em',
              }}>
                ● FocusLock has been disabled — your partner confirmed the request
              </div>
            )}

            <button
              className="fl-btn fl-btn--ghost"
              style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)', opacity: disableBusy ? 0.6 : 1 }}
              disabled={disableBusy || disableStatus === 'requested' || disableStatus === 'confirmed'}
              onClick={async () => {
                if (!window.confirm('Start the 24-hour cooling period to disable FocusLock? Your partner will be notified.')) return
                setDisableBusy(true)
                try {
                  const r = await api.settings.disableRequest()
                  setDisableStatus('requested')
                  setSettings(prev => prev ? { ...prev, disableRequest: r } : prev)
                } catch (err) {
                  alert(err.message ?? 'Failed')
                } finally { setDisableBusy(false) }
              }}
            >
              {disableBusy ? 'Starting…'
                : disableStatus === 'requested' ? 'Cooling period in progress…'
                : disableStatus === 'confirmed' ? 'Disabled'
                : 'Begin the cooling period'}
            </button>
          </section>

        </div>
      </div>

      {locked && <FLOtpGate onUnlock={() => setLocked(false)} />}
    </div>
  )
}
