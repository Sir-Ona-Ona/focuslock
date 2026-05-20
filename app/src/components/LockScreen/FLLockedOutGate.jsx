import FLIcon from '../atoms/FLIcon'

export default function FLLockedOutGate() {
  return (
    <div style={{
      padding: '14px 22px',
      border: '1px solid var(--crimson)',
      borderLeft: '3px solid var(--crimson)',
      background: 'rgba(122,46,38,0.04)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <FLIcon name="warning" size={20} color="var(--crimson)" />
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>No codes will be issued</div>
        <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2, fontFamily: 'var(--f-mono)' }}>
          resets · 00:00 local · in 7h 12m
        </div>
      </div>
    </div>
  )
}
