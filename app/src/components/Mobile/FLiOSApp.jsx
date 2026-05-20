import FLLockup from '../atoms/FLLockup'
import FLStat from '../atoms/FLStat'
import FLIcon from '../atoms/FLIcon'
import FLMotto from '../atoms/FLMotto'

export default function FLiOSApp() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--paper)',
      color: 'var(--ink)',
      fontFamily: 'var(--f-sans)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 22px 0' }}>
        <FLLockup size={13} />
      </div>

      <div style={{ padding: '20px 22px 16px' }}>
        <div className="fl-eyebrow" style={{ marginBottom: 8 }}>Today · wed 11.iii</div>
        <div style={{ fontFamily: 'var(--f-serif)', fontWeight: 400, fontSize: 32, lineHeight: 1.06, letterSpacing: '-0.02em' }}>
          You have kept <span style={{ fontStyle: 'italic' }}>3 hours, 14 minutes</span> for yourself.
        </div>
      </div>

      {/* Stats */}
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

      {/* Rule list */}
      <div style={{ marginTop: 18, padding: '0 22px' }}>
        <div className="fl-eyebrow" style={{ marginBottom: 8 }}>The rule</div>
        <div style={{ background: 'var(--vellum)', border: '1px solid var(--stone-line)' }}>
          {[
            ['Domains', '7'],
            ['Schedule', 'mon–fri · 09–19'],
            ['Partner', 'M. Okafor'],
            ['Grace', '10 min'],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '13px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--stone-line)' : 0,
              cursor: 'pointer',
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

      <div style={{ marginTop: 'auto', padding: '24px 22px 18px', textAlign: 'center' }}>
        <FLMotto text='"The work asks for your whole mind."' />
      </div>
    </div>
  )
}
