import type { Context, Next } from 'hono'
import { verifyToken } from '../lib/auth.js'

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization') ?? ''
  // EventSource cannot set custom headers; accept ?token= for SSE endpoints
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : (c.req.query('token') ?? null)

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const payload = await verifyToken(token)
    c.set('userId', payload.sub)
    c.set('userEmail', payload.email)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}
