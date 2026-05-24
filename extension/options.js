// ── FocusLock Options Page ────────────────────────────────────────────────────

const $ = id => document.getElementById(id)

async function init() {
  const { token, user, settings, apiUrl } = await chrome.storage.local.get(['token', 'user', 'settings', 'apiUrl'])

  // Pre-fill API URL if saved
  if (apiUrl) $('api-url').value = apiUrl

  if (token && user) {
    showAuth(user, settings)
  } else {
    showLogin()
  }
}

function showLogin() {
  $('state-login').style.display = 'block'
  $('state-auth').style.display  = 'none'
}

function showAuth(user, settings) {
  $('state-login').style.display = 'none'
  $('state-auth').style.display  = 'block'

  $('auth-name').textContent  = user.name  ?? ''
  $('auth-email').textContent = user.email ?? ''

  // Domain list
  const list = $('domain-list')
  const domains = settings?.domains ?? []
  if (domains.length === 0) {
    list.innerHTML = '<div class="domain-item" style="color:#7A715E">No domains synced yet. Click "Sync now".</div>'
  } else {
    list.innerHTML = domains.map(d => `
      <div class="domain-item">
        <span class="status-dot" style="background:#14120D"></span>
        <span>${d.domain}</span>
        ${d.category ? `<span style="margin-left:auto;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7A715E">${d.category}</span>` : ''}
      </div>
    `).join('')
  }

  // Partner info
  const p = settings?.partner
  $('partner-info').innerHTML = p
    ? `<strong style="color:#14120D">${p.name}</strong> &nbsp;·&nbsp; ${p.email} &nbsp;·&nbsp;
       <span style="letter-spacing:.1em;font-size:11px;text-transform:uppercase;color:${p.status === 'active' ? '#4F5B41' : '#9B6B2B'}">${p.status === 'active' ? '● active' : '○ pending consent'}</span>`
    : 'No partner set. Visit your account settings to add one.'
}

// ── Login ─────────────────────────────────────────────────────────────────────

$('login-btn').addEventListener('click', async () => {
  const email    = $('email').value.trim()
  const password = $('password').value
  const apiUrl   = $('api-url').value.trim()
  const errEl    = $('login-error')

  errEl.className = 'error'

  if (!email || !password) {
    errEl.textContent = 'Email and password are required.'
    errEl.className   = 'error show'
    return
  }

  $('login-btn').textContent = 'Signing in…'
  $('login-btn').disabled    = true

  // Save custom API URL if provided
  if (apiUrl) await chrome.storage.local.set({ apiUrl })

  const resp = await chrome.runtime.sendMessage({ type: 'LOGIN', email, password })

  if (resp.ok) {
    const { user, settings } = await chrome.storage.local.get(['user', 'settings'])
    showAuth(user, settings)
  } else {
    errEl.textContent = resp.data?.error ?? 'Invalid credentials'
    errEl.className   = 'error show'
    $('login-btn').textContent = 'Sign in'
    $('login-btn').disabled    = false
  }
})

// Enter key on password field
$('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('login-btn').click()
})

// ── Sync ──────────────────────────────────────────────────────────────────────

$('sync-btn').addEventListener('click', async () => {
  $('sync-btn').textContent = 'Syncing…'
  $('sync-btn').disabled    = true
  await chrome.runtime.sendMessage({ type: 'SYNC' })
  const { user, settings } = await chrome.storage.local.get(['user', 'settings'])
  showAuth(user, settings)
  $('sync-btn').textContent = '↺ Sync now'
  $('sync-btn').disabled    = false
})

// ── Logout ────────────────────────────────────────────────────────────────────

$('logout-btn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' })
  showLogin()
})

// ── Boot ──────────────────────────────────────────────────────────────────────

init()
