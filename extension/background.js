// ── FocusLock Service Worker ──────────────────────────────────────────────────

const DEFAULT_API = 'https://focuslock-production-faa2.up.railway.app'

async function getApi() {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  return apiUrl || DEFAULT_API
}

async function getToken() {
  const { token } = await chrome.storage.local.get('token')
  return token || null
}

async function apiFetch(path, opts = {}) {
  const [api, token] = await Promise.all([getApi(), getToken()])
  const res = await fetch(`${api}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  })
  return res
}

// ── Sync settings from API ────────────────────────────────────────────────────

async function syncSettings() {
  const token = await getToken()
  if (!token) return

  try {
    const res = await apiFetch('/settings')
    if (res.ok) {
      const data = await res.json()
      await chrome.storage.local.set({ settings: data })
    }
  } catch (err) {
    console.warn('[FocusLock] sync failed:', err)
  }
}

// ── Domain / schedule check ───────────────────────────────────────────────────

function normHost(h) {
  return h.replace(/^www\./, '').toLowerCase()
}

function domainIsBlocked(hostname, settings) {
  if (!settings?.domains?.length) return false
  const nh = normHost(hostname)
  return settings.domains.some(d => {
    const nd = normHost(d.domain)
    return nh === nd || nh.endsWith('.' + nd)
  })
}

function inSchedule(settings) {
  if (!settings?.schedule?.length) return true // no schedule = always blocked
  const now  = new Date()
  const day  = (now.getDay() + 6) % 7  // 0=Mon … 6=Sun
  const hour = now.getHours()
  const row  = settings.schedule.find(s => s.day === day)
  if (!row) return false // day not in schedule = open
  return Array.isArray(row.hourMask) ? row.hourMask[hour] === true : false
}

function graceActive(graceWindows, hostname) {
  const nd = normHost(hostname)
  const entry = graceWindows?.[nd]
  return entry && new Date(entry) > new Date()
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  ;(async () => {
    switch (msg.type) {

      case 'GET_STATUS': {
        const { settings, graceWindows = {} } = await chrome.storage.local.get(['settings', 'graceWindows'])
        const blocked  = domainIsBlocked(msg.hostname, settings) && inSchedule(settings)
        const nd       = normHost(msg.hostname)
        const inGrace  = graceActive(graceWindows, msg.hostname)
        const graceUntil = graceWindows[nd] ?? null

        const { dailyUnlockMax, unlocksToday } = await getDailyInfo(settings)
        const ratelimited = !inGrace && (unlocksToday ?? 0) >= (dailyUnlockMax ?? 5)

        sendResponse({ blocked, inGrace, graceUntil, ratelimited, unlocksToday, dailyUnlockMax })
        break
      }

      case 'REQUEST_CODE': {
        try {
          const res = await apiFetch('/unlock/request', {
            method: 'POST',
            body: JSON.stringify({ domain: msg.domain, purpose: 'unlock' }),
          })
          sendResponse({ ok: res.ok })
        } catch {
          sendResponse({ ok: false })
        }
        break
      }

      case 'VALIDATE_CODE': {
        try {
          const res = await apiFetch('/unlock/validate', {
            method: 'POST',
            body: JSON.stringify({ code: msg.code, domain: msg.domain, purpose: 'unlock' }),
          })
          const data = await res.json()
          if (res.ok && data.graceExpiresAt) {
            const { graceWindows = {} } = await chrome.storage.local.get('graceWindows')
            graceWindows[normHost(msg.domain)] = data.graceExpiresAt
            await chrome.storage.local.set({ graceWindows })
          }
          sendResponse({ ok: res.ok, data })
        } catch {
          sendResponse({ ok: false, data: {} })
        }
        break
      }

      case 'LOGIN': {
        try {
          const api = await getApi()
          const res = await fetch(`${api}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: msg.email, password: msg.password }),
          })
          const data = await res.json()
          if (res.ok) {
            await chrome.storage.local.set({ token: data.token, user: data.user })
            await syncSettings()
          }
          sendResponse({ ok: res.ok, data })
        } catch (err) {
          sendResponse({ ok: false, data: { error: err.message } })
        }
        break
      }

      case 'LOGOUT': {
        await chrome.storage.local.remove(['token', 'user', 'settings', 'graceWindows'])
        sendResponse({ ok: true })
        break
      }

      case 'GET_STORE': {
        const data = await chrome.storage.local.get(msg.keys)
        sendResponse(data)
        break
      }

      case 'SYNC': {
        await syncSettings()
        sendResponse({ ok: true })
        break
      }
    }
  })()
  return true // keep channel open for async
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getDailyInfo(settings) {
  const token = await getToken()
  if (!token) return {}
  try {
    const api = await getApi()
    const res = await fetch(`${api}/unlock/status?domain=`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      return {
        unlocksToday:   d.unlocksToday  ?? 0,
        dailyUnlockMax: d.dailyMax      ?? settings?.dailyUnlockMax ?? 5,
      }
    }
  } catch {}
  return {}
}

// ── Periodic sync ─────────────────────────────────────────────────────────────

chrome.alarms.create('sync', { periodInMinutes: 5 })
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'sync') syncSettings()
})

// Expire stale grace windows every minute
chrome.alarms.create('expire-grace', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'expire-grace') return
  const { graceWindows = {} } = await chrome.storage.local.get('graceWindows')
  const now = new Date()
  let changed = false
  for (const [k, v] of Object.entries(graceWindows)) {
    if (new Date(v) <= now) { delete graceWindows[k]; changed = true }
  }
  if (changed) await chrome.storage.local.set({ graceWindows })
})

chrome.runtime.onStartup.addListener(syncSettings)
chrome.runtime.onInstalled.addListener(({ reason }) => {
  syncSettings()
  if (reason === 'install') {
    chrome.tabs.create({ url: 'options.html' })
  }
})
