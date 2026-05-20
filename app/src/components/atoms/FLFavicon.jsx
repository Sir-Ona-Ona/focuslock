export default function FLFavicon({ char = 'I', size = 22, color = 'var(--ink-3)' }) {
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'var(--stone-soft)',
      color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--f-serif)',
      fontStyle: 'italic',
      fontSize: size * 0.55,
      flexShrink: 0,
    }}>{char}</span>
  )
}
