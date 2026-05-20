export default function SectionHeading({ num, title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-mute)', letterSpacing: '0.1em' }}>
          {num}.
        </span>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--f-serif)',
          fontWeight: 400,
          fontSize: 28,
          letterSpacing: '-0.01em',
        }}>{title}</h2>
      </div>
      {subtitle && (
        <div style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--ink-mute)',
          marginTop: 6,
          paddingLeft: 26,
        }}>{subtitle}</div>
      )}
    </div>
  )
}
