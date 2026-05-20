// FocusLock — design canvas that composes every screen.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "domain": "instagram.com",
  "domainLabel": "Instagram",
  "restrictionEnd": "7:00 PM",
  "timeLeft": "4h 38m",
  "unlockNum": 2,
  "unlockMax": 5,
  "motto": "Deep work is rare and valuable.",
  "showMottos": true
}/*EDITMODE-END*/;

const MOTTOS = [
  "Deep work is rare and valuable.",
  "The work asks for your whole mind.",
  "A door that opens too easily is no door at all.",
  "Sit with the urge. It passes.",
  "Discipline is freedom made small enough to keep.",
  "You will not remember the scroll. You will remember the work.",
];

// Browser window helpers — provide a 1280x800 frame around content
function FLBrowser({ url, title, width = 1280, height = 800, children }) {
  return (
    <ChromeWindow
      tabs={[{ title: title || 'FocusLock' }]}
      activeIndex={0}
      url={url}
      width={width}
      height={height}>
      {children}
    </ChromeWindow>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const liveProps = {
    domain: t.domain,
    domainLabel: t.domainLabel,
    restrictionEnd: t.restrictionEnd,
    timeLeft: t.timeLeft,
    unlockNum: t.unlockNum,
    unlockMax: t.unlockMax,
    motto: t.motto,
  };

  return (
    <>
      <CanvasIntro />
      <DesignCanvas>

        {/* ─── I · The Lock Screen ─── */}
        <DCSection id="lock" title="I — The Lock Screen" subtitle="The page that replaces a blocked site. All six states.">
          <DCArtboard id="lock-live" label="Live · type 482917 to unlock" width={1280} height={800}>
            <FLBrowser url="instagram.com" title="Instagram">
              <FLLockScreen {...liveProps} />
            </FLBrowser>
          </DCArtboard>
          <DCArtboard id="lock-validating" label="Validating" width={1280} height={800}>
            <FLBrowser url="instagram.com" title="Instagram">
              <FLLockScreen state="validating" {...liveProps} />
            </FLBrowser>
          </DCArtboard>
          <DCArtboard id="lock-success" label="Success · flash" width={1280} height={800}>
            <FLBrowser url="instagram.com" title="Instagram">
              <FLLockScreen state="success" {...liveProps} />
            </FLBrowser>
          </DCArtboard>
          <DCArtboard id="lock-error" label="Error · wrong code" width={1280} height={800}>
            <FLBrowser url="instagram.com" title="Instagram">
              <FLLockScreen state="error" {...liveProps} />
            </FLBrowser>
          </DCArtboard>
          <DCArtboard id="lock-grace" label="Grace · in progress" width={1280} height={800}>
            <FLBrowser url="instagram.com · grace" title="Instagram">
              <FLLockScreen state="grace" {...liveProps} />
            </FLBrowser>
          </DCArtboard>
          <DCArtboard id="lock-rate" label="Rate-limited" width={1280} height={800}>
            <FLBrowser url="instagram.com" title="Instagram">
              <FLLockScreen state="ratelimited" {...liveProps} unlockNum={5} />
            </FLBrowser>
          </DCArtboard>
        </DCSection>

        {/* ─── II · Extension chrome ─── */}
        <DCSection id="ext" title="II — The Extension" subtitle="What sits next to the Chrome address bar, and what it opens.">
          <DCArtboard id="popup" label="Popup · active" width={360} height={500}>
            <div style={{ padding: 18, background: 'transparent', height: '100%' }}>
              <FLPopup />
            </div>
          </DCArtboard>
          <DCArtboard id="popup-grace" label="Popup · grace" width={360} height={500}>
            <div style={{ padding: 18, background: 'transparent', height: '100%' }}>
              <FLPopup inGrace />
            </div>
          </DCArtboard>
          <DCArtboard id="settings" label="Settings · unsealed" width={1280} height={1280}>
            <FLBrowser url="focuslock.app/settings" title="FocusLock · Settings" height={1280}>
              <FLSettings />
            </FLBrowser>
          </DCArtboard>
          <DCArtboard id="settings-locked" label="Settings · sealed" width={1280} height={900}>
            <FLBrowser url="focuslock.app/settings" title="FocusLock · Settings" height={900}>
              <FLSettings locked />
            </FLBrowser>
          </DCArtboard>
        </DCSection>

        {/* ─── III · Onboarding ─── */}
        <DCSection id="onboard" title="III — Initiation" subtitle="The six steps from first install to sealed covenant.">
          <DCArtboard id="ob1" label="i · cover" width={1280} height={820}><FLBrowser url="focuslock.app/begin" title="FocusLock · Begin" height={820}><FLOnboard1 /></FLBrowser></DCArtboard>
          <DCArtboard id="ob2" label="ii · domains" width={1280} height={820}><FLBrowser url="focuslock.app/begin" title="FocusLock · Begin" height={820}><FLOnboard2 /></FLBrowser></DCArtboard>
          <DCArtboard id="ob3" label="iii · hours" width={1280} height={820}><FLBrowser url="focuslock.app/begin" title="FocusLock · Begin" height={820}><FLOnboard3 /></FLBrowser></DCArtboard>
          <DCArtboard id="ob4" label="iv · partner" width={1280} height={820}><FLBrowser url="focuslock.app/begin" title="FocusLock · Begin" height={820}><FLOnboard4 /></FLBrowser></DCArtboard>
          <DCArtboard id="ob5" label="v · allowances" width={1280} height={820}><FLBrowser url="focuslock.app/begin" title="FocusLock · Begin" height={820}><FLOnboard5 /></FLBrowser></DCArtboard>
          <DCArtboard id="ob6" label="vi · covenant" width={1280} height={820}><FLBrowser url="focuslock.app/begin" title="FocusLock · Begin" height={820}><FLOnboard6 /></FLBrowser></DCArtboard>
        </DCSection>

        {/* ─── IV · Mobile ─── */}
        <DCSection id="mobile" title="IV — On the Phone" subtitle="iOS Screen Time shield + Android VPN overlay. Same vocabulary, different bezel.">
          <DCArtboard id="ios-shield" label="iOS · shield" width={430} height={900}>
            <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              <IOSDevice width={402} height={874}>
                <FLiOSShield appName="Instagram" />
              </IOSDevice>
            </div>
          </DCArtboard>
          <DCArtboard id="ios-grace" label="iOS · grace" width={430} height={900}>
            <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              <IOSDevice width={402} height={874}>
                <FLiOSShield appName="Instagram" grace />
              </IOSDevice>
            </div>
          </DCArtboard>
          <DCArtboard id="ios-app" label="iOS · main app" width={430} height={900}>
            <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              <IOSDevice width={402} height={874}>
                <FLiOSApp />
              </IOSDevice>
            </div>
          </DCArtboard>
          <DCArtboard id="android" label="Android · overlay" width={444} height={924}>
            <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              <AndroidDevice width={412} height={892}>
                <FLAndroidOverlay appName="TikTok" />
              </AndroidDevice>
            </div>
          </DCArtboard>
        </DCSection>

        {/* ─── V · The Partner ─── */}
        <DCSection id="partner" title="V — The Partner" subtitle="What lands in the keyholder's inbox the moment Ona asks.">
          <DCArtboard id="email" label="Inbox · the ask" width={1280} height={820}>
            <FLMailWindow><FLEmailClient /></FLMailWindow>
          </DCArtboard>
        </DCSection>

      </DesignCanvas>

      <FLTweaksPanel t={t} setTweak={setTweak} />
    </>
  );
}

// macOS-styled window for the email client
function FLMailWindow({ children }) {
  return (
    <div style={{
      width: 1280, height: 820,
      background: '#fff',
      boxShadow: '0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        height: 38, background: '#F2EFE7',
        borderBottom: '1px solid #E0DACE',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 14px',
      }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#5A5142', fontFamily: 'var(--f-sans)' }}>Mail — maryam@okafor.studio</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

// Intro card on the canvas
function CanvasIntro() {
  return (
    <div style={{
      position: 'fixed',
      top: 20, left: 20,
      maxWidth: 360,
      background: 'var(--vellum)',
      border: '1px solid var(--ink)',
      padding: '18px 22px',
      zIndex: 5,
      pointerEvents: 'none',
      boxShadow: '0 12px 40px rgba(20,18,13,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <FLSeal size={26} char="F" />
        <div style={{ fontFamily: 'var(--f-serif)', fontSize: 18, letterSpacing: '-0.01em' }}>
          Focus<span style={{ fontStyle: 'italic' }}>Lock</span> · <span style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>The Scriptorium</span>
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--f-serif)', fontStyle: 'italic',
        fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5,
      }}>
        A monastic study of the friction. Type <span className="fl-mono" style={{ background: 'var(--paper)', padding: '1px 6px', fontStyle: 'normal' }}>482917</span> into the live lock screen to pass.
      </div>
    </div>
  );
}

// Tweaks
function FLTweaksPanel({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="The block">
        <TweakText label="Domain" value={t.domain} onChange={v => setTweak({ domain: v, domainLabel: v.split('.')[0].replace(/^\w/, c => c.toUpperCase()) })} />
        <TweakText label="Until" value={t.restrictionEnd} onChange={v => setTweak('restrictionEnd', v)} />
        <TweakText label="Left" value={t.timeLeft} onChange={v => setTweak('timeLeft', v)} />
      </TweakSection>
      <TweakSection label="Allowances">
        <TweakSlider label="Used today" value={t.unlockNum} min={0} max={t.unlockMax} step={1} onChange={v => setTweak('unlockNum', v)} />
        <TweakSlider label="Daily max" value={t.unlockMax} min={1} max={10} step={1} onChange={v => setTweak('unlockMax', v)} />
      </TweakSection>
      <TweakSection label="The motto">
        <TweakSelect label="Pick" value={t.motto} options={MOTTOS} onChange={v => setTweak('motto', v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
