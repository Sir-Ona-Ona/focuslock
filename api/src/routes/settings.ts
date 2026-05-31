import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { domains, schedules, userSettings, partners, users } from '../db/schema.js'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  sendPartnerConsentEmail,
  sendDisableNotificationEmail,
} from '../lib/email.js'
import { hashConsentToken } from './partner.js'
import { broadcast } from './events.js'

const router = new Hono()
router.use('*', requireAuth)

// GET /settings
router.get('/', async (c) => {
  const userId = c.get('userId') as string

  const [prefs, domList, schedList, partnerRows] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    db.select().from(domains).where(eq(domains.userId, userId)),
    db.select().from(schedules).where(eq(schedules.userId, userId)),
    db.select().from(partners).where(eq(partners.userId, userId)),
  ])

  const pref    = prefs[0]
  const partner = partnerRows[0] ?? null
  const sealed  = pref?.settingsSealedUntil
    ? new Date(pref.settingsSealedUntil).getTime() > Date.now()
    : true

  return c.json({
    sealed,
    graceWindowMin: pref?.graceWindowMin ?? 10,
    dailyUnlockMax: pref?.dailyUnlockMax ?? 5,
    domains:  domList.map(d => ({ id: d.id, domain: d.domain, category: d.category })),
    schedule: schedList.map(s => ({ day: s.day, hourMask: JSON.parse(s.hourMask) as boolean[] })),
    partner: partner
      ? { name: partner.name, email: partner.email, since: partner.since, codesIssued: partner.codesIssued }
      : null,
  })
})

// PUT /settings/domains
router.put(
  '/domains',
  zValidator('json', z.object({
    domains: z.array(z.object({ domain: z.string().min(1), category: z.string().default('') })),
  })),
  async (c) => {
    const userId = c.get('userId') as string
    const { domains: incoming } = c.req.valid('json')

    if (await isSealed(userId)) return c.json({ error: 'Settings are sealed' }, 403)

    await db.delete(domains).where(eq(domains.userId, userId))
    for (const d of incoming) {
      await db.insert(domains).values({ id: randomUUID(), userId, domain: d.domain, category: d.category })
    }
    return c.json({ ok: true })
  }
)

// PUT /settings/schedule
router.put(
  '/schedule',
  zValidator('json', z.object({
    schedule: z.array(z.object({
      day:      z.number().int().min(0).max(6),
      hourMask: z.array(z.boolean()).length(24),
    })),
  })),
  async (c) => {
    const userId = c.get('userId') as string
    const { schedule } = c.req.valid('json')

    if (await isSealed(userId)) return c.json({ error: 'Settings are sealed' }, 403)

    await db.delete(schedules).where(eq(schedules.userId, userId))
    for (const row of schedule) {
      await db.insert(schedules).values({
        id: randomUUID(), userId, day: row.day, hourMask: JSON.stringify(row.hourMask),
      })
    }
    return c.json({ ok: true })
  }
)

// PUT /settings/partner
router.put(
  '/partner',
  zValidator('json', z.object({ name: z.string().min(1), email: z.string().email() })),
  async (c) => {
    const userId = c.get('userId') as string
    const { name, email } = c.req.valid('json')

    if (await isSealed(userId)) return c.json({ error: 'Settings are sealed' }, 403)

    // Generate a consent token (7-day TTL)
    const token          = randomUUID()
    const tokenHash      = hashConsentToken(token)
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const existing = await db.select().from(partners).where(eq(partners.userId, userId))
    if (existing.length > 0) {
      await db.update(partners)
        .set({ name, email, status: 'pending', consentTokenHash: tokenHash, consentExpiresAt: tokenExpiresAt })
        .where(eq(partners.userId, userId))
    } else {
      await db.insert(partners).values({
        id: randomUUID(), userId, name, email,
        status: 'pending', consentTokenHash: tokenHash, consentExpiresAt: tokenExpiresAt,
      })
    }

    // Send consent invitation (fire-and-forget)
    const userRows = await db.select({ name: users.name }).from(users).where(eq(users.id, userId))
    const apiBase  = process.env.API_BASE_URL ?? 'http://localhost:3000'
    sendPartnerConsentEmail({
      to:          email,
      partnerName: name,
      userName:    userRows[0]?.name ?? userId,
      consentUrl:  `${apiBase}/partner/consent/${token}`,
    }).catch(err => console.error('Consent email failed:', err))

    return c.json({ ok: true })
  }
)

// PUT /settings/grace
router.put(
  '/grace',
  zValidator('json', z.object({
    graceWindowMin: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
    dailyUnlockMax: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7), z.literal(10)]),
  })),
  async (c) => {
    const userId = c.get('userId') as string
    const { graceWindowMin, dailyUnlockMax } = c.req.valid('json')

    if (await isSealed(userId)) return c.json({ error: 'Settings are sealed' }, 403)

    await db.update(userSettings).set({ graceWindowMin, dailyUnlockMax }).where(eq(userSettings.userId, userId))
    return c.json({ ok: true })
  }
)

// POST /settings/unseal
router.post(
  '/unseal',
  zValidator('json', z.object({ code: z.string().length(6) })),
  async (c) => {
    const userId = c.get('userId') as string
    const { code } = c.req.valid('json')

    const { verifyOtpCode } = await import('./unlock.js')
    const valid = await verifyOtpCode(userId, code, 'settings')

    if (!valid) return c.json({ error: 'Invalid or expired code' }, 422)

    const sealedUntil = new Date(Date.now() + 60 * 60 * 1000)
    await db.update(userSettings)
      .set({ settingsSealedUntil: sealedUntil })
      .where(eq(userSettings.userId, userId))

    return c.json({ ok: true, sealedUntil: sealedUntil.toISOString() })
  }
)

// POST /settings/disable/request — start 24h cooling period
router.post('/disable/request', async (c) => {
  const userId = c.get('userId') as string

  const prefs = await db.select().from(userSettings).where(eq(userSettings.userId, userId))
  if (prefs[0]?.disableRequestedAt) {
    return c.json({ error: 'Disable already in progress' }, 409)
  }

  const requestedAt = new Date()
  const confirmsAt  = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000)

  await db.update(userSettings)
    .set({ disableRequestedAt: requestedAt, disableConfirmsAt: confirmsAt })
    .where(eq(userSettings.userId, userId))

  // Notify partner (fire-and-forget)
  const [partnerRows, userRows] = await Promise.all([
    db.select().from(partners).where(eq(partners.userId, userId)),
    db.select({ name: users.name }).from(users).where(eq(users.id, userId)),
  ])
  if (partnerRows[0] && userRows[0]) {
    sendDisableNotificationEmail({
      to:          partnerRows[0].email,
      partnerName: partnerRows[0].name,
      userName:    userRows[0].name,
      confirmsAt,
    }).catch(err => console.error('Disable notification email failed:', err))
  }

  broadcast(userId, { type: 'disable_requested', data: { confirmsAt: confirmsAt.toISOString() } })

  return c.json({ ok: true, confirmsAt: confirmsAt.toISOString() })
})

// DELETE /settings/disable/request — cancel before the cooling period elapses
router.delete('/disable/request', async (c) => {
  const userId = c.get('userId') as string

  const prefs = await db.select().from(userSettings).where(eq(userSettings.userId, userId))
  if (!prefs[0]?.disableRequestedAt) {
    return c.json({ error: 'No disable in progress' }, 404)
  }

  if (prefs[0].disableConfirmsAt && new Date(prefs[0].disableConfirmsAt) <= new Date()) {
    return c.json({ error: 'Cooling period has elapsed — confirm or re-request' }, 409)
  }

  await db.update(userSettings)
    .set({ disableRequestedAt: null, disableConfirmsAt: null })
    .where(eq(userSettings.userId, userId))

  return c.json({ ok: true })
})

// POST /settings/disable/confirm — finalise after cooling period + OTP
router.post(
  '/disable/confirm',
  zValidator('json', z.object({ code: z.string().length(6) })),
  async (c) => {
    const userId = c.get('userId') as string
    const { code } = c.req.valid('json')

    const prefs = await db.select().from(userSettings).where(eq(userSettings.userId, userId))
    const pref  = prefs[0]

    if (!pref?.disableRequestedAt || !pref?.disableConfirmsAt) {
      return c.json({ error: 'No disable in progress' }, 409)
    }

    if (new Date(pref.disableConfirmsAt) > new Date()) {
      return c.json({ error: 'Cooling period has not elapsed yet', confirmsAt: new Date(pref.disableConfirmsAt).toISOString() }, 425)
    }

    const { verifyOtpCode } = await import('./unlock.js')
    const valid = await verifyOtpCode(userId, code, 'disable')
    if (!valid) return c.json({ error: 'Invalid or expired code' }, 422)

    await db.update(userSettings)
      .set({ disabledAt: new Date(), disableRequestedAt: null, disableConfirmsAt: null })
      .where(eq(userSettings.userId, userId))

    broadcast(userId, { type: 'disable_confirmed', data: {} })

    return c.json({ ok: true })
  }
)

// ── Helper ────────────────────────────────────────────────────────────────────

async function isSealed(userId: string): Promise<boolean> {
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId))
  const pref = rows[0]
  // No record or no seal timestamp → not sealed (new users can set up freely)
  // Sealed only when settingsSealedUntil exists AND has expired
  if (!pref || !pref.settingsSealedUntil) return false
  return new Date(pref.settingsSealedUntil).getTime() < Date.now()
}

export default router
