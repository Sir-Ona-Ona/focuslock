import FLSeal from '../atoms/FLSeal'

const FOLDERS = [
  ['Inbox', '14', true],
  ['Starred', null],
  ['Sent', null],
  ['Drafts', '2'],
  ['Archive', null],
]

const MESSAGES = [
  {
    from: 'FocusLock',
    subj: 'Ona wants to access Instagram',
    preview: "Code: 482917 · Time: 14:22 WAT · Today's asks: 2 of 5",
    when: '2 min',
    unread: true,
    tagged: true,
  },
  {
    from: 'FocusLock',
    subj: 'Ona wants to access reddit.com',
    preview: "Code: 173049 · Time: 11:14 WAT · Today's asks: 1 of 5",
    when: '3h',
    unread: false,
    tagged: true,
  },
  {
    from: 'FocusLock',
    subj: 'Ona updated their rule',
    preview: 'Added linkedin.com/feed · Removed 9gag.com',
    when: 'yesterday',
    unread: false,
    tagged: true,
  },
  {
    from: 'Squarespace',
    subj: 'Your invoice for March is ready',
    preview: 'Hi Maryam, your monthly invoice for okafor.studio is available...',
    when: 'mar 9',
  },
  {
    from: 'Ona',
    subj: 'thanks for last week',
    preview: "genuinely. couldn't have shipped without the friction. lunch on me thursday?",
    when: 'mar 8',
  },
]

export default function FLEmailClient() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#FAFAF6',
      display: 'grid',
      gridTemplateColumns: '260px 360px 1fr',
      fontFamily: 'var(--f-sans)',
      overflow: 'hidden',
      color: 'var(--ink)',
    }}>
      {/* Left rail */}
      <aside style={{
        background: '#F2EFE7',
        borderRight: '1px solid #E0DACE',
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 18px' }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: '#3A332A', color: '#fff',
            fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>M</span>
          <span style={{ fontSize: 12, color: '#3A332A' }}>maryam@okafor.studio</span>
        </div>
        {FOLDERS.map(([k, n, active]) => (
          <div key={k} style={{
            padding: '7px 10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: active ? '#fff' : 'transparent',
            border: active ? '1px solid #E0DACE' : '1px solid transparent',
            fontSize: 13,
            color: active ? '#14120D' : '#5A5142',
            cursor: 'pointer',
          }}>
            <span>{k}</span>
            {n && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#7A715E' }}>{n}</span>}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: 8, fontFamily: 'var(--f-mono)', fontSize: 10, color: '#7A715E', letterSpacing: '0.1em' }}>
          labels
        </div>
        <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3A332A' }}>
          <span style={{ width: 8, height: 8, background: 'var(--bronze)' }} />
          FocusLock · Ona
        </div>
      </aside>

      {/* Message list */}
      <section style={{ borderRight: '1px solid #E0DACE', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #E0DACE',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontFamily: 'var(--f-serif)', fontSize: 18 }}>Inbox</div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#7A715E' }}>14 unread</div>
        </div>
        {MESSAGES.map((m, i) => (
          <div key={i} style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E0DACE',
            display: 'flex', flexDirection: 'column', gap: 4,
            background: i === 0 ? '#fff' : 'transparent',
            borderLeft: i === 0 ? '3px solid var(--ink)' : '3px solid transparent',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{
                fontSize: 13,
                fontWeight: m.unread ? 600 : 400,
                color: m.unread ? '#14120D' : '#3A332A',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {m.tagged && <span style={{ width: 6, height: 6, background: 'var(--bronze)', display: 'inline-block' }} />}
                {m.from}
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: '#7A715E' }}>{m.when}</span>
            </div>
            <div style={{
              fontSize: 13,
              fontWeight: m.unread ? 500 : 400,
              color: m.unread ? '#14120D' : '#5A5142',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{m.subj}</div>
            <div style={{
              fontSize: 11, color: '#7A715E',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: m.tagged ? 'var(--f-mono)' : 'var(--f-sans)',
            }}>{m.preview}</div>
          </div>
        ))}
      </section>

      {/* Reader pane */}
      <article style={{ display: 'flex', flexDirection: 'column', background: 'var(--vellum)', overflow: 'auto' }}>
        <div style={{ padding: '20px 32px', borderBottom: '1px solid #E0DACE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <FLSeal size={26} char="F" />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#7A715E', letterSpacing: '0.1em' }}>
              FocusLock &nbsp;·&nbsp; no-reply@focuslock.app
            </span>
          </div>
          <h1 style={{
            margin: '6px 0 0',
            fontFamily: 'var(--f-serif)', fontWeight: 400,
            fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.01em',
          }}>
            Ona wants to access <span style={{ fontStyle: 'italic' }}>Instagram.</span>
          </h1>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#7A715E', marginTop: 8 }}>
            to: maryam@okafor.studio · wed 11.iii.mmxxvi · 14:22 WAT
          </div>
        </div>

        <div style={{ padding: '28px 32px 16px', maxWidth: 620 }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#3A332A' }}>Maryam,</p>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: '#3A332A' }}>
            Ona has asked to open <span className="fl-mono">instagram.com</span>. Their focus hours run until 19:00. You agreed to be the one who decides.
          </p>

          {/* Code cartouche */}
          <div style={{
            margin: '28px 0',
            border: '1px solid var(--ink)',
            background: 'var(--paper)',
            padding: '20px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
          }}>
            <div>
              <div className="fl-eyebrow" style={{ marginBottom: 8 }}>The code</div>
              <div style={{
                fontFamily: 'var(--f-mono)', fontWeight: 500,
                fontSize: 34, letterSpacing: '0.12em', color: 'var(--ink)',
              }}>4 8 2 9 1 7</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: '#7A715E', marginTop: 6, letterSpacing: '0.06em' }}>
                single use · invalid after entry · expires 24h
              </div>
            </div>
            <FLSeal size={56} char="F" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 4 }}>
            <div>
              <div className="fl-eyebrow" style={{ marginBottom: 4 }}>Today's count</div>
              <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 17 }}>2 of 5 asks</div>
            </div>
            <div>
              <div className="fl-eyebrow" style={{ marginBottom: 4 }}>The hour</div>
              <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 17 }}>14:22 WAT</div>
            </div>
          </div>

          <p style={{ margin: '26px 0 0', fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 14, color: '#5A5142', lineHeight: 1.55 }}>
            You are not obliged to share it. The good keyholder asks why.
          </p>

          <hr className="fl-rule" style={{ margin: '24px 0' }} />

          <p style={{ margin: 0, fontSize: 12, color: '#7A715E', lineHeight: 1.55 }}>
            Sent by FocusLock on behalf of <strong style={{ color: '#3A332A' }}>Ona Alabi</strong>. You were named as their accountability partner on 6 February 2026. To step down, ask Ona to choose another — there is a 24-hour cooling period.
          </p>
        </div>
      </article>
    </div>
  )
}
