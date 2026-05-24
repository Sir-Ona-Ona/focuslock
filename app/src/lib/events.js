// ── FocusLock SSE client ──────────────────────────────────────────────────────
//
// Singleton EventSource that opens one connection per browser tab.
// Components call subscribe(eventType, callback) and get back an unsubscribe fn.
// The connection is opened lazily on the first subscriber and closed when the
// last subscriber unsubscribes.
//
// EventSource cannot send custom headers, so the JWT is passed as ?token=…
// The backend requireAuth middleware accepts it from the query string.

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** @type {EventSource | null} */
let es = null

/** Map<eventType, Set<callback>> */
const handlers = new Map()

function getToken() {
  return localStorage.getItem('fl_token')
}

function dispatch(type, data) {
  const fns = handlers.get(type)
  if (!fns) return
  fns.forEach(fn => {
    try { fn(data) } catch (e) { console.error('[SSE] handler error', e) }
  })
}

function connect() {
  const token = getToken()
  if (!token) return // not authenticated; will retry on next subscribe call

  const url = `${BASE}/unlock/events?token=${encodeURIComponent(token)}`
  es = new EventSource(url)

  es.onopen = () => {
    console.debug('[SSE] connected')
  }

  // Named events sent by the backend
  const EVENTS = ['grace_opened', 'grace_closed', 'disable_requested', 'disable_confirmed']
  EVENTS.forEach(type => {
    es.addEventListener(type, e => {
      let data = {}
      try { data = JSON.parse(e.data) } catch {}
      dispatch(type, data)
    })
  })

  // Keep-alive ping — ignore
  es.addEventListener('ping', () => {})

  es.onerror = () => {
    // EventSource auto-reconnects after a 3s back-off; nothing to do here
    console.debug('[SSE] connection error — will auto-retry')
  }
}

function totalSubscribers() {
  let n = 0
  handlers.forEach(set => { n += set.size })
  return n
}

/**
 * Subscribe to a single SSE event type.
 *
 * @param {'grace_opened'|'grace_closed'|'disable_requested'|'disable_confirmed'} eventType
 * @param {(data: object) => void} callback
 * @returns {() => void} unsubscribe function — call it in useEffect cleanup
 */
export function subscribe(eventType, callback) {
  if (!handlers.has(eventType)) handlers.set(eventType, new Set())
  handlers.get(eventType).add(callback)

  // Open connection on first subscriber
  if (!es) connect()

  return function unsubscribe() {
    handlers.get(eventType)?.delete(callback)

    // Close connection when nobody is listening
    if (totalSubscribers() === 0 && es) {
      es.close()
      es = null
      console.debug('[SSE] disconnected (no subscribers)')
    }
  }
}

/**
 * Force a reconnect — useful after login when the token changes.
 */
export function reconnect() {
  if (es) { es.close(); es = null }
  if (totalSubscribers() > 0) connect()
}
