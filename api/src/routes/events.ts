import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { requireAuth } from '../middleware/requireAuth.js'

const router = new Hono()
router.use('*', requireAuth)

export interface GraceEvent {
  type: 'grace_opened' | 'grace_closed' | 'disable_requested' | 'disable_confirmed'
  data: Record<string, unknown>
}

type Sender = (event: GraceEvent) => Promise<void>

// In-process registry: userId → live SSE connections
const listeners = new Map<string, Set<Sender>>()

export function broadcast(userId: string, event: GraceEvent): void {
  const fns = listeners.get(userId)
  if (!fns) return
  for (const fn of fns) {
    fn(event).catch(console.error)
  }
}

// GET /unlock/events
router.get('/', async (c) => {
  const userId = c.get('userId') as string

  return streamSSE(c, async (stream) => {
    const send: Sender = async (event) => {
      await stream.writeSSE({ event: event.type, data: JSON.stringify(event.data) })
    }

    if (!listeners.has(userId)) listeners.set(userId, new Set())
    listeners.get(userId)!.add(send)

    // Keep-alive pings every 25s so proxies don't close the connection
    const interval = setInterval(() => {
      stream.writeSSE({ event: 'ping', data: '' }).catch(() => {})
    }, 25_000)

    // Block until the client disconnects
    await new Promise<void>(resolve => {
      c.req.raw.signal.addEventListener('abort', resolve, { once: true })
    })

    clearInterval(interval)
    listeners.get(userId)?.delete(send)
  })
})

export default router
