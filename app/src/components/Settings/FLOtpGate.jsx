import FLSeal from '../atoms/FLSeal'
import FLOtp from '../atoms/FLOtp'

export default function FLOtpGate({ onUnlock }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(244,239,227,0.42)',
      backdropFilter: 'blur(2px)',
      zIndex: 10,
    }}>
      <div style={{
        width: 480,
        background: 'var(--vellum)',
        border: '1px solid var(--ink)',
        padding: '36px 40px',
        textAlign: 'center',
        boxShadow: '0 24px 60px rgba(20,18,13,0.18)',
        animation: 'fl-pop .3s var(--ease)',
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
          Enter a code from your partner to break the seal for this session.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <FLOtp value="" state="idle" />
        </div>
        <button className="fl-btn--quiet" onClick={onUnlock}>
          request a new code
        </button>
        {onUnlock && (
          <div style={{ marginTop: 16 }}>
            <button
              className="fl-btn"
              onClick={onUnlock}
              style={{ fontSize: 12 }}
            >
              Demo: Break the seal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
