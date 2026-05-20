import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM ?? 'FocusLock <noreply@focuslock.app>'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? 'dummy')
  return _resend
}

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
  const digits = p.code.split('').join(' ')
  const subject = `${p.userName} wants to access ${friendlyDomain(p.domain)}`

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { background: #F4EFE3; margin: 0; padding: 40px 0; font-family: Georgia, serif; color: #14120D; }
  .wrap { max-width: 580px; margin: 0 auto; background: #FAF7EE; border: 1px solid #E2DCCC; padding: 40px 48px; }
  .eyebrow { font-family: Helvetica, Arial, sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #7A715E; }
  h1 { margin: 8px 0 0; font-size: 28px; font-weight: 400; line-height: 1.2; }
  h1 em { font-style: italic; }
  .meta { font-family: monospace; font-size: 11px; color: #7A715E; margin-top: 8px; }
  p { font-size: 14px; line-height: 1.6; color: #3A332A; margin: 16px 0 0; }
  .code-box { margin: 28px 0; border: 1px solid #14120D; background: #F4EFE3; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center; }
  .code { font-family: monospace; font-size: 34px; font-weight: 600; letter-spacing: 0.12em; color: #14120D; }
  .code-note { font-family: monospace; font-size: 10px; color: #7A715E; margin-top: 6px; letter-spacing: 0.06em; }
  .seal { width: 56px; height: 56px; border-radius: 50%; background: #9B6B2B; color: #FAF7EE; font-size: 28px; font-style: italic; display: inline-flex; align-items: center; justify-content: center; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 4px; }
  .grid-label { font-family: Helvetica, Arial, sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #7A715E; margin-bottom: 4px; }
  .grid-val { font-size: 17px; font-style: italic; }
  .pullquote { font-style: italic; font-size: 14px; color: #5A5142; line-height: 1.55; margin-top: 26px; }
  hr { border: 0; border-top: 1px solid #E2DCCC; margin: 24px 0; }
  .footer { font-size: 12px; color: #7A715E; line-height: 1.55; }
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">FocusLock · no-reply@focuslock.app</div>
  <h1>${p.userName} wants to access <em>${friendlyDomain(p.domain)}.</em></h1>
  <div class="meta">to: ${p.to} · ${nowStamp()}</div>

  <p>${p.partnerName},</p>
  <p>
    ${p.userName} has asked to open <code>${p.domain}</code>. You agreed to be the one who decides.
  </p>

  <div class="code-box">
    <div>
      <div class="eyebrow">The code</div>
      <div class="code">${digits}</div>
      <div class="code-note">single use · invalid after entry · expires 24h</div>
    </div>
    <div class="seal">F</div>
  </div>

  <div class="grid">
    <div>
      <div class="grid-label">Today's count</div>
      <div class="grid-val">${p.asksToday} of ${p.dailyMax} asks</div>
    </div>
    <div>
      <div class="grid-label">The hour</div>
      <div class="grid-val">${p.hour}</div>
    </div>
  </div>

  <p class="pullquote">You are not obliged to share it. The good keyholder asks why.</p>

  <hr />

  <p class="footer">
    Sent by FocusLock on behalf of <strong style="color:#3A332A">${p.userName}</strong>.
    To step down as keyholder, ask ${p.userName} to choose another — there is a 24-hour cooling period.
  </p>
</div>
</body>
</html>
`

  return getResend().emails.send({ from: FROM, to: p.to, subject, html })
}

interface PartnerConsentEmailParams {
  to: string
  partnerName: string
  userName: string
  consentUrl: string
}

export async function sendPartnerConsentEmail(p: PartnerConsentEmailParams) {
  return getResend().emails.send({
    from: FROM,
    to: p.to,
    subject: `${p.userName} has named you as their FocusLock keyholder`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { background: #F4EFE3; margin: 0; padding: 40px 0; font-family: Georgia, serif; color: #14120D; }
  .wrap { max-width: 580px; margin: 0 auto; background: #FAF7EE; border: 1px solid #E2DCCC; padding: 40px 48px; }
  .eyebrow { font-family: Helvetica, Arial, sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #7A715E; }
  h1 { margin: 8px 0 0; font-size: 28px; font-weight: 400; line-height: 1.2; }
  p { font-size: 14px; line-height: 1.6; color: #3A332A; margin: 16px 0 0; }
  .cta { display: inline-block; margin-top: 28px; background: #14120D; color: #FAF7EE; font-family: Helvetica, Arial, sans-serif; font-size: 13px; letter-spacing: 0.08em; text-decoration: none; padding: 14px 28px; }
  .pullquote { font-style: italic; font-size: 14px; color: #5A5142; line-height: 1.55; margin-top: 26px; }
  hr { border: 0; border-top: 1px solid #E2DCCC; margin: 24px 0; }
  .footer { font-size: 12px; color: #7A715E; line-height: 1.55; }
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">FocusLock · keyholder invitation</div>
  <h1>${p.userName} has named you as their accountability partner.</h1>

  <p>${p.partnerName},</p>
  <p>
    ${p.userName} uses FocusLock to stay focused. They have chosen you as their keyholder —
    the person who receives a one-time code whenever they request access to a blocked site.
    You decide whether to share it.
  </p>
  <p>
    You do not need to install anything. Each time ${p.userName} asks, you will receive an email.
  </p>

  <a href="${p.consentUrl}" class="cta">Accept the role</a>

  <p class="pullquote">The good keyholder does not give freely. They ask why.</p>

  <hr />

  <p class="footer">
    If you do not wish to be a keyholder, simply ignore this email.
    The link expires in 7 days. ${p.userName} can send a new invitation at any time.
  </p>
</div>
</body>
</html>
`,
  })
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

  return getResend().emails.send({
    from: FROM,
    to: p.to,
    subject: `${p.userName} has requested to disable FocusLock`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { background: #F4EFE3; margin: 0; padding: 40px 0; font-family: Georgia, serif; color: #14120D; }
  .wrap { max-width: 580px; margin: 0 auto; background: #FAF7EE; border: 1px solid #E2DCCC; padding: 40px 48px; }
  .eyebrow { font-family: Helvetica, Arial, sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #7A715E; }
  h1 { margin: 8px 0 0; font-size: 28px; font-weight: 400; line-height: 1.2; }
  p { font-size: 14px; line-height: 1.6; color: #3A332A; margin: 16px 0 0; }
  .warning { border-left: 3px solid #C0392B; padding: 12px 20px; margin-top: 24px; background: #FDF0EE; }
  .warning p { color: #7A1F1A; margin: 0; }
  .grid-label { font-family: Helvetica, Arial, sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #7A715E; margin-bottom: 4px; margin-top: 24px; }
  .grid-val { font-size: 17px; font-style: italic; }
  hr { border: 0; border-top: 1px solid #E2DCCC; margin: 24px 0; }
  .footer { font-size: 12px; color: #7A715E; line-height: 1.55; }
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">FocusLock · disable notice</div>
  <h1>${p.userName} wants to remove FocusLock.</h1>

  <p>${p.partnerName},</p>
  <p>
    ${p.userName} has initiated the 24-hour cooling period to disable FocusLock entirely.
    After this period ends, they will request a final confirmation code from you.
    You may choose not to share it.
  </p>

  <div class="warning">
    <p>If this was not intentional, ask ${p.userName} to cancel — they can do so before the 24 hours elapse.</p>
  </div>

  <div class="grid-label">Earliest confirmation</div>
  <div class="grid-val">${confirmsStr}</div>

  <hr />

  <p class="footer">
    Sent by FocusLock on behalf of <strong style="color:#3A332A">${p.userName}</strong>.
  </p>
</div>
</body>
</html>
`,
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function friendlyDomain(domain: string): string {
  const map: Record<string, string> = {
    'instagram.com': 'Instagram',
    'x.com': 'X / Twitter',
    'twitter.com': 'Twitter',
    'tiktok.com': 'TikTok',
    'reddit.com': 'Reddit',
    'youtube.com': 'YouTube',
    'facebook.com': 'Facebook',
    'threads.net': 'Threads',
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
