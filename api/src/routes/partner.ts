import { Hono } from 'hono'
import { createHash } from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { partners, users } from '../db/schema.js'

const router = new Hono()

// GET /partner/consent/:token — standalone HTML page for the partner to accept
router.get('/consent/:token', async (c) => {
  const token = c.req.param('token')
  const hash  = sha256(token)
  const now   = new Date()

  const rows = await db.select({ id: partners.id, name: partners.name, userId: partners.userId })
    .from(partners)
    .where(and(
      eq(partners.consentTokenHash, hash),
      gt(partners.consentExpiresAt, now),
    ))

  if (rows.length === 0) {
    return c.html(page({
      title: 'Invitation expired',
      body: `
        <p>This invitation link has expired or has already been used.</p>
        <p>Ask ${'your friend'} to send a fresh one from their FocusLock settings.</p>
      `,
      action: null,
    }))
  }

  const partner = rows[0]

  // Fetch the user's name for display
  const userRows = await db.select({ name: users.name }).from(users).where(eq(users.id, partner.userId))
  const userName = userRows[0]?.name ?? 'Someone'

  return c.html(page({
    title: `${userName} has named you as their keyholder`,
    body: `
      <p>${partner.name},</p>
      <p>
        <strong>${userName}</strong> uses FocusLock to stay focused. They want you to be their
        accountability partner — the person who receives a one-time code whenever they request access
        to a blocked site. You decide whether to share it.
      </p>
      <p>
        You do not need to install anything. Each time they ask, you will receive an email.
      </p>
      <p class="pullquote">The good keyholder does not give freely. They ask why.</p>
    `,
    action: { url: `/partner/consent/${token}`, label: 'Accept the role' },
  }))
})

// POST /partner/consent/:token — confirm consent, activate partner
router.post('/consent/:token', async (c) => {
  const token = c.req.param('token')
  const hash  = sha256(token)
  const now   = new Date()

  const rows = await db.select({ id: partners.id, name: partners.name, userId: partners.userId })
    .from(partners)
    .where(and(
      eq(partners.consentTokenHash, hash),
      gt(partners.consentExpiresAt, now),
    ))

  if (rows.length === 0) {
    return c.html(page({
      title: 'Invitation expired',
      body: `<p>This invitation link has expired or has already been used.</p>`,
      action: null,
    }))
  }

  const partner = rows[0]

  await db.update(partners)
    .set({
      status:            'active',
      consentTokenHash:  null,
      consentExpiresAt:  null,
    })
    .where(eq(partners.id, partner.id))

  const userRows = await db.select({ name: users.name }).from(users).where(eq(users.id, partner.userId))
  const userName = userRows[0]?.name ?? 'your friend'

  return c.html(page({
    title: 'You are now a keyholder',
    body: `
      <p>${partner.name},</p>
      <p>
        You have accepted the role. From now on, whenever <strong>${userName}</strong> requests
        access to a blocked site, you will receive an email with a one-time code.
        You choose whether to share it.
      </p>
      <p class="pullquote">
        To step down, ask ${userName} to reassign the role in their settings.
        There is a 24-hour cooling period.
      </p>
    `,
    action: null,
  }))
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

interface PageOptions {
  title: string
  body: string
  action: { url: string; label: string } | null
}

function page({ title, body, action }: PageOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — FocusLock</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    background: #F4F7FB;
    margin: 0;
    padding: 48px 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #0D1F3C;
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  .wrap {
    max-width: 560px;
    width: 100%;
    background: #FFFFFF;
    border: 1px solid #C8D6EA;
    border-radius: 8px;
    padding: 48px 48px 40px;
    box-shadow: 0 1px 4px rgba(13,31,60,.06);
  }
  .eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #4A6FA5;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.25;
    margin: 0 0 24px;
    color: #0D1F3C;
  }
  p {
    font-size: 15px;
    line-height: 1.65;
    color: #1A3A6B;
    margin: 0 0 14px;
  }
  p strong { color: #0D1F3C; }
  .pullquote {
    font-style: italic;
    color: #2E5090;
    border-left: 3px solid #0D1F3C;
    padding-left: 16px;
    margin-top: 24px;
  }
  form { margin-top: 32px; }
  button {
    background: #0D1F3C;
    color: #FFFFFF;
    border: none;
    border-radius: 6px;
    padding: 14px 32px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background .15s;
  }
  button:hover { background: #1A3A6B; }
  .seal {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #0D1F3C;
    color: #FFFFFF;
    font-size: 22px;
    font-style: italic;
    font-family: Georgia, serif;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="seal">F</div>
  <div class="eyebrow">FocusLock · keyholder</div>
  <h1>${title}</h1>
  ${body}
  ${action ? `<form method="POST" action="${action.url}"><button type="submit">${action.label}</button></form>` : ''}
</div>
</body>
</html>`
}

export { sha256 as hashConsentToken }
export default router
