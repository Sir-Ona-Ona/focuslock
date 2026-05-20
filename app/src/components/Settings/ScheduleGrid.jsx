const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function makeSchedule() {
  return DAYS.map((_, i) => {
    if (i < 5) return Array.from({ length: 24 }, (_, h) => h >= 9 && h < 19)
    if (i === 5) return Array.from({ length: 24 }, (_, h) => h >= 10 && h < 14)
    return Array.from({ length: 24 }, () => false)
  })
}

export default function ScheduleGrid() {
  const sched = makeSchedule()
  return (
    <div style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)', overflowX: 'auto' }}>
      {/* Hour labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px repeat(24, 1fr)',
        padding: '6px 0',
        borderBottom: '1px solid var(--stone-line)',
        background: 'var(--paper)',
        minWidth: 520,
      }}>
        <span />
        {Array.from({ length: 24 }).map((_, h) => (
          <span key={h} style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            color: 'var(--ink-mute)',
            textAlign: 'center',
            letterSpacing: '0.04em',
          }}>
            {h % 6 === 0 ? String(h).padStart(2, '0') : '·'}
          </span>
        ))}
      </div>
      {/* Day rows */}
      {DAYS.map((d, i) => (
        <div key={d} style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(24, 1fr)',
          borderBottom: i === 6 ? 0 : '1px solid var(--stone-line)',
          height: 30,
          alignItems: 'stretch',
          minWidth: 520,
        }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 14,
            fontFamily: 'var(--f-serif)',
            fontSize: 13,
            color: i > 4 ? 'var(--ink-mute)' : 'var(--ink)',
            fontStyle: i > 4 ? 'italic' : 'normal',
            borderRight: '1px solid var(--stone-line)',
          }}>{d}</span>
          {sched[i].map((on, h) => (
            <div key={h} style={{
              borderRight: h === 23 ? 0 : '1px solid var(--stone-line)',
              background: on ? 'var(--ink)' : 'transparent',
              position: 'relative',
              cursor: 'pointer',
            }}>
              {on && i === 2 && h === 14 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '100%',
                  transform: 'translate(8px, -50%)',
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 11,
                  color: 'var(--bronze)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}>now ◂</div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
