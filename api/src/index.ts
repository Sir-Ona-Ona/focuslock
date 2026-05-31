import 'node:process'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { initDb } from './db/index.js'
import authRouter from './routes/auth.js'
import settingsRouter from './routes/settings.js'
import unlockRouter from './routes/unlock.js'
import partnerRouter from './routes/partner.js'
import eventsRouter from './routes/events.js'
import { startMidnightCron } from './lib/cron.js'

// Initialise DB tables on startup (async)
await initDb()
startMidnightCron()

const app = new Hono()

app.use('*', logger())

app.use('*', cors({
  origin: (origin) => {
    // Allow any Netlify/Vercel preview + localhost
    if (!origin) return '*'
    if (origin.includes('localhost')) return origin
    if (origin.includes('.netlify.app')) return origin
    if (origin.includes('.vercel.app')) return origin
    // Add your custom domain here if you have one
    return origin
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }))

// Routes
app.route('/auth', authRouter)
app.route('/settings', settingsRouter)
app.route('/unlock', unlockRouter)
app.route('/partner', partnerRouter)
app.route('/unlock/events', eventsRouter)

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Global error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`FocusLock API running on http://localhost:${port}`)
  console.log(`  POST /auth/register`)
  console.log(`  POST /auth/login`)
  console.log(`  GET  /settings`)
  console.log(`  PUT  /settings/domains`)
  console.log(`  PUT  /settings/schedule`)
  console.log(`  PUT  /settings/partner`)
  console.log(`  PUT  /settings/grace`)
  console.log(`  POST /settings/unseal`)
  console.log(`  GET  /unlock/status?domain=`)
  console.log(`  POST /unlock/request`)
  console.log(`  POST /unlock/validate`)
  console.log(`  GET  /unlock/history`)
  console.log(`  GET  /unlock/events         (SSE)`)
  console.log(`  GET  /partner/consent/:token`)
  console.log(`  POST /partner/consent/:token`)
  console.log(`  POST /settings/disable/request`)
  console.log(`  DELETE /settings/disable/request`)
  console.log(`  POST /settings/disable/confirm`)
})
