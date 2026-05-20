export default function FLMotto({ text }) {
  return (
    <div style={{
      fontFamily: 'var(--f-serif)',
      fontStyle: 'italic',
      fontSize: 13,
      color: 'var(--ink-mute)',
      letterSpacing: '0.01em',
      lineHeight: 1.4,
      marginTop: 12,
    }}>{text}</div>
  )
}
