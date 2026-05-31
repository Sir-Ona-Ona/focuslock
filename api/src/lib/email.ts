// ── Brevo (transactional email) ───────────────────────────────────────────────
// Docs: https://developers.brevo.com/reference/sendtransacemail

const BREVO_API = 'https://api.brevo.com/v3/smtp/email'

// Sender address — must be verified in your Brevo account.
// Set BREVO_FROM=Your Name <you@example.com> as a Fly secret,
// or it defaults to the Brevo test sender.
const FROM_RAW  = process.env.BREVO_FROM ?? 'FocusLock <jaypihcaresforall@gmail.com>'
const FROM_NAME  = FROM_RAW.replace(/<.*>/, '').trim() || 'FocusLock'
const FROM_EMAIL = (FROM_RAW.match(/<(.+)>/) ?? [])[1] ?? FROM_RAW

async function send(to: string, subject: string, html: string) {
  const key = process.env.BREVO_API_KEY
  if (!key) {
    console.warn('[email] BREVO_API_KEY not set — skipping send')
    return
  }

  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      key,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender:  { name: FROM_NAME, email: FROM_EMAIL },
      to:      [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Brevo send failed: ${JSON.stringify(err)}`)
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

interface UnlockEmailParams {
  to: string
  partnerName: string
  userName: string
  domain: string
  code: string
  asksToday: number
  dailyMax: number
  hour: string
}

export async function sendUnlockEmail(p: UnlockEmailParams) {
  const digits  = p.code.split('').join(' ')
  const subject = `${p.userName} wants to access ${friendlyDomain(p.domain)}`

  return send(p.to, subject, `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { background:#F4F7FB; margin:0; padding:40px 0; font-family:system-ui,sans-serif; color:#0D1F3C; }
  .wrap { max-width:560px; margin:0 auto; background:#fff; border:1px solid #C8D6EA; border-radius:8px; padding:40px 48px; }
  .eyebrow { font-size:10px; letter-spacing:.22em; text-transform:uppercase; color:#4A6FA5; font-weight:700; }
  h1 { margin:8px 0 0; font-size:24px; font-weight:700; line-height:1.2; color:#0D1F3C; }
  .meta { font-family:monospace; font-size:11px; color:#4A6FA5; margin-top:6px; }
  p { font-size:14px; line-height:1.6; color:#1A3A6B; margin:14px 0 0; }
  .code-box { margin:28px 0; border:2px solid #0D1F3C; border-radius:6px; background:#F4F7FB; padding:20px 28px; display:flex; justify-content:space-between; align-items:center; }
  .code { font-family:monospace; font-size:36px; font-weight:700; letter-spacing:.14em; color:#0D1F3C; }
  .code-note { font-family:monospace; font-size:10px; color:#4A6FA5; margin-top:6px; letter-spacing:.06em; }
  .seal { width:52px; height:52px; border-radius:8px; background:#0D1F3C; color:#fff; font-size:26px; font-style:italic; display:inline-flex; align-items:center; justify-content:center; font-family:Georgia,serif; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:8px; }
  .grid-label { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#4A6FA5; font-weight:700; margin-bottom:4px; }
  .grid-val { font-size:18px; font-weight:600; color:#0D1F3C; }
  .note { font-size:13px; font-style:italic; color:#2E5090; margin-top:24px; }
  hr { border:0; border-top:1px solid #C8D6EA; margin:24px 0; }
  .footer { font-size:12px; color:#4A6FA5; line-height:1.55; }
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">FocusLock · unlock request</div>
  <h1>${p.userName} wants to access ${friendlyDomain(p.domain)}.</h1>
  <div class="meta">to: ${p.to} · ${nowStamp()}</div>

  <p>${p.partnerName},</p>
  <p>${p.userName} has asked to open <code>${p.domain}</code>. You agreed to be the one who decides.</p>

  <div class="code-box">
    <div>
      <div class="eyebrow">One-time code</div>
      <div class="code">${digits}</div>
      <div class="code-note">single use · expires 24h</div>
    </div>
    <div class="seal">F</div>
  </div>

  <div class="grid">
    <div>
      <div class="grid-label">Today's count</div>
      <div class="grid-val">${p.asksToday} / ${p.dailyMax}</div>
    </div>
    <div>
      <div class="grid-label">The hour</div>
      <div class="grid-val">${p.hour}</div>
    </div>
  </div>

  <p class="note">You are not obliged to share it. The good keyholder asks why.</p>

  <hr />
  <p class="footer">
    Sent by FocusLock on behalf of <strong>${p.userName}</strong>.
    To step down as keyholder, ask ${p.userName} to choose another — there is a 24-hour cooling period.
  </p>
</div>
</body>
</html>`)
}

interface PartnerConsentEmailParams {
  to: string
  partnerName: string
  userName: string
  consentUrl: string
}

export async function sendPartnerConsentEmail(p: PartnerConsentEmailParams) {
  return send(p.to, `${p.userName} has named you as their FocusLock keyholder`, `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { background:#F4F7FB; margin:0; padding:40px 0; font-family:system-ui,sans-serif; color:#0D1F3C; }
  .wrap { max-width:560px; margin:0 auto; background:#fff; border:1px solid #C8D6EA; border-radius:8px; padding:40px 48px; }
  .eyebrow { font-size:10px; letter-spacing:.22em; text-transform:uppercase; color:#4A6FA5; font-weight:700; }
  h1 { margin:8px 0 0; font-size:24px; font-weight:700; color:#0D1F3C; }
  p { font-size:14px; line-height:1.6; color:#1A3A6B; margin:14px 0 0; }
  .cta { display:inline-block; margin-top:28px; background:#0D1F3C; color:#fff; font-size:14px; font-weight:600; letter-spacing:.04em; text-decoration:none; padding:14px 32px; border-radius:6px; }
  .note { font-size:13px; font-style:italic; color:#2E5090; margin-top:24px; }
  hr { border:0; border-top:1px solid #C8D6EA; margin:24px 0; }
  .footer { font-size:12px; color:#4A6FA5; line-height:1.55; }
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">FocusLock · keyholder invitation</div>
  <h1>${p.userName} has named you as their accountability partner.</h1>
  <p>${p.partnerName},</p>
  <p>${p.userName} uses FocusLock to stay focused. They have chosen you as their keyholder — the person who receives a one-time code whenever they request access to a blocked site. You decide whether to share it.</p>
  <p>You do not need to install anything. Each time ${p.userName} asks, you will receive an email.</p>
  <a href="${p.consentUrl}" class="cta">Accept the role</a>
  <p class="note">The good keyholder does not give freely. They ask why.</p>
  <hr />
  <p class="footer">If you do not wish to be a keyholder, simply ignore this email. The link expires in 7 days.</p>
</div>
</body>
</html>`)
}

interface DisableNotificationEmailParams {
  to: string
  partnerName: string
  userName: string
  confirmsAt: Date
}

export async function sendDisableNotificationEmail(p: DisableNotificationEmailParams) {
  const confirmsStr = p.confirmsAt.toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })

  return send(p.to, `${p.userName} has requested to disable FocusLock`, `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { background:#F4F7FB; margin:0; padding:40px 0; font-family:system-ui,sans-serif; color:#0D1F3C; }
  .wrap { max-width:560px; margin:0 auto; background:#fff; border:1px solid #C8D6EA; border-radius:8px; padding:40px 48px; }
  .eyebrow { font-size:10px; letter-spacing:.22em; text-transform:uppercase; color:#4A6FA5; font-weight:700; }
  h1 { margin:8px 0 0; font-size:24px; font-weight:700; color:#0D1F3C; }
  p { font-size:14px; line-height:1.6; color:#1A3A6B; margin:14px 0 0; }
  .warning { border-left:3px solid #B91C1C; padding:12px 18px; margin-top:22px; background:#FEF2F2; border-radius:0 4px 4px 0; }
  .warning p { color:#B91C1C; margin:0; }
  .confirms { margin-top:22px; }
  .confirms-label { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#4A6FA5; font-weight:700; margin-bottom:4px; }
  .confirms-val { font-size:18px; font-weight:600; color:#0D1F3C; }
  hr { border:0; border-top:1px solid #C8D6EA; margin:24px 0; }
  .footer { font-size:12px; color:#4A6FA5; }
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">FocusLock · disable notice</div>
  <h1>${p.userName} wants to remove FocusLock.</h1>
  <p>${p.partnerName},</p>
  <p>${p.userName} has initiated the 24-hour cooling period to disable FocusLock. After this period they will request a final confirmation code from you. You may choose not to share it.</p>
  <div class="warning"><p>If this was not intentional, ask ${p.userName} to cancel before the 24 hours elapse.</p></div>
  <div class="confirms">
    <div class="confirms-label">Earliest confirmation</div>
    <div class="confirms-val">${confirmsStr}</div>
  </div>
  <hr />
  <p class="footer">Sent by FocusLock on behalf of <strong>${p.userName}</strong>.</p>
</div>
</body>
</html>`)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function friendlyDomain(domain: string): string {
  const map: Record<string, string> = {
    'instagram.com': 'Instagram', 'x.com': 'X / Twitter',
    'twitter.com': 'Twitter', 'tiktok.com': 'TikTok',
    'reddit.com': 'Reddit', 'youtube.com': 'YouTube',
    'facebook.com': 'Facebook', 'threads.net': 'Threads',
    'linkedin.com/feed': 'LinkedIn feed',
  }
  return map[domain] ?? domain
}

function nowStamp(): string {
  return new Date().toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}
