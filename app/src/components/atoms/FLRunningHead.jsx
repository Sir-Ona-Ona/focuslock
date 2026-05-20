export default function FLRunningHead({ left, center, right }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '20px 48px 18px',
      borderBottom: '1px solid var(--stone-line)',
      gap: 24,
    }}>
      <div style={{
        fontFamily: 'var(--f-serif)',
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink-mute)',
      }}>{left}</div>
      <div style={{
        fontFamily: 'var(--f-sans)',
        fontSize: 10,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        color: 'var(--ink)',
      }}>{center}</div>
      <div style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 12,
        color: 'var(--ink-mute)',
        textAlign: 'right',
      }}>{right}</div>
    </div>
  )
}
