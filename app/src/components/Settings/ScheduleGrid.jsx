import { useState, useCallback } from 'react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function defaultMask() {
  return DAYS.map((_, i) => {
    if (i < 5) return Array.from({ length: 24 }, (_, h) => h >= 9 && h < 19)
    if (i === 5) return Array.from({ length: 24 }, (_, h) => h >= 10 && h < 14)
    return Array.from({ length: 24 }, () => false)
  })
}

// Convert API schedule format ↔ 2D array
export function scheduleToMask(schedule) {
  const mask = DAYS.map(() => Array(24).fill(false))
  for (const { day, hourMask } of schedule) {
    if (day >= 0 && day < 7) mask[day] = [...hourMask]
  }
  return mask
}

export function maskToSchedule(mask) {
  return mask.map((hourMask, day) => ({ day, hourMask: [...hourMask] }))
}

export default function ScheduleGrid({ value, onChange }) {
  const [mask, setMask] = useState(value ? scheduleToMask(value) : defaultMask())
  const [dragging, setDragging] = useState(null) // { painting: bool }

  const toggle = useCallback((dayIdx, hourIdx, forceTo) => {
    setMask(prev => {
      const next = prev.map(r => [...r])
      next[dayIdx][hourIdx] = forceTo ?? !next[dayIdx][hourIdx]
      onChange?.(maskToSchedule(next))
      return next
    })
  }, [onChange])

  const onMouseDown = (dayIdx, hourIdx) => {
    const newVal = !mask[dayIdx][hourIdx]
    setDragging({ painting: newVal })
    toggle(dayIdx, hourIdx, newVal)
  }

  const onMouseEnter = (dayIdx, hourIdx) => {
    if (dragging === null) return
    toggle(dayIdx, hourIdx, dragging.painting)
  }

  const onMouseUp = () => setDragging(null)

  return (
    <div
      style={{ border: '1px solid var(--stone-line)', background: 'var(--vellum)', overflowX: 'auto', userSelect: 'none' }}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
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
            fontFamily: 'var(--f-mono)', fontSize: 9,
            color: 'var(--ink-mute)', textAlign: 'center', letterSpacing: '0.04em',
          }}>
            {h % 6 === 0 ? String(h).padStart(2, '0') : '·'}
          </span>
        ))}
      </div>

      {/* Day rows */}
      {DAYS.map((d, dayIdx) => (
        <div key={d} style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(24, 1fr)',
          borderBottom: dayIdx === 6 ? 0 : '1px solid var(--stone-line)',
          height: 30,
          alignItems: 'stretch',
          minWidth: 520,
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 14,
            fontFamily: 'var(--f-serif)', fontSize: 13,
            color: dayIdx > 4 ? 'var(--ink-mute)' : 'var(--ink)',
            fontStyle: dayIdx > 4 ? 'italic' : 'normal',
            borderRight: '1px solid var(--stone-line)',
          }}>{d}</span>

          {mask[dayIdx].map((on, hourIdx) => (
            <div
              key={hourIdx}
              onMouseDown={() => onMouseDown(dayIdx, hourIdx)}
              onMouseEnter={() => onMouseEnter(dayIdx, hourIdx)}
              style={{
                borderRight: hourIdx === 23 ? 0 : '1px solid var(--stone-line)',
                background: on ? 'var(--ink)' : 'transparent',
                cursor: 'pointer',
                transition: 'background .08s',
              }}
            />
          ))}
        </div>
      ))}

      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid var(--stone-line)',
        fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)',
        background: 'var(--paper)',
      }}>
        click or drag to toggle · ■ = blocked
      </div>
    </div>
  )
}
