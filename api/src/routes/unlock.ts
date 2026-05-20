import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, gt, isNull, desc } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import {
  otpCodes, graceWindows, unlockHistory,
  dailyCounters, userSettings, partners, users,
} from '../db/schema.js'
import { generateOtp, hashOtp, verifyOtp, ttlDate, localDateString } from '../lib/otp.js'
import { sendUnlockEmail } from '../lib/email.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { broadcast } from './events.js'

const router = new Hono()
router.use('*', requireAuth)

const OTP_TTL = Number(process.env.OTP_TTL_SECONDS ?? 86400)

// GET /unlock/status?domain=
router.get('/status', async (c) => {
  const userId = c.get('userId') as string
  const domain = c.req.query('domain') ?? ''
  const now    = new Date()

  // Active grace window?
  const grace = await db.select().from(graceWindows)
    .where(and(
      eq(graceWindows.userId, userId),
      eq(graceWindows.domain, domain),
      gt(graceWindows.expiresAt, now),
    ))

  if (grace.length > 0) {
    return c.json({ state: 'grace', expiresAt: grace[0].expiresAt })
  }

  // Rate limited?
  const today   = localDateString()
  const [prefs, counter] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    db.select().from(dailyCounters)
      .where(and(eq(dailyCounters.userId, userId), eq(dailyCounters.date, today))),
  ])
  const unlocksToday = counter[0]?.unlocks ?? 0
  const dailyMax     = prefs[0]?.dailyUnlockMax ?? 5

  if (unlocksToday >= dailyMax) {
    return c.json({ state: 'ratelimited', unlocksToday, dailyMax })
  }

  return c.json({ state: 'idle', unlocksToday, dailyMax })
})

// POST /unlock/request
router.post(
  '/request',
  zValidator('json', z.object({
    domain:  z.string().default(''),
    purpose: z.enum(['unlock', 'settings', 'disable']).default('unlock'),
  })),
  async (c) => {
    const userId = c.get('userId') as string
    const { domain, purpose } = c.req.valid('json')

    // Rate limit check (unlock only)
    if (purpose === 'unlock') {
      const today = localDateString()
      const [prefs, counter] = await Promise.all([
        db.select().from(userSettings).where(eq(userSettings.userId, userId)),
        db.select().from(dailyCounters)
          .where(and(eq(dailyCounters.userId, userId), eq(dailyCounters.date, today))),
      ])
      if ((counter[0]?.unlocks ?? 0) >= (prefs[0]?.dailyUnlockMax ?? 5)) {
        return c.json({ error: 'Daily unlock limit reached', state: 'ratelimited' }, 429)
      }
    }

    // Expire previous unused codes for this purpose
    await db.update(otpCodes)
      .set({ usedAt: new Date() })
      .where(and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.usedAt),
      ))

    // Generate and store
    const plainCode = generateOtp()
    const codeHash  = await hashOtp(plainCode)
    const expiresAt = ttlDate(OTP_TTL)
    const codeId    = randomUUID()

    await db.insert(otpCodes).values({ id: codeId, userId, domain, codeHash, purpose, expiresAt })

    // Email partner (fire-and-forget on failure)
    const [partnerRows, userRows] = await Promise.all([
      db.select().from(partners).where(eq(partners.userId, userId)),
      db.select().from(users).where(eq(users.id, userId)),
    ])
    const partner = partnerRows[0]
    const user    = userRows[0]

    if (partner && user) {
      const today = localDateString()
      const [prefs, counter] = await Promise.all([
        db.select().from(userSettings).where(eq(userSettings.userId, userId)),
        db.select().from(dailyCounters)
          .where(and(eq(dailyCounters.userId, userId), eq(dailyCounters.date, today))),
      ])
      const asksToday = (counter[0]?.unlocks ?? 0) + 1

      try {
        await sendUnlockEmail({
          to:          partner.email,
          partnerName: partner.name,
          userName:    user.name,
          domain,
          code:        plainCode,
          asksToday,
          dailyMax:    prefs[0]?.dailyUnlockMax ?? 5,
          hour:        new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
          }),
        })
        await db.update(otpCodes).set({ sentAt: new Date() }).where(eq(otpCodes.id, codeId))
      } catch (err) {
        console.error('Email delivery failed:', err)
      }
    }

    return c.json({ ok: true, message: 'Code sent to partner' })
  }
)

// POST /unlock/validate
router.post(
  '/validate',
  zValidator('json', z.object({
    code:    z.string().length(6),
    domain:  z.string().min(1),
    purpose: z.enum(['unlock', 'settings', 'disable']).default('unlock'),
  })),
  async (c) => {
    const userId = c.get('userId') as string
    const { code, domain, purpose } = c.req.valid('json')

    const valid = await verifyOtpCode(userId, code, purpose)

    if (!valid) {
      if (purpose === 'unlock') {
        await db.insert(unlockHistory).values({ id: randomUUID(), userId, domain, outcome: 'denied' })
      }
      return c.json({ valid: false, error: 'Invalid or expired code' }, 422)
    }

    if (purpose === 'unlock') {
      const prefs      = await db.select().from(userSettings).where(eq(userSettings.userId, userId))
      const graceMin   = prefs[0]?.graceWindowMin ?? 10
      const expiresAt  = ttlDate(graceMin * 60)

      const today   = localDateString()
      const counter = await db.select().from(dailyCounters)
        .where(and(eq(dailyCounters.userId, userId), eq(dailyCounters.date, today)))

      await Promise.all([
        db.insert(graceWindows).values({ id: randomUUID(), userId, domain, expiresAt }),
        counter.length > 0
          ? db.update(dailyCounters)
              .set({ unlocks: counter[0].unlocks + 1 })
              .where(and(eq(dailyCounters.userId, userId), eq(dailyCounters.date, today)))
          : db.insert(dailyCounters).values({ id: randomUUID(), userId, date: today, unlocks: 1 }),
        db.insert(unlockHistory).values({ id: randomUUID(), userId, domain, outcome: 'validated' }),
      ])

      broadcast(userId, { type: 'grace_opened', data: { domain, expiresAt: expiresAt.toISOString() } })

      return c.json({ valid: true, graceExpiresAt: expiresAt.toISOString() })
    }

    return c.json({ valid: true })
  }
)

// GET /unlock/history
router.get('/history', async (c) => {
  const userId = c.get('userId') as string

  const rows = await db.select().from(unlockHistory)
    .where(eq(unlockHistory.userId, userId))
    .orderBy(desc(unlockHistory.requestedAt))
    .limit(50)

  return c.json({ history: rows })
})

// ── Exported helper ───────────────────────────────────────────────────────────

export async function verifyOtpCode(
  userId: string,
  code: string,
  purpose: string,
): Promise<boolean> {
  const now = new Date()

  const rows = await db.select().from(otpCodes)
    .where(and(
      eq(otpCodes.userId, userId),
      eq(otpCodes.purpose, purpose),
      isNull(otpCodes.usedAt),
      gt(otpCodes.expiresAt, now),
    ))
    .orderBy(desc(otpCodes.requestedAt))
    .limit(1)

  if (rows.length === 0) return false

  const match = await verifyOtp(code, rows[0].codeHash)
  if (!match) return false

  await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, rows[0].id))
  return true
}

export default router
