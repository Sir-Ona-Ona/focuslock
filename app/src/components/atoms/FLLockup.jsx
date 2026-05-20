import FLSeal from './FLSeal'

export default function FLLockup({ size = 18, dark = false, tagline }) {
  const ink = dark ? '#FAF7EE' : 'var(--ink)'
  const mute = dark ? 'rgba(250,247,238,.55)' : 'var(--ink-mute)'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <FLSeal size={size * 1.4} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
          fontFamily: 'var(--f-serif)',
          fontSize: size,
          letterSpacing: '-0.01em',
          color: ink,
          lineHeight: 1,
        }}>
          Focus<span style={{ fontStyle: 'italic' }}>Lock</span>
        </span>
        {tagline && (
          <span style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: mute,
            lineHeight: 1,
            marginTop: 3,
          }}>{tagline}</span>
        )}
      </div>
    </div>
  )
}
