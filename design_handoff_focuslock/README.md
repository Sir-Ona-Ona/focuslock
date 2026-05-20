# Handoff: FocusLock — "The Scriptorium"

## Overview

**FocusLock** is a focus / website-blocker product whose distinguishing premise is that
**the user does not hold the unlock key — an accountability partner does.** When the user
hits a blocked domain during their focus hours, they see a lock screen that asks for a
6-digit one-time code; that code was emailed to their partner the moment the request was
made. To pass, the user has to message / call / ask their partner for it.

The visual direction is intentional and load-bearing — the product is positioned as a
quiet, monastic, manuscript-like artifact (codenamed **"The Scriptorium"**). The friction
is the feature, and the design reinforces gravity through:

- Warm parchment / vellum / bone surfaces (never pure white)
- A serif/sans/mono trio: **Newsreader** (serif, with italic), **Geist** (sans), **JetBrains Mono** (mono)
- Roman-numeral chapter markers, italic kickers, "wax-seal" brand mark
- Bronze used only as an accent (the seal, the "now" indicator, occasional underlines)
- Crimson reserved for danger / error
- Moss green reserved for healthy / verified states
- Hairline rules and ledger-style tables rather than cards-with-shadows
- No emoji, no rounded-corner web tropes, no gradients

This package contains six surfaces of the product across desktop, browser-extension,
mobile, and email touchpoints.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes that
demonstrate intended look, copy, and behavior. They are **not production code** to be
copied directly into shipping the product. Treat them the way you would treat a Figma
file that happens to be runnable.

Your task is to **recreate these designs in the target codebase's existing environment**
using whichever framework, component library, and styling primitives that codebase
already uses (React + Tailwind, SwiftUI, Jetpack Compose, etc.). If there is no existing
environment yet, pick the most appropriate stack for the target platform and build there.

The HTML in this bundle uses inline-JSX-via-Babel for fast iteration; **do not ship that
pattern**. Translate it into idiomatic components in the target codebase.

---

## Fidelity

**High-fidelity (hifi).** Colors, typography, spacing, copy, and interactions are all
intentional and final. Match them closely. The exact hex/px values are tabulated in
**Design Tokens** below and live in `tokens.css`.

Where these designs and the existing app's design system disagree, **flag it** rather
than silently switching — the brand voice here is the product, not decoration.

---

## Surfaces / Views

There are five surfaces. Browse them visually in `FocusLock.html` (open in any browser).
Each surface has multiple states.

### I. The Lock Screen — `scripts/lockscreen.jsx` → `FLLockScreen`

The page that **replaces** a blocked website in the user's browser tab during focus
hours. This is the most-seen and most-emotional screen in the product.

**Layout (1280×800 viewport, parchment background):**

1. **Running head** — a horizontal band: italic serif "Liber Horarum · {date}" on the left,
   tracked-uppercase "FocusLock" centered, mono "II / XII" canonical hour on the right.
2. **Status strip** — tiny mono/uppercase row with a moss-green heartbeat dot ("extension · active") and partner info on the right.
3. **Manuscript margin rules** — thin crimson vertical lines 64px from each edge, top→bottom.
4. **Center column (max-width 720px, centered):**
   - 36px bronze seal flanked by two short hairlines
   - Uppercase tracked eyebrow ("The hour is not yet")
   - 64px serif headline with one italic word (e.g. "Sit with the urge to visit _Instagram_.")
   - 15px body paragraph (~480px max-width, `text-wrap: pretty`)
   - **6-digit OTP** boxes (see component spec below)
   - Tertiary actions row: "Request a new code" + "Clear", both underlined-link style
5. **Bottom ledger** — 3-column grid pinned to bottom inside content area, above the
   footer rule: **Domain** (favicon + monospace), **Time remaining** (italic serif + mono
   sub-line), **Unlocks today** (filled/empty dot row + N/M counter).
6. **Footer motto** — centered italic serif quote.

**The six states** (all in the same physical layout; copy and components change):

| State | Headline | OTP region |
|---|---|---|
| `idle` (default, interactive) | "Sit with the urge to visit _Instagram_." | 6 empty OTP boxes; typing fills them |
| `typing` | same | OTP shows entered digits, active box has ink underline |
| `validating` | "_Asking_ the bell-ringer…" | OTP boxes each contain a pulsing dot |
| `success` | "You may pass. _Briefly._" (moss color on italic) | OTP shown filled in moss; whole screen does `fl-flash-success` |
| `error` | "That is not _the code._" (crimson italic) | OTP shakes, borders crimson |
| `grace` | "_Granted._ Return when finished." | Replaced by **`FLGraceTimer`**: SVG ring countdown + "closes at 14:32" |
| `ratelimited` | "The well is dry. _Try tomorrow._" | Replaced by **`FLLockedOutGate`**: crimson-left-border warning panel |

**Interactive behavior (default / idle):**

- 6-digit numeric entry. `/^\d$/` advances, `Backspace` deletes.
- When 6 digits are entered, transition to `validating` for 900ms.
- If digits === `482917`, transition to `success`, then back to `idle` after 2200ms.
- Otherwise transition to `error`, clear input after 1400ms, return to `idle`.
- "Request a new code" briefly shows a moss check + "sent to partner" for 1400ms.

### II. The Extension — `scripts/popup.jsx` (`FLPopup`) + `scripts/settings.jsx` (`FLSettings`)

#### Popup — 320×460

What the user sees when they click the FocusLock icon next to the Chrome address bar.

- Header: lockup at 15px with "SCRIPTORIUM" tagline, mono clock on the right
- Status panel: italic serif headline ("Focus · _in progress_" or "Grace · _instagram.com_"), heartbeat dot row, optional 20-tick countdown bar
- Today's stats — 3-column FLStat row: Blocked / Unlocks / **Saved** (bronze accent)
- "Watched today" — 3-row list of `{favicon, domain, attempts}` ledger entries
- Footer: "Settings · sealed" + "Open settings →"

#### Settings — full browser tab (1280 wide, variable height)

Has two states: **unlocked** (full content) and **locked** (`<FLOtpGate>` modal over a blurred background; requires entering a code to break the seal for this session).

Two-column layout with a sticky left-side TOC ("I. Domains", "II. Schedule", …) and a main column containing six sections:

1. **Domains** — 2-column grid of `{##, favicon, mono-domain, uppercase-category}`, with a final inline "add a domain" row.
2. **Schedule** — 7-row × 24-column grid; cells flip ink-black when blocked. Hour labels every 6 hours (others are middots). A small italic-bronze "now ◂" annotation marks the current cell.
3. **The partner** — 2-column card: italic serif name + mono email | "Since" + "34 days · 18 unlocks issued".
4. **Grace & limits** — two `<NumericChoice>` controls. Each is a vellum card showing the current value as a 32px italic serif, with the picker as a horizontal row of equal-flex cells (selected cell is ink-filled with vellum text).
5. **Recent unlocks** — `FLLedgerRow` list (numbered, favicon, domain, mono-meta, mono-value).
6. **Disable** — separated by a crimson top rule. Ghost button in crimson: "Begin the cooling period".

### III. Initiation (Onboarding) — `scripts/onboarding.jsx`

Six screens, all sharing `<FLOnboardShell>` chrome:

- Running head with `cap. I — initiation`
- Hairline progress bar (6 segments) at the top
- Centered body column, max-width 820px
- Footer action bar: italic-serif "secondary" copy on the left + primary ink button on the right

Steps:

1. **Cover** — "You are about to _give away the key._" + 3-step explainer grid (I/II/III).
2. **Domains** — 3-column grid of common refuges with custom checkbox squares. Last row is an inline "add a domain" input.
3. **Hours** — re-uses `ScheduleGrid` from Settings. Legend + auto-detected timezone underneath.
4. **Partner** — 2-input card (Name in italic serif, Email in mono) + a bronze-left-bordered italic-serif "rule" pullquote.
5. **Allowances** — two `<NumericChoice>` (grace window in min, daily unlocks count) + footer motto.
6. **Covenant** — 1px-ink-bordered "document" with 5 numbered clauses on the left (`I.` through `V.` in bronze mono), and a "Witnessed by" column on the right with a 68px seal, italic name, and "email · sent · …".

### IV. Mobile — `scripts/mobile-ios.jsx`, `scripts/mobile-android.jsx`

- **iOS shield** (`FLiOSShield`) — what replaces a blocked app via Screen Time. Same vocabulary as desktop lock screen, scaled to 402×874 inside an iOS device frame. Has `default` and `grace` states.
- **iOS app** (`FLiOSApp`) — the main FocusLock iOS app.
- **Android overlay** (`FLAndroidOverlay`) — full-screen overlay served via VPN/AccessibilityService when a blocked app launches. Same vocabulary, Android-appropriate proportions.

### V. The Partner — `scripts/email.jsx` → `FLEmailClient`

A simulated mail client (3-pane: folders / message list / message) showing exactly what
the keyholder sees in their inbox when the user requests an unlock. The email is itself
designed to feel like a manuscript page — italic serif headlines, mono code in a boxed
panel, italic "from the rule" pullquote, plaintext sign-off.

The mail-client chrome is presentational only; what matters is the **message body**.
Reproduce the message-body markup; the inbox shell is just for context.

---

## Interactions & Behavior

### Lock screen (most important)

- **OTP input**: 6 cells, monospace, ink underline on the active cell, bronze underline on
  filled cells. State transitions described in the table above.
- **Auto-validate** at 6 digits — no submit button.
- **Animations**:
  - `fl-pulse` (1.2s ease-in-out infinite) — the validating-state dot
  - `fl-flash-success` (1.4s) — background flashes pale green on success
  - `shake` (0.42s) — OTP shakes horizontally on error
  - `fl-pop` (0.3s) — OTP gate appearance
  - `fl-fade-in` (any incoming text)
- **"Request a new code"** is a no-op visual; in production it would POST to the partner-email service and return success/throttle.

### Settings sealed state

When `locked`, the main content is rendered with `filter: blur(6px) saturate(0.6)` + `pointer-events: none`, with an `<FLOtpGate>` modal centered on top. Submitting a valid code unblurs and unlocks for the session.

### Onboarding

Linear: each step's primary button advances to the next; the secondary text "Or, leave with no harm done." (or a per-step variant) cancels. Step 6 transitions to the Settings (sealed) state.

### Grace window

Once a code is validated, the lock screen flips to `grace`. A countdown timer + ring runs out over (default) 10 minutes. When it hits zero, the lock screen flips back to `idle` and a fresh code is automatically dispatched to the partner.

### Rate limit

Once `unlockNum === unlockMax`, all further attempts go directly to `ratelimited`. No
new codes are issued until midnight local.

---

## State Management

Per-user, server-side:

- `domains: { domain, category }[]`
- `schedule: { day, hourMask: bool[24] }[]` — 7 rows
- `partner: { name, email, since, codesIssued }`
- `graceWindowMin: 5 | 10 | 15 | 30`
- `dailyUnlockMax: 1 | 3 | 5 | 7 | 10`
- `unlocksToday: number` (resets at local midnight)
- `currentGrace?: { domain, expiresAt }`
- `pendingCode?: { domain, codeHash, requestedAt, sentToPartnerAt }`
- `history: { domain, requestedAt, outcome, durationUsed }[]`
- `settingsSealedUntil?: Date` — session-scoped grant from a successful OTP

Per-client:

- Lock-screen local state: `entryValue`, `uiState` (`idle | validating | success | error`)
- Popup last-fetched stats
- Onboarding draft (until step 6)

### Important rules

- Codes are **delivered to the partner only**, never displayed in the user's UI.
- Disabling the product requires (a) a code, (b) 24h cooling, (c) email notice to partner. Do not provide a shortcut.
- Changing the partner requires their consent + 24h cooling.
- All state is read-only from the user's perspective once the covenant is sealed; mutations require a fresh OTP.

---

## Design Tokens

All canonical values live in `tokens.css`. Mirror these into the target codebase's token
system; do not introduce new colors or sizes ad hoc.

### Color

| Name | Hex | Use |
|---|---|---|
| `--ink` | `#14120D` | Primary text, primary button bg |
| `--ink-2` | `#211D15` | Button hover |
| `--ink-3` | `#3A332A` | Secondary text |
| `--ink-4` | `#5A5142` | Tertiary text |
| `--ink-mute` | `#7A715E` | Meta / muted labels |
| `--parchment` | `#EEEAE0` | Mid surface |
| `--paper` | `#F4EFE3` | Page background |
| `--vellum` | `#FAF7EE` | Card / panel surface |
| `--bone` | `#FDFBF5` | OTP cell, lightest surface |
| `--stone` | `#B8B2A2` | Subtle border / underline |
| `--stone-soft` | `#D3CDBD` | Favicon disk bg |
| `--stone-line` | `#E2DCCC` | Hairline rules, borders |
| `--bronze` | `#9B6B2B` | Seal, "saved" accent, "now" marker — sparingly |
| `--bronze-soft` | `#B68A48` | — |
| `--bronze-deep` | `#6E4A1A` | — |
| `--crimson` | `#7A2E26` | Errors, danger, manuscript margin |
| `--moss` | `#4F5B41` | Success, healthy heartbeat |
| Canvas surface | `#E9E3D4` | Body bg outside any `.fl-screen` |

### Typography

- `--f-serif`: `"Newsreader", "EB Garamond", "Iowan Old Style", Georgia, serif` — headlines, italic accents
- `--f-sans`: `"Geist", "Söhne", "IBM Plex Sans", -apple-system, system-ui, sans-serif` — body, UI labels
- `--f-mono`: `"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace` — dates, codes, meta

Imports (Google Fonts):

```
Newsreader (ital,opsz,wght: 0,6..72,400; 0,6..72,500; 1,6..72,400; 1,6..72,500)
Geist (wght: 400;500;600)
JetBrains Mono (wght: 400;500)
```

Font feature settings: `"ss01", "cv11"`.

Recurring sizes (px):

- Hero headline (lock): 64 / line-height 1.02 / `-0.02em`
- Onboarding/Settings H1: 46–52 / 1.05–1.06 / `-0.02em`
- Section heading H2: 28 / `-0.01em`
- Body: 14–16 / 1.5
- Eyebrow: 11 / `0.22em` tracking / uppercase / weight 500 / `--ink-mute`
- Mono meta: 10–12 / `0.04–0.16em` tracking
- OTP digit: 26 mono / weight 500

### Spacing

No fixed scale, but common values: 4, 6, 8, 10, 14, 18, 22, 28, 32, 48, 64.

Page-level padding on desktop surfaces: **48px horizontal** (or 64px on Settings / Onboarding bodies).

### Borders / Surfaces

- Hairlines: 1px `--stone-line`
- Strong rules: 1px `--ink`
- Manuscript-margin rule: 1px crimson with vertical fade
- **No border-radius** anywhere except: the bronze seal (50%), favicon disks (50%), the
  mac-window traffic lights, and the `--om-edit-overrides` block. Buttons, cards, and
  inputs are intentionally **square**.

### Shadows

- Popup: `0 18px 40px rgba(20,18,13,0.18)`
- Email window: `0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.1)`
- OTP gate modal: `0 24px 60px rgba(20,18,13,0.18)`
- Canvas intro card: `0 12px 40px rgba(20,18,13,0.12)`
- Otherwise: **no shadows** — surfaces stack via borders and contrast.

### Motion

- Easing: `cubic-bezier(.2,.7,.3,1)`
- Default duration: 150ms for hovers, 300ms for state changes, 1.4s for the success flash.

---

## Components Inventory

Each is defined inline in `scripts/atoms.jsx` or its host file. Translate each to a
real component in the target codebase.

- **`FLSeal`** — bronze circular brand mark with serif initial. Inset highlight + inner dashed ring.
- **`FLLockup`** — seal + "FocusLock" wordmark + optional all-caps tagline.
- **`FLRunningHead`** — 3-column header band: italic-serif left | tracked-uppercase center | mono right.
- **`FLOtp`** — 6-cell OTP renderer; takes `value` + `state`.
- **`FLFavicon`** — stone disk with italic serif initial. Used as a substitute for real favicons.
- **`FLLedgerRow`** — numbered ledger row (## | favicon | domain + meta | mono value).
- **`FLStat`** — large serif value + tracked uppercase label, optional bronze accent.
- **`FLIcon`** — small line-icon set (lock, clock, seal, mail, arrow, check, x, plus, eye, person, warning, shield, calendar, refresh, dot). 20×20 viewBox, 1.4 stroke.
- **`FLMotto`** — italic serif aside.
- **`FLBtn`** primary / ghost / quiet variants. **Square**. 44px tall. Ink fill, vellum text.
- **`FLLockScreen`** — the centerpiece (above).
- **`FLGraceTimer`** — SVG ring countdown.
- **`FLLockedOutGate`** — crimson-left-border warning panel.
- **`FLPopup`** — extension popup.
- **`FLSettings`**, `FLOtpGate`, `ScheduleGrid`, `NumericChoice`, `SectionHeading` — settings + its parts.
- **`FLOnboardShell`** + steps 1–6.
- **`FLiOSShield`**, `FLiOSApp`, `FLAndroidOverlay` — mobile surfaces.
- **`FLEmailClient`** — partner email view (inside a mac-window).

---

## Assets

- **Fonts**: Newsreader, Geist, JetBrains Mono — all Google Fonts, free to use.
- **Icons**: hand-drawn 20×20 SVG line set in `scripts/atoms.jsx → FLIcon`. Reuse or replace with the target codebase's icon library, but **keep the line-weight (1.4) and the unfilled style**.
- **Favicons**: deliberately not used. The `FLFavicon` stone disk is the brand-intentional substitute. Do not pull live favicons from external sites — the parchment palette breaks with realistic logos.
- **Imagery**: there is none. Adding photos or illustrations would undermine the aesthetic. If marketing requires imagery, treat it as a separate brief.

---

## Files in This Bundle

```
FocusLock.html              — entry point; open in any browser
tokens.css                  — design tokens (colors, fonts, motion, utility classes)
scripts/
  atoms.jsx                 — shared brand primitives (seal, lockup, OTP, icons, …)
  lockscreen.jsx            — the centerpiece lock screen + grace + rate-limited
  popup.jsx                 — extension popup (320×460)
  settings.jsx              — settings page + sealed-state OTP gate + schedule grid
  onboarding.jsx            — 6-step initiation flow
  mobile-ios.jsx            — iOS shield + iOS app
  mobile-android.jsx        — Android overlay
  email.jsx                 — partner email view
  canvas.jsx                — the design canvas that composes everything (not part of the product)
design-canvas.jsx           — design canvas runtime (presentational only — do not ship)
browser-window.jsx          — browser-chrome frame (presentational only)
ios-frame.jsx               — iOS device bezel (presentational only)
android-frame.jsx           — Android device bezel (presentational only)
tweaks-panel.jsx            — design-time tweaks panel (presentational only)
```

The four `*-frame.jsx` / `*-window.jsx` / `*-panel.jsx` / `design-canvas.jsx` files exist
only to present the designs side-by-side in the browser. **Do not port them**; they are
stagecraft, not product.

---

## Open Questions for the Implementer

These were not specified in the design and you'll want to confirm with the product
owner before coding:

1. **Code transport**: email only, or also SMS / push to the partner?
2. **Code TTL**: how long is an issued code valid before the partner has to request a new one?
3. **Partner consent flow**: how does the partner agree to be the keyholder in the first place? (Onboarding step 4 sends a "request" — is there a confirm step?)
4. **Cross-device sync**: if a user has the extension and the iOS app, do unlocks granted on one transfer to the other?
5. **Timezone**: the design auto-detects (`africa/lagos` is shown as an example). Confirm DST behavior at hour boundaries.
6. **Accessibility**: the parchment palette is warm but contrast must still hit WCAG AA — verify ink-on-vellum (passes) but flag ink-mute-on-paper for small text.
