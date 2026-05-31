import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { api } from '../lib/api'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.settings.get(),
      api.unlock.history(),
    ]).then(([s, h]) => {
      setSettings(s)
      setHistory(h.history ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const unlocksToday = history.filter(h => {
    const d = new Date(h.requestedAt)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  const dailyMax = settings?.dailyUnlockMax ?? 5
  const domains  = settings?.domains ?? []
  const partner  = settings?.partner ?? null

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--f-sans)', color: 'var(--ink)' }}>

      {/* Nav */}
      <header style={{
        borderBottom: '1px solid var(--stone-line)',
        padding: '0 48px',
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--paper)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink)', marginRight: 40 }}>
          FocusLock
        </span>
        <NavItem label="Overview" active onClick={() => {}} />
        <NavItem label="Settings" onClick={() => navigate('/settings')} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
            {user?.name}
          </span>
          <button onClick={logout} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-mute)', padding: '20px 0',
          }}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 40 }}>
          <div className="fl-eyebrow" style={{ marginBottom: 8 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--f-serif)', fontWeight: 400, fontSize: 40, letterSpacing: '-0.02em' }}>
            Good {greeting()}, <span style={{ fontStyle: 'italic' }}>{user?.name?.split(' ')[0]}.</span>
          </h1>
        </div>

        {loading ? (
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-mute)' }}>Loading…</div>
        ) : (
          <>
            {/* Stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--stone-line)', border: '1px solid var(--stone-line)', marginBottom: 40 }}>
              <StatCard
                label="Unlocks today"
                value={`${unlocksToday} / ${dailyMax}`}
                note={unlocksToday >= dailyMax ? 'limit reached' : `${dailyMax - unlocksToday} remaining`}
                warn={unlocksToday >= dailyMax}
              />
              <StatCard
                label="Blocked domains"
                value={domains.length}
                note={domains.length === 0 ? 'none yet — add in settings' : domains.slice(0, 2).map(d => d.domain).join(', ') + (domains.length > 2 ? ` +${domains.length - 2}` : '')}
              />
              <StatCard
                label="Partner"
                value={partner ? partner.name : '—'}
                note={partner ? (partner.status === 'active' ? '● active' : '○ invitation pending') : 'not set — add in settings'}
                accent={partner?.status === 'active' ? 'var(--moss)' : null}
              />
            </div>

            {/* Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>

              {/* Blocked sites */}
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span className="fl-eyebrow">Blocked sites</span>
                  <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.1em', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    manage →
                  </button>
                </div>
                <div style={{ border: '1px solid var(--stone-line)' }}>
                  {domains.length === 0 ? (
                    <div style={{ padding: '14px 16px', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--navy)' }}>
                      No domains yet.
                    </div>
                  ) : domains.slice(0, 8).map((d, i) => (
                    <div key={d.id ?? i} style={{
                      padding: '10px 14px',
                      borderBottom: i < Math.min(domains.length, 8) - 1 ? '1px solid var(--stone-line)' : 0,
                      display: 'flex', alignItems: 'center', gap: 10,
                      fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)',
                    }}>
                      <span style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--ink)', color: 'var(--vellum)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {d.domain[0].toUpperCase()}
                      </span>
                      {d.domain}
                    </div>
                  ))}
                  {domains.length > 8 && (
                    <div style={{ padding: '10px 14px', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
                      +{domains.length - 8} more
                    </div>
                  )}
                </div>
              </section>

              {/* Recent activity */}
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span className="fl-eyebrow">Recent activity</span>
                </div>
                <div style={{ border: '1px solid var(--stone-line)' }}>
                  {history.length === 0 ? (
                    <div style={{ padding: '14px 16px', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--navy)' }}>
                      No unlocks yet.
                    </div>
                  ) : history.slice(0, 8).map((h, i) => (
                    <div key={h.id} style={{
                      padding: '10px 14px',
                      borderBottom: i < Math.min(history.length, 8) - 1 ? '1px solid var(--stone-line)' : 0,
                      display: 'grid', gridTemplateColumns: '1fr auto',
                      alignItems: 'center', gap: 8,
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink)' }}>{h.domain || '—'}</div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 2 }}>
                          {new Date(h.requestedAt).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: h.outcome === 'validated' ? 'var(--moss)' : 'var(--crimson)',
                      }}>
                        {h.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Settings CTA if nothing is set up */}
            {(domains.length === 0 || !partner) && (
              <div style={{
                marginTop: 40, padding: '24px 28px',
                border: '1px solid var(--stone-line)',
                background: 'var(--vellum)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-serif)', fontSize: 18 }}>
                    {!partner ? 'Your partner is not set.' : 'No domains are blocked yet.'}
                  </div>
                  <div style={{ fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
                    {!partner
                      ? 'Add an accountability partner in Settings — they will receive your OTP codes.'
                      : 'Add the sites you want to block in Settings.'}
                  </div>
                </div>
                <button onClick={() => navigate('/settings')} className="fl-btn" style={{ whiteSpace: 'nowrap' }}>
                  Go to Settings →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function NavItem({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '20px 18px',
      fontFamily: 'var(--f-sans)', fontSize: 13,
      color: active ? 'var(--ink)' : 'var(--ink-mute)',
      borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
      letterSpacing: '0.01em',
    }}>
      {label}
    </button>
  )
}

function StatCard({ label, value, note, warn, accent }) {
  return (
    <div style={{ padding: '20px 24px', background: '#fff' }}>
      <div style={{
        fontFamily: 'var(--f-sans)', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--navy)',
        marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--f-serif)', fontSize: 28, fontStyle: 'italic',
        color: warn ? 'var(--crimson)' : accent ?? 'var(--navy)',
      }}>
        {value}
      </div>
      {note && (
        <div style={{
          fontFamily: 'var(--f-mono)', fontSize: 11,
          color: warn ? 'var(--crimson)' : accent ?? 'var(--navy-2)',
          marginTop: 6, letterSpacing: '0.04em',
        }}>
          {note}
        </div>
      )}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
