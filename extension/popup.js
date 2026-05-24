// ── FocusLock Popup ───────────────────────────────────────────────────────────

const $ = id => document.getElementById(id)

function showState(name) {
  for (const s of ['loading', 'noauth', 'open', 'grace', 'blocked']) {
    $(`state-${s}`).style.display = s === name ? 'flex' : 'none'
  }
}

// Clock
const tick = () => {
  $('clock').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
tick(); setInterval(tick, 30_000)

// Options links
$('options-link').addEventListener('click', () => chrome.runtime.openOptionsPage())
$('open-options-btn')?.addEventListener('click', () => chrome.runtime.openOptionsPage())

// ── Init ──────────────────────────────────────────────────────────────────────

;(async () => {
  showState('loading')

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let hostname = ''
  try { hostname = new URL(tab?.url ?? '').hostname } catch {}

  // Check auth
  const { token, user } = await chrome.storage.local.get(['token', 'user'])
  if (!token) { showState('noauth'); return }

  // Get status for current domain
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS', hostname })

  // Unlock counter
  if (status.unlocksToday !== undefined) {
    $('unlock-count').textContent = `${status.unlocksToday} / ${status.dailyUnlockMax} unlocks`
  }

  if (!hostname || !status.blocked) {
    $('open-domain').textContent = hostname || 'No domain'
    $('open-sub').textContent = status.blocked
      ? 'Restricted but grace is active.'
      : 'This domain is not on your blocked list, or the current hour is open.'
    showState('open')
    return
  }

  if (status.inGrace) {
    const until = status.graceUntil
      ? new Date(status.graceUntil).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '—'
    $('grace-until').textContent = until
    showState('grace')
    return
  }

  // Blocked — show OTP
  $('blocked-domain').textContent = hostname
  showState('blocked')
  setupOtp(hostname)
})()

// ── OTP ───────────────────────────────────────────────────────────────────────

function setupOtp(hostname) {
  const otpEl = $('otp')
  const cells = otpEl.querySelectorAll('span')
  const msgEl = $('msg')
  const reqBtn = $('req-btn')
  const clrBtn = $('clr-btn')

  let val = '', state = 'idle'

  const render = () => {
    cells.forEach((c, i) => {
      c.textContent = val[i] ?? ''
      c.className   = i === val.length && state === 'idle' ? 'active' : val[i] ? 'filled' : ''
    })
    otpEl.className = state === 'error' ? 'error' : state === 'success' ? 'success' : ''
  }

  const msg = (t, c = '#7A715E') => { msgEl.textContent = t; msgEl.style.color = c }

  const validate = async () => {
    state = 'validating'; msg('Verifying…'); render()
    const nd = hostname.replace(/^www\./, '')
    let resp
    try {
      resp = await chrome.runtime.sendMessage({ type: 'VALIDATE_CODE', code: val, domain: nd })
    } catch { state = 'idle'; val = ''; msg('Connection error.', '#C0392B'); render(); return }

    if (resp?.ok) {
      state = 'success'; render()
      msg('Granted. The window is open.', '#4F5B41')
      setTimeout(() => window.close(), 1600)
    } else {
      state = 'error'; render()
      msg('Invalid or expired.', '#C0392B')
      setTimeout(() => { val = ''; state = 'idle'; msg(''); render() }, 1400)
    }
  }

  document.addEventListener('keydown', e => {
    if (state === 'validating' || state === 'success') return
    if (e.key === 'Backspace') { val = val.slice(0, -1); state = 'idle'; render() }
    else if (/^\d$/.test(e.key) && val.length < 6) {
      val += e.key; state = 'idle'; render()
      if (val.length === 6) validate()
    }
  })

  reqBtn.addEventListener('click', async () => {
    reqBtn.textContent = 'Sending…'; reqBtn.disabled = true
    const nd = hostname.replace(/^www\./, '')
    try {
      const r = await chrome.runtime.sendMessage({ type: 'REQUEST_CODE', domain: nd })
      reqBtn.textContent = r?.ok ? '✓ Sent' : 'Failed'
    } catch { reqBtn.textContent = 'Failed' }
    setTimeout(() => { reqBtn.textContent = 'Request code'; reqBtn.disabled = false }, 2500)
  })

  clrBtn.addEventListener('click', () => {
    if (state === 'validating' || state === 'success') return
    val = ''; state = 'idle'; msg(''); render()
  })

  render()
}
