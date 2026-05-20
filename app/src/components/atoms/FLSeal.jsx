export default function FLSeal({ size = 28, char = 'F' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'var(--bronze)',
      color: 'var(--vellum)',
      fontFamily: 'var(--f-serif)',
      fontStyle: 'italic',
      fontSize: size * 0.55,
      lineHeight: 1,
      letterSpacing: '-0.02em',
      flexShrink: 0,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), inset 0 -2px 4px rgba(0,0,0,.22)',
    }}>
      {char}
      <span style={{
        position: 'absolute',
        inset: 2,
        borderRadius: '50%',
        border: '1px dashed rgba(255,255,255,.25)',
        pointerEvents: 'none',
      }} />
    </span>
  )
}
