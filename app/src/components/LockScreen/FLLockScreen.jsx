import { useState, useEffect } from 'react'
import FLRunningHead from '../atoms/FLRunningHead'
import FLSeal from '../atoms/FLSeal'
import FLOtp from '../atoms/FLOtp'
import FLFavicon from '../atoms/FLFavicon'
import FLIcon from '../atoms/FLIcon'
import FLGraceTimer from './FLGraceTimer'
import FLLockedOutGate from './FLLockedOutGate'

const CORRECT_CODE = '482917'

export default function FLLockScreen({
  state: forcedState,
  domain = 'instagram.com',
  domainLabel = 'Instagram',
  restrictionEnd = '7:00 PM',
  timeLeft = '4h 38m',
  unlockNum = 2,
  unlockMax = 5,
  motto = 'Deep work is rare and valuable.',
  graceUntil,
  date = 'Wed · ii March mmxxvi',
  hour = 'II',
}) {
  const [val, setVal] = useState('')
  const [internalState, setInternalState] = useState('idle')
  const [requestPulse, setRequestPulse] = useState(false)

  const state = forcedState || internalState
  const isInteractive = !forcedState

  useEffect(() => {
    if (!isInteractive) return
    if (val.length === 6) {
      setInternalState('validating')
      const t = setTimeout(() => {
        if (val === CORRECT_CODE) {
          setInternalState('success')
        } else {
          setInternalState('error')
          setTimeout(() => { setVal(''); setInternalState('idle') }, 1400)
        }
      }, 900)
      return () => clearTimeout(t)
    }
  }, [val, isInteractive])

  useEffect(() => {
    if (state === 'success' && isInteractive) {
      const t = setTimeout(() => { setVal(''); setInternalState('idle') }, 2200)
      return () => clearTimeout(t)
    }
  }, [state, isInteractive])

  const onKey = (e) => {
    if (!isInteractive || state === 'validating' || state === 'success') return
    if (e.key === 'Backspace') setVal(v => v.slice(0, -1))
    else if (/^\d$/.test(e.key) && val.length < 6) setVal(v => v + e.key)
  }

  const requestCode = () => {
    setRequestPulse(true)
    setTimeout(() => setRequestPulse(false), 1400)
  }

  const isGrace = state === 'grace'
  const isRate = state === 'ratelimited'

  const headline = () => {
    if (state === 'success') return <>{`You may pass.`}<br /><span style={{ fontStyle: 'italic', color: 'var(--moss)' }}>Briefly.</span></>
    if (state === 'error') return <>That is not<br /><span style={{ fontStyle: 'italic', color: 'var(--crimson)' }}>the code.</span></>
    if (state === 'validating') return <><span style={{ fontStyle: 'italic' }}>Asking</span> the bell-ringer…</>
    if (isGrace) return <><span style={{ fontStyle: 'italic' }}>Granted.</span> Return when finished.</>
    if (isRate) return <>The well is dry.<br /><span style={{ fontStyle: 'italic' }}>Try tomorrow.</span></>
    return <>Sit with the urge<br />to visit <span style={{ fontStyle: 'italic' }}>{domainLabel}</span>.</>
  }

  const body = () => {
    if (state === 'idle' || (!forcedState && val.length < 6 && state !== 'validating')) {
      return <>A one‑time code was sent to your accountability partner. <span className="fl-serif-it">Ask them for it</span> — or wait until the hour passes.</>
    }
    if (state === 'validating') return <>Verifying the code against the seal in the registry.</>
    if (state === 'success') return <>A ten‑minute window opens for <span className="fl-mono">{domain}</span>. Then it closes.</>
    if (state === 'error') return <>The digits you entered do not match. The partner may have mistyped — no penalty. Ask again.</>
    if (isGrace) return <>The window will close automatically. A new code is already with your partner.</>
    if (isRate) return <>You have requested {unlockMax} of {unlockMax} unlocks today. The limit resets at midnight, local time.</>
    return null
  }

  const otpState = state === 'idle' && val.length > 0 ? 'typing' : state

  return (
    <div
      className="fl-screen"
      tabIndex={0}
      onKeyDown={onKey}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--vellum)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        outline: 'none',
        animation: state === 'success' ? 'fl-flash-success 1.4s var(--ease)' : undefined,
      }}
    >
      <div className="fl-margin-rule" style={{ left: 64 }} />
      <div className="fl-margin-rule" style={{ right: 64, opacity: 0.18 }} />

      <FLRunningHead
        left={<span>Liber Horarum &nbsp;·&nbsp; <span style={{ fontStyle: 'normal', fontFamily: 'var(--f-mono)', fontSize: 11 }}>{date}</span></span>}
        center="FocusLock"
        right={<span>{hour} &nbsp;/&nbsp; XII</span>}
      />

      {/* Status strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 48px',
        borderBottom: '1px solid var(--stone-line)',
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--moss)',
            boxShadow: '0 0 0 3px rgba(79,91,65,.18)',
          }} />
          extension · active · heartbeat 14m ago
        </span>
        <span>partner · m. okafor &nbsp;·&nbsp; restricted until {restrictionEnd}</span>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr',
        placeItems: 'center',
        padding: '40px 48px 32px',
        position: 'relative',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
        }}>
          {/* Seal flanked by rules */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <hr className="fl-rule" style={{ width: 48 }} />
            <FLSeal size={36} char="F" />
            <hr className="fl-rule" style={{ width: 48 }} />
          </div>

          <div className="fl-eyebrow" style={{ textAlign: 'center' }}>
            {isGrace ? 'Grace · in progress' : isRate ? 'Limit reached for this day' : 'The hour is not yet'}
          </div>

          <div style={{
            fontFamily: 'var(--f-serif)',
            fontSize: 64,
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            color: 'var(--ink)',
            maxWidth: 640,
            animation: 'fl-fade-in .3s var(--ease)',
          }}>
            {headline()}
          </div>

          <div style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 15,
            lineHeight: 1.5,
            color: 'var(--ink-3)',
            textAlign: 'center',
            maxWidth: 480,
          }}>
            {body()}
          </div>

          {/* OTP / timer / gate */}
          <div style={{ marginTop: 8, minHeight: 64 }}>
            {isGrace ? (
              <FLGraceTimer until={graceUntil || '10:00'} />
            ) : isRate ? (
              <FLLockedOutGate />
            ) : (
              <FLOtp value={val} state={otpState} />
            )}
          </div>

          {/* Tertiary actions */}
          {!isGrace && !isRate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 4 }}>
              <button
                onClick={requestCode}
                disabled={state !== 'idle'}
                className="fl-btn--quiet"
                style={{ opacity: state === 'idle' ? 1 : 0.4 }}
              >
                {requestPulse ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <FLIcon name="check" size={14} color="var(--moss)" />
                    sent to partner
                  </span>
                ) : 'Request a new code'}
              </button>
              <span style={{ width: 1, height: 14, background: 'var(--stone-line)' }} />
              <button
                onClick={() => setVal('')}
                disabled={!val}
                className="fl-btn--quiet"
                style={{ opacity: val ? 1 : 0.5, color: val ? 'var(--ink-3)' : 'var(--ink-mute)' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Bottom ledger */}
        <div style={{
          position: 'absolute',
          left: 48, right: 48, bottom: 28,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          alignItems: 'end',
          gap: 32,
          paddingTop: 18,
          borderTop: '1px solid var(--stone-line)',
        }}>
          <div>
            <div className="fl-eyebrow" style={{ marginBottom: 6 }}>Domain</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FLFavicon char={domain[0].toUpperCase()} size={18} />
              <span className="fl-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>{domain}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="fl-eyebrow" style={{ marginBottom: 8 }}>Time remaining</div>
            <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>
              {timeLeft}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 4 }}>
              until {restrictionEnd}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="fl-eyebrow" style={{ marginBottom: 6 }}>Unlocks today</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              {Array.from({ length: unlockMax }).map((_, i) => (
                <span key={i} style={{
                  width: 14, height: 14,
                  borderRadius: '50%',
                  border: '1px solid var(--ink-3)',
                  background: i < unlockNum ? 'var(--ink)' : 'transparent',
                }} />
              ))}
              <span style={{ marginLeft: 8, fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                {unlockNum} / {unlockMax}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer motto */}
      <div style={{
        padding: '16px 48px 22px',
        textAlign: 'center',
        borderTop: '1px solid var(--stone-line)',
        fontFamily: 'var(--f-serif)',
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink-mute)',
      }}>
        "{motto}"
      </div>
    </div>
  )
}
