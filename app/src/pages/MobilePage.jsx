import { useState } from 'react'
import FLiOSShield from '../components/Mobile/FLiOSShield'
import FLiOSApp from '../components/Mobile/FLiOSApp'
import FLAndroidOverlay from '../components/Mobile/FLAndroidOverlay'

function PhoneFrame({ children, label, width = 390, height = 844 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div className="canvas-label">{label}</div>
      <div style={{
        width,
        height,
        border: '8px solid var(--ink)',
        borderRadius: 44,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 24px 80px rgba(20,18,13,0.25)',
        background: 'var(--vellum)',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 30, background: 'var(--ink)',
          borderRadius: '0 0 20px 20px', zIndex: 10,
        }} />
        <div style={{ width: '100%', height: '100%', paddingTop: 30, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function MobilePage() {
  const [iosGrace, setIosGrace] = useState(false)

  return (
    <div className="canvas-section" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', minWidth: 'max-content' }}>

        <PhoneFrame label="iOS Shield — blocked app" width={390} height={600}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{
              position: 'absolute', top: 8, right: 12, zIndex: 10,
            }}>
              <button
                onClick={() => setIosGrace(g => !g)}
                style={{
                  fontFamily: 'var(--f-mono)', fontSize: 9, padding: '3px 8px',
                  border: '1px solid var(--stone-line)', background: 'var(--vellum)',
                  color: 'var(--ink-mute)', cursor: 'pointer', borderRadius: 0,
                }}
              >
                {iosGrace ? 'grace' : 'blocked'}
              </button>
            </div>
            <FLiOSShield grace={iosGrace} />
          </div>
        </PhoneFrame>

        <PhoneFrame label="iOS App" width={390} height={600}>
          <FLiOSApp />
        </PhoneFrame>

        <PhoneFrame label="Android Overlay" width={360} height={640}>
          <FLAndroidOverlay appName="TikTok" />
        </PhoneFrame>

      </div>
    </div>
  )
}
