import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, userSettings } from '../db/schema.js'
import { signToken } from '../lib/auth.js'
import { randomUUID } from 'node:crypto'

const router = new Hono()

const registerSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(1).max(100),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
})

// POST /auth/register
router.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, name, password } = c.req.valid('json')

  const existing = await db.select().from(users).where(eq(users.email, email))
  if (existing.length > 0) {
    return c.json({ error: 'Email already registered' }, 409)
  }

  const id = randomUUID()
  const passwordHash = await bcrypt.hash(password, 12)

  await db.insert(users).values({ id, email, name, passwordHash })
  // New account: unseal settings for 24h so onboarding can write without a code
  const onboardingWindow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await db.insert(userSettings).values({ userId: id, settingsSealedUntil: onboardingWindow })

  const token = await signToken({ sub: id, email })
  return c.json({ token, user: { id, email, name } }, 201)
})

// POST /auth/login
router.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const rows = await db.select().from(users).where(eq(users.email, email))
  const user = rows[0]
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

  const token = await signToken({ sub: user.id, email: user.email })
  return c.json({ token, user: { id: user.id, email: user.email, name: user.name } })
})

export default router
