export default function FLStat({ value, label, accent = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontFamily: 'var(--f-serif)',
        fontSize: 28,
        lineHeight: 1,
        color: accent ? 'var(--bronze)' : 'var(--ink)',
        letterSpacing: '-0.01em',
      }}>{value}</div>
      <div style={{
        fontFamily: 'var(--f-sans)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
      }}>{label}</div>
    </div>
  )
}
