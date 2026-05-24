// ── FocusLock Content Script ──────────────────────────────────────────────────
// Runs at document_start on every page. Checks if the domain is blocked,
// and if so injects a full-screen lock screen before any page content renders.

;(async () => {
  if (window !== window.top) return                           // skip iframes
  if (document.getElementById('fl-overlay')) return          // already mounted

  const hostname = location.hostname

  // Hide the page immediately to prevent flash of blocked content
  const veil = document.createElement('style')
  veil.id = 'fl-veil'
  veil.textContent = 'html{visibility:hidden!important}'
  document.documentElement.appendChild(veil)

  const reveal  = () => { veil.remove() }
  const replace = () => {
    // Keep page hidden — lock screen is the only visible UI
    veil.textContent = 'html,body{margin:0;padding:0;overflow:hidden;visibility:visible!important}'
  }

  let status
  try {
    status = await chrome.runtime.sendMessage({ type: 'GET_STATUS', hostname })
  } catch {
    reveal(); return   // extension context lost
  }

  if (!status?.blocked || status.inGrace) {
    reveal(); return   // allowed — show the real page
  }

  replace()
  mount(hostname, status)
})()

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(h) { return h.replace(/^www\./, '').toLowerCase() }

const FRIENDLY = {
  'instagram.com': 'Instagram', 'x.com': 'X / Twitter',
  'twitter.com': 'Twitter',     'tiktok.com': 'TikTok',
  'reddit.com': 'Reddit',       'youtube.com': 'YouTube',
  'facebook.com': 'Facebook',   'threads.net': 'Threads',
  'linkedin.com': 'LinkedIn',   'pinterest.com': 'Pinterest',
}

// ── Lock screen ───────────────────────────────────────────────────────────────

function mount(hostname, status) {
  const nd    = norm(hostname)
  const label = FRIENDLY[nd] || hostname

  const root = document.createElement('div')
  root.id = 'fl-overlay'
  root.innerHTML = html(label, status)
  document.documentElement.appendChild(root)

  runClock(root)
  runOtp(root, hostname, label)
}

function html(label, status) {
  const { ratelimited, unlocksToday = 0, dailyUnlockMax = 5 } = status

  const eyebrow = ratelimited ? 'Daily limit reached' : 'The hour is not yet'
  const headline = ratelimited
    ? `The well is dry.<br><em>Try tomorrow.</em>`
    : `Sit with the urge<br>to visit <em>${label}.</em>`
  const body = ratelimited
    ? `You have used all ${dailyUnlockMax} of your unlocks today. The counter resets at midnight.`
    : `A one‑time code was sent to your accountability partner. <em>Ask them for it</em> — or wait until the hour passes.`

  return `
<style>
  #fl-overlay {
    position: fixed; inset: 0; z-index: 2147483647;
    background: #FAF7EE;
    font-family: Georgia, 'Times New Roman', serif;
    color: #14120D;
    display: flex; flex-direction: column;
    -webkit-font-smoothing: antialiased;
    animation: fl-fade .25s ease;
  }
  #fl-overlay * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fl-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
  @keyframes fl-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(3px)} }

  .fl-head { display:flex; align-items:center; justify-content:space-between; padding:12px 48px; border-bottom:1px solid #E2DCCC; font-family:Helvetica,Arial,sans-serif; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:#7A715E; flex-shrink:0 }
  .fl-head-center { font-family:Georgia,serif; font-style:normal; font-size:14px; letter-spacing:-.01em; color:#14120D }

  .fl-body { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 48px; gap:22px; text-align:center }

  .fl-seal { width:44px; height:44px; border-radius:50%; background:#9B6B2B; color:#FAF7EE; display:flex; align-items:center; justify-content:center; font-family:Georgia,serif; font-style:italic; font-size:22px; flex-shrink:0 }

  .fl-eyebrow { font-family:Helvetica,Arial,sans-serif; font-size:10px; letter-spacing:.22em; text-transform:uppercase; color:#7A715E }

  #fl-headline { font-size:clamp(32px,5vw,60px); font-weight:400; line-height:1.06; letter-spacing:-.02em; max-width:620px }
  #fl-headline em { font-style:italic }

  #fl-body-text { font-family:Helvetica,Arial,sans-serif; font-size:15px; line-height:1.55; color:#5A5142; max-width:460px }
  #fl-body-text em { font-family:Georgia,serif; font-style:italic }

  /* OTP cells */
  #fl-otp { display:flex; gap:10px; margin-top:6px }
  #fl-otp span {
    width:48px; height:58px;
    border:1px solid #C9B887;
    display:flex; align-items:center; justify-content:center;
    font-family:'Courier New',monospace; font-size:28px; font-weight:600;
    color:#14120D; background:#F4EFE3;
    transition:border-color .12s, background .12s;
  }
  #fl-otp span.active { border-color:#14120D; border-width:2px }
  #fl-otp span.filled { background:#FAF7EE; border-color:#14120D }
  #fl-otp.error span  { border-color:#C0392B!important; animation:fl-shake .4s }
  #fl-otp.success span{ border-color:#4F5B41!important; background:#4F5B41; color:#FAF7EE }

  /* Buttons */
  .fl-btn-q { background:none; border:none; cursor:pointer; font-family:Helvetica,Arial,sans-serif; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#7A715E; padding:6px 0 }
  .fl-btn-q:hover { color:#14120D }
  .fl-btn-q:disabled { opacity:.5; cursor:default }

  #fl-msg { font-family:Helvetica,Arial,sans-serif; font-size:12px; color:#7A715E; min-height:16px }

  /* Rate-limited warning */
  .fl-warning { border-left:3px solid #C0392B; padding:12px 20px; background:#FDF0EE; text-align:left; max-width:460px }
  .fl-warning p { font-family:Helvetica,Arial,sans-serif; font-size:13px; color:#7A1F1A; line-height:1.5 }

  .fl-foot { padding:16px 48px; text-align:center; border-top:1px solid #E2DCCC; font-style:italic; font-size:13px; color:#7A715E; flex-shrink:0 }
  .fl-rule { border:none; border-top:1px solid #E2DCCC; width:48px }
</style>

<div class="fl-head">
  <span>Liber Horarum</span>
  <span class="fl-head-center">FocusLock</span>
  <span id="fl-clock"></span>
</div>

<div class="fl-body">
  <div style="display:flex;align-items:center;gap:14px">
    <hr class="fl-rule"><div class="fl-seal">F</div><hr class="fl-rule">
  </div>

  <div class="fl-eyebrow" id="fl-eyebrow">${eyebrow}</div>

  <h1 id="fl-headline">${headline}</h1>

  <p id="fl-body-text">${body}</p>

  ${ratelimited ? `
    <div class="fl-warning">
      <p>${unlocksToday} of ${dailyUnlockMax} unlocks used today. Come back at midnight.</p>
    </div>
  ` : `
    <div id="fl-otp">
      <span></span><span></span><span></span><span></span><span></span><span></span>
    </div>
    <div style="display:flex;align-items:center;gap:20px">
      <button class="fl-btn-q" id="fl-req-btn">Request a new code</button>
      <span style="width:1px;height:12px;background:#E2DCCC"></span>
      <button class="fl-btn-q" id="fl-clr-btn">Clear</button>
    </div>
    <div id="fl-msg"></div>
  `}
</div>

<div class="fl-foot">"Discipline is choosing between what you want now and what you want most."</div>
`
}

// ── Clock ─────────────────────────────────────────────────────────────────────

function runClock(root) {
  const el = root.querySelector('#fl-clock')
  if (!el) return
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  tick()
  setInterval(tick, 30_000)
}

// ── OTP interaction ───────────────────────────────────────────────────────────

function runOtp(root, hostname, label) {
  const otpEl  = root.querySelector('#fl-otp')
  if (!otpEl) return   // rate-limited state has no OTP

  const cells   = otpEl.querySelectorAll('span')
  const msgEl   = root.querySelector('#fl-msg')
  const headEl  = root.querySelector('#fl-headline')
  const eyeEl   = root.querySelector('#fl-eyebrow')
  const bodyEl  = root.querySelector('#fl-body-text')
  const reqBtn  = root.querySelector('#fl-req-btn')
  const clrBtn  = root.querySelector('#fl-clr-btn')

  let val   = ''
  let state = 'idle'

  const render = () => {
    cells.forEach((c, i) => {
      c.textContent = val[i] ?? ''
      c.className   = (i === val.length && state === 'idle') ? 'active'
                    : (val[i] ? 'filled' : '')
    })
    otpEl.className = state === 'error'   ? 'error'
                    : state === 'success' ? 'success' : ''
  }

  const msg = (text, color = '#7A715E') => {
    if (!msgEl) return
    msgEl.textContent = text
    msgEl.style.color = color
  }

  const validate = async () => {
    state = 'validating'
    msg('Verifying…')
    render()

    let resp
    try {
      resp = await chrome.runtime.sendMessage({
        type: 'VALIDATE_CODE',
        code: val,
        domain: norm(hostname),
      })
    } catch {
      state = 'idle'; val = ''; msg('Connection error.', '#C0392B'); render(); return
    }

    if (resp?.ok) {
      state = 'success'
      headEl.innerHTML = 'You may pass.<br><em style="color:#4F5B41">Briefly.</em>'
      eyeEl.textContent = 'Grace · in progress'
      bodyEl.innerHTML  = 'A ten‑minute window opens for <code style="font-family:monospace">' + hostname + '</code>. Then it closes.'
      msg('')
      render()
      setTimeout(() => { root.remove() }, 1800)
    } else {
      state = 'error'
      render()
      headEl.innerHTML = 'That is not<br><em style="color:#C0392B">the code.</em>'
      msg('Invalid or expired code.', '#C0392B')
      setTimeout(() => {
        val = ''; state = 'idle'
        headEl.innerHTML = `Sit with the urge<br>to visit <em>${label}.</em>`
        msg('')
        render()
      }, 1400)
    }
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    if (state === 'validating' || state === 'success') return
    if (e.key === 'Backspace') {
      val = val.slice(0, -1); state = 'idle'; render()
    } else if (/^\d$/.test(e.key) && val.length < 6) {
      val += e.key; state = 'idle'; render()
      if (val.length === 6) validate()
    }
  })

  // Buttons
  reqBtn?.addEventListener('click', async () => {
    reqBtn.textContent = 'Sending…'
    reqBtn.disabled = true
    try {
      const r = await chrome.runtime.sendMessage({ type: 'REQUEST_CODE', domain: norm(hostname) })
      reqBtn.textContent = r?.ok ? '✓ Sent to partner' : 'Failed — try again'
    } catch {
      reqBtn.textContent = 'Failed — try again'
    }
    setTimeout(() => { reqBtn.textContent = 'Request a new code'; reqBtn.disabled = false }, 3000)
  })

  clrBtn?.addEventListener('click', () => {
    if (state === 'validating' || state === 'success') return
    val = ''; state = 'idle'; msg(''); render()
  })

  render()
}
