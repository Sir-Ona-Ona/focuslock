function FLDot() {
  return (
    <div style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--ink)',
      opacity: 0.4,
      animation: 'fl-pulse 1.2s ease-in-out infinite',
    }} />
  )
}

export default function FLOtp({ value = '', state = 'idle' }) {
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')
  const focusedIdx = state === 'typing' ? Math.min(value.length, 5) : -1

  const cls = ['fl-otp']
  if (state === 'error') cls.push('error')
  if (state === 'success') cls.push('success')

  return (
    <div className={cls.join(' ')}>
      {digits.map((ch, i) => {
        const cellCls = ['d']
        if (ch.trim()) cellCls.push('filled')
        if (i === focusedIdx) cellCls.push('active')
        return (
          <div key={i} className={cellCls.join(' ')}>
            {state === 'validating' ? <FLDot /> : (ch.trim() || '')}
          </div>
        )
      })}
    </div>
  )
}
