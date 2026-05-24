import { useState, useEffect } from 'react'
import FLSeal from '../atoms/FLSeal'
import FLOtp from '../atoms/FLOtp'
import { api } from '../../lib/api'

export default function FLOtpGate({ onUnlock }) {
  const [val, setVal]         = useState('')
  const [otpState, setOtpState] = useState('idle')
  const [requested, setRequested] = useState(false)
  const [error, setError]     = useState('')

  // Validate when 6 digits entered
  useEffect(() => {
    if (val.length !== 6) return
    setOtpState('validating')
    setError('')
    api.settings.unseal(val).then(() => {
      setOtpState('success')
      setTimeout(onUnlock, 600)
    }).catch(err => {
      setOtpState('error')
      setError(err.message ?? 'Invalid code')
      setTimeout(() => { setVal(''); setOtpState('idle') }, 1400)
    })
  }, [val, onUnlock])

  const onKey = (e) => {
    if (otpState === 'validating' || otpState === 'success') return
    if (e.key === 'Backspace') setVal(v => v.slice(0, -1))
    else if (/^\d$/.test(e.key) && val.length < 6) setVal(v => v + e.key)
  }

  const requestCode = () => {
    setRequested(false)
    api.unlock.request('', 'settings').then(() => setRequested(true)).catch(() => setRequested(true))
  }

  const displayState = otpState === 'idle' && val.length > 0 ? 'typing' : otpState

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(244,239,227,0.42)',
        backdropFilter: 'blur(2px)',
        zIndex: 10,
      }}
      onKeyDown={onKey}
      tabIndex={-1}
    >
      <div style={{
        width: 480,
        background: 'var(--vellum)',
        border: '1px solid var(--ink)',
        padding: '36px 40px',
        textAlign: 'center',
        boxShadow: '0 24px 60px rgba(20,18,13,0.18)',
        animation: 'fl-pop .3s var(--ease)',
        outline: 'none',
      }}>
        <FLSeal size={42} char="F" />
        <div className="fl-eyebrow" style={{ marginTop: 18, marginBottom: 6 }}>Sealed by rule</div>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--f-serif)',
          fontWeight: 400,
          fontSize: 30,
          lineHeight: 1.15,
        }}>
          The rule is <span style={{ fontStyle: 'italic' }}>under seal.</span>
        </h2>
        <p style={{
          marginTop: 10,
          marginBottom: 26,
          fontFamily: 'var(--f-sans)',
          fontSize: 13,
          color: 'var(--ink-3)',
          lineHeight: 1.55,
        }}>
          Enter the six-digit code your partner sends you.
          Click below to request it first.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <FLOtp value={val} state={displayState} />
        </div>

        {error && (
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--crimson)', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          className="fl-btn--quiet"
          onClick={requestCode}
          style={{ fontSize: 12 }}
        >
          {requested ? '✓ Code sent to partner' : 'Request a new code'}
        </button>

        <div style={{ marginTop: 8, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
          then type the code above · keyboard active
        </div>
      </div>
    </div>
  )
}
