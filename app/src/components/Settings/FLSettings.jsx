import { useState } from 'react'
import FLRunningHead from '../atoms/FLRunningHead'
import FLFavicon from '../atoms/FLFavicon'
import FLLedgerRow from '../atoms/FLLedgerRow'
import FLMotto from '../atoms/FLMotto'
import FLIcon from '../atoms/FLIcon'
import SectionHeading from './SectionHeading'
import ScheduleGrid from './ScheduleGrid'
import NumericChoice from './NumericChoice'
import FLOtpGate from './FLOtpGate'

const DOMAINS = [
  { domain: 'instagram.com', cat: 'social' },
  { domain: 'x.com', cat: 'social' },
  { domain: 'tiktok.com', cat: 'entertainment' },
  { domain: 'reddit.com', cat: 'forum' },
  { domain: 'youtube.com', cat: 'entertainment' },
  { domain: 'facebook.com', cat: 'social' },
  { domain: 'linkedin.com/feed', cat: 'feed only' },
  { domain: 'threads.net', cat: 'social' },
]

const HISTORY = [
  { domain: 'instagram.com', meta: 'wed 14:22 · 8m used of 10', value: 'validated' },
  { domain: 'x.com', meta: 'wed 11:08 · 10m used of 10', value: 'expired' },
  { domain: 'instagram.com', meta: 'tue 18:50 · denied (limit)', value: 'denied' },
  { domain: 'reddit.com', meta: 'tue 14:30 · 6m used of 10', value: 'validated' },
  { domain: 'youtube.com', meta: 'mon 16:14 · requested, unused', value: 'expired' },
]

const TOC = [
  ['I', 'Domains'],
  ['II', 'Schedule'],
  ['III', 'Partner'],
  ['IV', 'Grace'],
  ['V', 'History'],
  ['VI', 'Danger'],
]

export default function FLSettings({ initialLocked = true }) {
  const [locked, setLocked] = useState(initialLocked)
  const [activeSection, setActiveSection] = useState('I')

  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      background: 'var(--paper)',
      position: 'relative',
      fontFamily: 'var(--f-sans)',
      color: 'var(--ink)',
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
          margin: 0,
          fontFamily: 'var(--f-serif)',
          fontWeight: 400,
          fontSize: 52,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}>
          The rule of the <span style={{ fontStyle: 'italic' }}>scriptorium.</span>
        </h1>
        <div style={{ marginTop: 14, maxWidth: 540, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-3)' }}>
          What follows is your covenant with your partner. Every change here is sent to them in writing.
        </div>
      </div>

      <hr className="fl-rule" style={{ margin: '0 64px' }} />

      {/* Two-column body */}
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
            {TOC.map(([num, name]) => (
              <li
                key={num}
                onClick={() => setActiveSection(num)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr',
                  gap: 10,
                  alignItems: 'baseline',
                  color: activeSection === num ? 'var(--ink)' : 'var(--ink-mute)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>{num}.</span>
                <span style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: activeSection === num ? 'italic' : 'normal',
                  fontSize: 16,
                  borderBottom: activeSection === num ? '1px solid var(--ink)' : 'none',
                  display: 'inline-block',
                  paddingBottom: 1,
                }}>{name}</span>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* I — Domains */}
          <section>
            <SectionHeading num="I" title="Domains" subtitle="The places you have asked not to go." />
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0,
              border: '1px solid var(--stone-line)',
              background: 'var(--vellum)',
            }}>
              {DOMAINS.map((d, i) => (
                <div key={d.domain} style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 24px 1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--stone-line)',
                  borderRight: i % 2 === 0 ? '1px solid var(--stone-line)' : 0,
                }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <FLFavicon char={d.domain[0].toUpperCase()} size={18} />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>{d.domain}</span>
                  <span style={{
                    fontFamily: 'var(--f-sans)',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-mute)',
                    textTransform: 'uppercase',
                  }}>{d.cat}</span>
                </div>
              ))}
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                background: 'var(--paper)',
              }}>
                <FLIcon name="plus" size={14} color="var(--ink-mute)" />
                <span style={{ fontFamily: 'var(--f-sans)', fontSize: 12, color: 'var(--ink-mute)' }}>
                  add another domain · type and press return
                </span>
              </div>
            </div>
          </section>

          {/* II — Schedule */}
          <section>
            <SectionHeading num="II" title="Schedule" subtitle="The hours when these places are forbidden." />
            <ScheduleGrid />
          </section>

          {/* III — Partner */}
          <section>
            <SectionHeading num="III" title="The partner" subtitle="The one who holds the seal." />
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              border: '1px solid var(--stone-line)',
              background: 'var(--vellum)',
            }}>
              <div style={{ padding: '20px 22px', borderRight: '1px solid var(--stone-line)' }}>
                <div className="fl-eyebrow" style={{ marginBottom: 10 }}>Name</div>
                <div style={{ fontFamily: 'var(--f-serif)', fontSize: 22, fontStyle: 'italic' }}>Maryam Okafor</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                  maryam@okafor.studio
                </div>
              </div>
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="fl-eyebrow">Since</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--ink)' }}>vi · feb · mmxxvi</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
                  34 days · 18 unlocks issued
                </div>
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
                <FLLedgerRow key={i} num={i + 1} domain={h.domain} meta={h.meta} value={h.value} last={i === HISTORY.length - 1} />
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
            <button className="fl-btn fl-btn--ghost" style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)' }}>
              Begin the cooling period
            </button>
          </section>
        </div>
      </div>

      {locked && <FLOtpGate onUnlock={() => setLocked(false)} />}
    </div>
  )
}
