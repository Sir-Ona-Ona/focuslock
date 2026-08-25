# Cairn: build specification

**For:** Claude Code
**From:** the Cairn product spec and the clickable prototype
**Status:** ready to implement
**Date:** 2026-08-25

---

## 0. How to use this document

This is the implementation contract. It is meant to be dropped into the repo root as
`CAIRN-BUILD.md` and read before every phase.

Three companion artefacts:

| Artefact | What it is | How to treat it |
|----------|-----------|-----------------|
| Product spec | Why the thing exists, decisions and their reasoning | The authority on intent. When this document and the spec disagree, the spec wins on intent and this one wins on mechanism |
| Prototype | A single-file HTML app with sample data | The authority on layout, state rendering and copy. Read it before building any screen. It is not the code to port; it is the picture to match |
| This document | Schema, policies, routes, tools, phases | The authority on how |

**Read section 2 before writing any code.** It is the list of things that look like ordinary
product decisions and are not. Every one of them has already been argued and settled, and each
is enforceable in the database rather than by convention.

---

## 1. What you are building

A planning application for a household of up to six people. Its core is three tracks: one
individual plan per person, plus a joint plan for what commits two of them together. Plans are
organised into seven fixed domains, carry milestones with dated targets, and are reviewed on a
schedule.

The value is not the CRUD. It is that the discipline of the method becomes **computed rather
than remembered**: a milestone that has moved three times, a commitment that has rolled over
three review periods, a joint item proposed but not agreed for two cycles, an assumption untested past its
date, an hour demand that exceeds a stated ceiling. In a document these depend on someone
noticing. Here they are queries.

Build them as queries. That is the whole product.

---

## 2. Invariants

These are enforced at the database or the type layer, never by convention or by prompt.
If an implementation makes one of them a matter of care rather than a matter of structure,
the implementation is wrong.

**I-1. A member can never write into another member's individual track.**
Not through an import, an admin path, a bulk operation, or a model tool call. RLS rejects it
regardless of what the client or the model sends.

**I-2. A principal cannot agree their own joint proposal.**
`agreed_by_member_id <> proposed_by_member_id`, enforced by policy and by check constraint.
If one person can agree their own item, the state becomes decorative within a month.

**I-2b. Agreement and execution are separate questions.**
A joint milestone carries `agreement` (`proposed` | `agreed` | `active`) and `status`
(`on_track` | `at_risk` | ...) as independent columns. A `proposed` item has no execution status
at all: it is not yet part of the plan, so it cannot be behind on anything. The UI renders no
status for it and the rules engine excludes it from every status detector.

Collapsing the two into one field is the mistake this invariant exists to prevent. "Do we agree
this belongs in our plan" and "how is it going" are different questions, and an item marked
`at_risk` before both people agreed it exists is answering the second before the first.

**I-3. There is no combined weight and no combined total on a joint decision.**
`decision_weight` is keyed `(criterion_id, member_id)`. There is no column, view, or computed
field in which an averaged weight could be stored, and no UI that displays one. Two weightings
are shown side by side, always.

**I-4. Private items are readable by exactly one code path.**
Reviews, sessions, briefs, prep, exports and every other model context exclude them by scope,
not by prompt. Collision detection is the only reader, only when both principals opted in, and
every read writes a `private_read_log` row.

**I-5. A finding derived from a private item routes to that item's owner alone.**
It never reaches the other member, in any form, including a bare count or a notification that
one exists. The owner decides whether to raise it.

**I-6. Nothing is deleted.**
Dropped items keep their IDs and stay queryable. `milestone_move` rows accumulate. Log entries
are append-only. Soft delete everywhere, hard delete only on household deletion.

**I-7. Claude never counts.**
Every computed rule is a SQL query whose result is injected into the prompt as structured
context. The model runs the conversation. It is never asked to tally moves, rollovers, cycles
or hours. This is the single most important architectural rule in the system.

**I-8. Domain order is fixed and seeded.**
`FTH, FAM, FIN, CAR, REL, LRN, HLT`, by `sort_order`. Never re-sorted in a query, a component,
or a prompt.

**I-9. A proactive finding fires on a threshold, never on judgement.**
Every finding class is a row in `finding_rule` with a numeric bar and a window. The model never
decides that something is worth mentioning. It writes up what the engine already decided to
surface. A finding class with no numeric bar cannot be registered.

**I-10. Three findings per cycle, one of them at most from outside knowledge.**
Enforced in the surfacing query, not in the prompt. Advice fatigue kills this layer faster than
wrong advice, and a bad quarter that generates fourteen findings must surface three.

**I-11. A dismissed finding stays dismissed for its window, and `not_relevant` is permanent.**
No rephrasing, no raising it obliquely, no "as a question". Enforced by the suppression table
being consulted in the surfacing query before anything reaches a prompt.

**I-12b. Session state is derived from elapsed time, never stored alongside it.**
The current block, minutes remaining, and the position of the minute-150 cutoff are all computed
from one number. Storing both `elapsed` and `current_block` guarantees they will disagree, and a
planning tool whose own clock contradicts itself has no standing to tell anyone their dates are
wrong.

**I-12c. The decision weight budget is exactly 100 and the matrix will not run otherwise.**
`sum(weight) = 100` per member per decision, checked before any total is computed. The interface
says "you have 100 points"; allowing 137 quietly turns that into "assign whatever importance you
like", which is a different method with a different meaning. Show what is left to place, and hold
the matrix until it balances.

**I-12d. Confirmation, resolution and decision records are append-only.**
Agreeing a joint item appends an event to its history. It never overwrites a note or a field.
The same for closing a collision and for deciding. The audit trail is the product: in three
years the valuable question is not what the status is, it is what you believed when you chose.

**I-12e. The method is data, and every record is stamped with the version it was made under.**
Domain order, cadences, timeboxes, agenda blocks, rule thresholds and prompt text live in
`method_setting`, versioned per household. A review run in March under v3 is never reinterpreted
under v7: `session_row`, `finding`, `decision` and `advisory_review` each carry
`method_version_id`. Without that stamp the logs become uninterpretable the first time the method
changes, and the method changed six times before the first line of code was written.

**I-12f. Everything is editable. Anything that reduces the other member's protection takes two
keys.**
Nothing in Cairn is locked. But a setting one principal can change alone, which weakens what the
other principal is protected by, is not a preference: it is a unilateral edit to a two-party
agreement. Those settings carry `tier = 'two_key'` and go through `method_change_request`,
approved by the other principal, exactly like adding a member.

The distinction is not strictness, it is who bears the consequence. A cadence is yours to change.
The rule that you cannot agree your own proposal is what the other person relies on, and it
should not be switchable by the person it constrains at the moment it inconveniences them.

**I-12. Three attempts, then permanent silence.**
A finding neither acted on nor dismissed surfaces once more, escalates once onto the joint
session agenda, then goes quiet forever unless its evidence materially changes. A system that
raises the same thing indefinitely gets routed around.

---

## 3. Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 15, App Router | Server components and server actions. No public REST API in v1 |
| Hosting | Vercel | |
| Database | Supabase Postgres | RLS is the enforcement mechanism for I-1, I-2, I-4 |
| Auth | Supabase Auth, email OTP | No passwords in v1 |
| ORM | Drizzle | Migrations in the repo. RLS policies live in raw SQL migrations, not in Drizzle |
| Model | `@anthropic-ai/sdk`, server only | Tool use with typed handlers. Never a browser-side key |
| Styling | Tailwind, light and dark | Tokens mirror the prototype |
| Charts | Hand-built inline SVG | The timeline is bespoke. Do not add a charting library |
| Scheduling | Vercel Cron | Prep briefs, cadence reminders, collision scans |
| Testing | Vitest, plus a dedicated RLS suite | See section 12 |

### Environment

```
DATABASE_URL=                  # Supabase pooled connection, for the app
DIRECT_URL=                    # direct connection, for migrations only
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # migrations and cron only. Never in a request path
ANTHROPIC_API_KEY=             # server only
CRON_SECRET=                   # guards /api/cron/*
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It appears in exactly two places: the migration
runner and the cron entrypoint, and the cron entrypoint re-enters member scope before touching
member data. Any other use is a bug.

---

## 4. Repo layout

```
app/
  (auth)/sign-in/page.tsx
  (app)/
    layout.tsx                 # shell: sidebar, viewer context, theme
    page.tsx                   # home
    track/[memberId]/page.tsx  # individual track, own or another's
    joint/page.tsx
    timeline/page.tsx
    session/[id]/page.tsx
    decision/[id]/page.tsx
    logs/page.tsx
    settings/
      members/page.tsx
      privacy/page.tsx         # includes the private read log
  api/
    cron/collisions/route.ts
    cron/prep/route.ts
    cron/cadence/route.ts
lib/
  db/
    schema.ts                  # Drizzle tables
    client.ts                  # withMember() transaction helper
    migrations/                # generated + hand-written RLS SQL
  rules/
    slippage.ts  rollover.ts  agreement.ts  assumptions.ts  load.ts  index.ts
  method/
    accessor.ts                # method(tx): the only way to read a setting
    seed/                      # the six skills, as seed data for the canonical method
      life-plan.ts  life-review.ts  life-timeline.ts
      strategy-meeting.ts  decision-brief.ts  plan-advisor.ts
    change.ts                  # solo edits and two-key requests
  claude/
    client.ts
    tools.ts                   # typed tool definitions and handlers
    assemble.ts                # builds a system prompt from method settings, never from a literal
  auth/
    session.ts                 # resolve auth user to member
components/
  plan/  timeline/  decision/  session/  ui/
tests/
  rls/                         # every policy, both directions
  rules/                       # every computed rule
CAIRN-BUILD.md
```

---

## 5. Data model

Drizzle, `lib/db/schema.ts`. Types shown are the intent; write idiomatic Drizzle.

### 5.1 Enums

```ts
export const memberRole   = pgEnum('member_role', ['principal','dependent','advisor']);
export const trackKind    = pgEnum('track_kind', ['individual','joint']);
export const claimStatus  = pgEnum('claim_status', ['unclaimed','claimed']);
export const domainCode   = pgEnum('domain_code', ['FTH','FAM','FIN','CAR','REL','LRN','HLT']);
export const horizon      = pgEnum('horizon', ['now','next','later','beyond']);
export const msStatus     = pgEnum('ms_status',
  ['on_track','at_risk','slipped','blocked','done','parked','dropped']);
export const agreement    = pgEnum('agreement', ['proposed','agreed','active']);
export const confidence   = pgEnum('confidence', ['high','medium','low']);
export const asmState     = pgEnum('asm_state', ['open','confirmed','broken','expired_untested']);
export const depNature    = pgEnum('dep_nature', ['hard','soft']);
export const collKind     = pgEnum('coll_kind', ['information','weighting','values']);
export const collStatus   = pgEnum('coll_status', ['open','resolved','accepted']);
export const sessionMode  = pgEnum('session_mode', ['individual','joint']);
export const sessionKind  = pgEnum('session_kind', ['review','strategy']);
export const commitStatus = pgEnum('commit_status', ['open','done','rolled','dropped']);
export const decisionScope= pgEnum('decision_scope', ['individual','joint']);
export const decisionState= pgEnum('decision_state', ['open','decided','deferred','dropped']);
```

### 5.2 Household and members

```ts
household = {
  id: uuid pk,
  name: text,
  createdAt: timestamptz,
  cadenceIndividualDays: integer default 7,
  cadenceJointDays: integer default 14,
  tbReviewIndividual: integer default 30,     // minutes
  tbReviewJoint: integer default 45,
  tbSessionIndividual: integer default 60,
  tbSessionJoint: integer default 210,
  deletedAt: timestamptz nullable
}

member = {
  id: uuid pk,
  householdId: uuid -> household,
  userId: uuid -> auth.users, nullable until invite accepted,
  displayName: text,
  role: memberRole,
  privateReadOptIn: boolean default false,    // I-4. Per member, their own items
  privateReadOptInAt: timestamptz nullable,
  invitedByMemberId: uuid nullable,
  joinedAt: timestamptz nullable,
  deletedAt: timestamptz nullable
}
```

Constraints, as SQL in the migration:

```sql
-- at most 6 live members per household
create unique index member_seat_idx on member (household_id, seat_no)
  where deleted_at is null;
alter table member add column seat_no smallint not null
  check (seat_no between 1 and 6);

-- at most 2 principals
create unique index member_principal_idx on member (household_id, principal_slot)
  where role = 'principal' and deleted_at is null;
alter table member add column principal_slot smallint
  check (principal_slot in (1,2));
alter table member add constraint principal_slot_iff_principal
  check ((role = 'principal') = (principal_slot is not null));
```

### 5.3 Tracks and content

```ts
track = {
  id: uuid pk,
  householdId: uuid -> household,
  kind: trackKind,
  ownerMemberId: uuid nullable,               // null for joint
  claimStatus: claimStatus default 'unclaimed',
  claimedAt: timestamptz nullable,
  northStar: text nullable,
  version: integer default 1
}
// exactly one joint track per household; one individual track per non-advisor member
```

```ts
domain = { code: domainCode pk, name: text, sortOrder: smallint }   // seeded, 7 rows, I-8

goal = { id, trackId, domainCode, horizon, text, sortOrder }

milestone = {
  id: uuid pk,
  trackId: uuid -> track,
  domainCode,
  ref: text unique,                           // M-O-FTH-01, generated, immutable
  title: text,
  note: text nullable,
  targetDate: date,
  originalTargetDate: date not null,          // set once on insert, never updated
  status: msStatus nullable,                  // null while agreement = 'proposed' (I-2b)
  statusReason: text nullable,                // required when parked or dropped
  agreement: agreement nullable,              // joint tracks only
  proposedByMemberId: uuid nullable,
  agreedByMemberId: uuid nullable,
  agreedAt: timestamptz nullable,
  isPrivate: boolean default false,           // individual tracks only
  completedAt: timestamptz nullable,
  createdAt, updatedAt
}
```

Constraints:

```sql
-- an assumed income with nothing building it is the F-5 finding, not a data error,
-- so it is allowed to exist and is detected rather than rejected
alter table income add constraint assumed_income_flagged
  check (not is_assumed or built_by_milestone_id is not null or true);

alter table obligation add constraint one_off_has_date
  check (kind <> 'one_off' or starts_on is not null);
alter table obligation add constraint recurring_has_span
  check (kind <> 'recurring' or starts_on is not null);

alter table milestone add constraint parked_needs_reason
  check (status is null or status not in ('parked','dropped') or status_reason is not null);

-- I-2: nobody agrees their own proposal
alter table milestone add constraint no_self_agree
  check (agreed_by_member_id is null
         or agreed_by_member_id <> proposed_by_member_id);

-- I-2b: a proposed item has no execution status, an agreed one must have one
alter table milestone add constraint status_follows_agreement
  check (agreement is null                        -- individual tracks
         or (agreement = 'proposed' and status is null)
         or (agreement in ('agreed','active') and status is not null));

-- privacy only on individual tracks, confirmation only on joint
alter table milestone add constraint private_only_individual
  check (not is_private or (select kind from track t where t.id = track_id) = 'individual');
```

```ts
milestoneMove = {
  id, milestoneId, fromDate: date, toDate: date,
  movedAt: timestamptz, movedByMemberId, reason: text nullable
}

// I-12d: agreement history is appended, never a mutated note
milestoneEvent = {
  id, milestoneId,
  event: 'proposed'|'agreed'|'edit_proposed'|'sent_to_session'|'activated',
  byMemberId, at: timestamptz, note: text nullable
}
```

`milestoneMove` is the slippage history as rows. Move count is `count(*)`, the original date is
`originalTargetDate`. **Never store slippage as a string in a note.** This table is why the
three-moves rule is enforceable.

```ts
assumption = {
  id, trackId, domainCode, ref: text unique,
  statement: text, confidence, testBy: date,
  state: asmState default 'open', resolvedAt: timestamptz nullable,
  carriedReviewCount: integer default 0
}
assumptionMilestone = { assumptionId, milestoneId }     // composite pk

risk = { id, trackId, domainCode, ref, statement, likelihood, impact, mitigation, ownerMemberId }

constraintRow = {                                        // "constraint" is reserved
  id, trackId, ref, statement, agreedAt: date, source: text, isHard: boolean default false
}

domainLoad = {
  id, trackId, domainCode,
  hoursPerWeek: numeric(4,1), hoursPerWeekBad: numeric(4,1) nullable,
  statedAt: timestamptz
}
capacity = {
  trackId pk, ceilingHoursPerWeek: numeric(4,1), earlySignal: text, statedAt: timestamptz
}

// ---- money capacity: the exact parallel of hours capacity ----
income = {
  id, trackId, label: text,
  kind: 'salary'|'business'|'rental'|'other',
  amountMonthly: numeric(14,2), currency: char(3),
  confidence, startsOn: date, endsOn: date nullable,
  isAssumed: boolean default false,             // income the plan needs but nobody has yet
  builtByMilestoneId: uuid nullable             // null on an assumed income is finding F-5
}

obligation = {
  id, trackId, domainCode,
  milestoneId: uuid nullable,                   // what in the plan this pays for
  label: text,
  kind: 'recurring'|'one_off',
  amount: numeric(14,2), currency: char(3),
  startsOn: date, endsOn: date nullable,        // one_off uses startsOn as the landing date
  committed: boolean default false,             // committed vs intended, and they behave differently
  statedAt: timestamptz
}

reserve = {
  trackId pk,
  amount: numeric(14,2), currency: char(3),
  targetMonths: numeric(4,1), statedAt: timestamptz
}

fxAssumption = {
  id, householdId, base: char(3), quote: char(3),
  rate: numeric(14,6), assumptionId: uuid nullable,   // links to the assumption carrying it
  statedAt: timestamptz
}
pendingItem = {
  id, trackId, raisedByMemberId, raisedAt, text,
  status: 'open' | 'actioned' | 'dismissed'
}
```

### 5.4 Cross-track

```ts
dependency = {
  id, householdId, fromMilestoneId, toMilestoneId, nature: depNature, note
}
collision = {
  id, householdId, ref: text,                  // X-01
  tension: text, tracks: uuid[], domains: domainCode[],
  contestedFrom: date, contestedTo: date,
  kind: collKind nullable, status: collStatus default 'open',
  resolvedByDecisionId: uuid nullable,
  acceptedCost: text nullable,                 // required when status = 'accepted'
  nextStep: text nullable, nextStepOwnerMemberId, nextStepDue: date,
  derivedFromPrivate: boolean default false,   // I-5
  visibleToMemberId: uuid nullable,            // I-5: set when derivedFromPrivate
  openedAt: timestamptz, closedAt: timestamptz nullable
}
gate = {
  id, householdId, ref, title, decideBy: date, trigger: text,
  tracks: uuid[], domains: domainCode[],
  outcomes: text[],                             // the real set of ways it can resolve
  status: 'open'|'closed', closedByDecisionId nullable
}
```

`collision.openedAt` makes "open for 99 days" a computed field.
`derivedFromPrivate` plus `visibleToMemberId` is how I-5 is enforced in the data rather than in
the notification layer.

```ts
// I-12d again: how a collision closed, appended and never edited
collisionEvent = {
  id, collisionId,
  event: 'opened'|'accepted'|'resolved'|'next_step_set'|'reopened',
  byMemberId, at: timestamptz,
  acceptedCost: text nullable, costCarriedByMemberId: uuid nullable,
  nextStep: text nullable, nextStepOwnerMemberId: uuid nullable, nextStepDue: date nullable,
  decisionId: uuid nullable
}
```

```sql
alter table collision add constraint accepted_needs_cost
  check (status <> 'accepted' or (accepted_cost is not null
         and cost_carried_by_member_id is not null));
alter table collision add constraint open_needs_next_step
  check (status <> 'open' or next_step is null or
         (next_step_owner_member_id is not null and next_step_due is not null));
alter table collision add constraint private_derived_is_scoped
  check (not derived_from_private or visible_to_member_id is not null);
```

### 5.5 Sessions, commitments, decisions

```ts
sessionRow = {
  id, householdId, kind: sessionKind, mode: sessionMode,
  methodVersionId: uuid,                       // I-12e: which method this was run under
  actorMemberIds: uuid[],
  plannedMinutes: integer, startedAt, endedAt,
  gapDays: integer nullable,                   // computed against the previous same-mode session
  blockLog: jsonb,                             // [{n, label, plannedMin, actualMin}]
  summary: jsonb, transcriptRef: text nullable
}
sessionChange = {
  id, sessionId, entityType: text, entityId: uuid,
  field: text, fromValue: text, toValue: text, reason: text
}
commitment = {
  id, sessionId, householdId, text, ownerMemberId, dueDate: date,
  status: commitStatus default 'open',
  rolledFromCommitmentId: uuid nullable
}
```

Rollover depth is the length of the `rolledFromCommitmentId` chain, computed with a recursive
CTE. Never a counter column, which drifts.

```ts
decision = {
  id, householdId, ref, scope: decisionScope, ownerMemberId nullable,
  methodVersionId: uuid,                       // I-12e
  title, question: text, decideBy: date,
  state: decisionState default 'open',
  outcome: text, costAccepted: text, revisitConditions: text,
  decidedAt, decidedInSessionId, gateId nullable
}
decisionOption   = { id, decisionId, key: char(1), label, description, isStatusQuo: boolean }
decisionCriterion= { id, decisionId, key: text, label, derivedFrom: text }
decisionWeight   = { id, criterionId, memberId, weight: smallint, unique(criterionId, memberId) }
decisionScore    = { id, optionId, criterionId, score: smallint check 1..5, rationale }

// staging is a legitimate outcome, and it is the one most easily abused
decisionStage = {
  decisionId pk,
  informationBought: text not null,             // what is actually being purchased
  ownerMemberId: uuid not null,                 // who owns buying it
  finalDecideBy: date not null,                 // the date staging ends
  usedAt: timestamptz
}

// I-12d: what was believed at the time, which is what matters in three years
decisionRecord = {
  id, decisionId,
  chosenOptionId, because: text,
  uncertainAtTheTime: text,
  reconsiderIf: text, reviewDate: date nullable,
  supersedesDecisionId: uuid nullable, supersededByDecisionId: uuid nullable,
  decidedByMemberIds: uuid[], decidedAt: timestamptz
}
privateReadLog   = { id, itemType, itemId, ownerMemberId, readAt, purpose, runId }
```

### 5.6 The method

The six skills stop being prompt files and become seed data for a versioned, editable method.
This is the layer that makes the product a product: a household runs a method, and the method is
theirs to change.

```ts
export const settingTier = pgEnum('setting_tier', ['solo','two_key']);

methodVersion = {
  id: uuid pk,
  householdId: uuid nullable,          // null = the canonical method Cairn ships
  version: integer,
  label: text,                          // "faith first, health last"
  basedOnVersionId: uuid nullable,
  createdByMemberId: uuid nullable,
  createdAt: timestamptz,
  note: text,                           // why it changed. Required
  active: boolean
}

methodSetting = {
  id: uuid pk,
  methodVersionId: uuid -> methodVersion,
  key: text,                            // 'structure.domain_order'
  value: jsonb,
  defaultValue: jsonb,                  // the canonical value, for "reset" and for diffing
  tier: settingTier default 'solo',
  protects: text nullable,              // who is worse off if this is weakened. Required on two_key
  rationale: text,                      // the argument the setting encodes, shown when editing
  UNIQUE (methodVersionId, key)
}

methodChangeRequest = {                 // the two-key path (I-12f)
  id, householdId, key,
  fromValue: jsonb, toValue: jsonb,
  requestedByMemberId, requestedAt, reason: text not null,
  approvedByMemberId: uuid nullable, approvedAt: timestamptz nullable,
  status: 'pending'|'approved'|'declined'|'withdrawn',
  declineReason: text nullable
}
```

Constraints:

```sql
alter table method_setting add constraint two_key_names_who
  check (tier <> 'two_key' or (protects is not null and length(btrim(protects)) > 0));

-- I-12f: the requester is never the approver
alter table method_change_request add constraint no_self_approve
  check (approved_by_member_id is null
         or approved_by_member_id <> requested_by_member_id);

alter table method_version add constraint change_needs_reason
  check (length(btrim(note)) > 0);
```

#### Setting keys, seeded from the skills

| Key | Tier | From |
|-----|------|------|
| `structure.domains` | solo | `life-plan` schema. Code, name, sort order |
| `structure.domain_order` | solo | FTH, FAM, FIN, CAR, REL, LRN, HLT |
| `cadence.individual_days` / `cadence.joint_days` | solo | 7 / 14 |
| `timebox.review_individual` / `review_joint` | solo | 30 / 45 |
| `timebox.session_individual` / `session_joint` | solo | 60 / 210 |
| `session.joint.blocks` | solo | the nine blocks from `partner-agenda` |
| `session.cutoff_minute` | solo | 150 |
| `rules.slippage_moves` | solo | 3 |
| `rules.rollover_limit` | solo | 3 |
| `rules.proposed_cycles` | solo | 2 |
| `rules.assumption_cycles` | solo | 3 |
| `decision.weight_budget` | solo | 100 |
| `decision.tie_band` | solo | 8 |
| `advisory.per_cycle` / `advisory.reference_per_batch` | solo | 3 / 1 |
| `advisory.thresholds.*` | solo | the registry in `plan-advisor` |
| `prompts.*` | solo | the six skill bodies, one row each |
| `protection.self_agreement` | **two_key** | protects the other principal |
| `protection.no_weight_averaging` | **two_key** | protects the other principal |
| `protection.private_scope` | **two_key** | protects the item's owner |
| `protection.private_routing` | **two_key** | protects the item's owner |
| `protection.cross_member_findings` | **two_key** | protects the member the finding is about |
| `protection.append_only` | **two_key** | protects both, and every future reader |

Every setting carries a `rationale`: the argument it encodes, shown at the point of editing.
"Faith opens as a filter because a constraint stated after the goals it should have bounded
arrives too late to do any work" is not documentation, it is the thing the person editing needs
in front of them.

#### Reading the method

One accessor, cached per request, never a literal in code:

```ts
const m = await method(tx);          // resolves the household's active version
m.get('rules.slippage_moves')        // 3
m.domains()                          // ordered
m.prompt('review')                   // the review system prompt
m.versionId                          // stamped onto everything this request writes
```

Any hardcoded 3, 150, 100 or domain list in application code is a bug. Grep for them in review.

#### Changing the method

- **solo**: write a new `methodVersion` based on the active one, change the setting, activate.
  Reason required. Reversible: activating an older version is itself a new version.
- **two_key**: write a `methodChangeRequest`. The other principal approves or declines with a
  reason. On approval the version is written and activated. Nothing is locked, and nobody edits
  the other person's protection alone.

The warning shown before a two-key request names the protection, who relies on it, and what
becomes possible without it. Not "are you sure": "Leroo currently relies on you not being able to
agree your own proposals. Turning this off means a joint item can enter the plan with only your
agreement."

### 5.7 Advisory layer

```ts
export const findingKind  = pgEnum('finding_kind', ['pattern','critique','scenario','reference']);
export const findingState = pgEnum('finding_state',
  ['queued','surfaced','escalated','acted','dismissed','silenced']);
export const dismissReason= pgEnum('dismiss_reason',
  ['already_known','not_true','not_now','not_relevant']);

findingRule = {                                  // the registry, seeded, one row per class
  code: text pk,                                 // 'P-1', 'C-3', 'S-2', 'R-1'
  kind: findingKind,
  title: text,
  bar: jsonb,                                    // the numeric threshold, machine readable
  windowDays: integer,
  minHistoryDays: integer default 0,             // P classes require 56
  domainsExcluded: domainCode[],                 // R classes exclude FTH, FAM, HLT
  enabled: boolean default true
}

finding = {
  id: uuid pk,
  householdId, ruleCode -> findingRule,
  kind: findingKind,
  subjectType: text, subjectIds: uuid[],         // what it is about
  evidence: jsonb,                               // the numbers, computed. Never model output
  observation: text,                             // line 1: what is true
  window: text,                                  // line 2: over what window
  reading: text,                                 // line 3: what it might mean, marked as a reading
  disconfirm: text,                              // line 4: what would show this is wrong
  severity: numeric(6,2),                        // blast_radius x window_pressure x persistence
  visibleToMemberIds: uuid[],                    // both principals, or one, never crossed
  derivedFromPrivate: boolean default false,
  state: findingState default 'queued',
  methodVersionId: uuid,                         // I-12e
  surfacedCount: integer default 0,
  firstTrueAt: timestamptz, createdAt: timestamptz,
  evidenceHash: text                             // re-fire only on materially new evidence
}

findingReference = {                             // R findings only
  findingId pk,
  claim: text,
  isGeneralKnowledge: boolean default true,      // always true, always displayed
  notApplicableIf: text not null,                // the gate that makes a benchmark usable
  confidence: confidence,
  stalenessRisk: 'low'|'medium'|'high',
  verifiedAgainst: text nullable, verifiedAt: timestamptz nullable
}

findingSuppression = {
  id, householdId, memberId, ruleCode,
  reason: dismissReason, until: timestamptz nullable,   // null means permanent
  createdAt
}
```

Constraints:

```sql
-- I-9: no rule without a numeric bar
alter table finding_rule add constraint bar_required check (jsonb_typeof(bar) = 'object');

-- R findings never touch faith, family or health
alter table finding_rule add constraint reference_domain_gate
  check (kind <> 'reference' or domains_excluded @> array['FTH','FAM','HLT']::domain_code[]);

-- R findings must carry the disconfirming clause
alter table finding_reference add constraint not_applicable_required
  check (length(btrim(not_applicable_if)) > 0);

-- I-5 again: a private-derived finding is scoped to one member
alter table finding add constraint private_finding_scoped
  check (not derived_from_private or array_length(visible_to_member_ids, 1) = 1);
```

`evidence` holds the numbers and is written by the rules engine. `observation`, `reading` and
`disconfirm` are written by the model **from** that evidence. The model never computes the
numbers it is writing about (I-7).

`evidenceHash` is how I-12 stays honest: a silenced finding may only speak again when the hash
changes, which means the underlying numbers moved, not merely that time passed.
```

`decisionWeight` keyed by member is I-3 made structural. Do not add a `weight_combined`,
a household-level weight, or an averaging view.

---

## 6. Row level security

RLS is on for every table. Policies use a session GUC set inside the request transaction.

### 6.1 The scope helper

```sql
create schema if not exists app;

create or replace function app.member_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.member_id', true), '')::uuid
$$;

create or replace function app.household_id() returns uuid
language sql stable as $$
  select household_id from member where id = app.member_id() and deleted_at is null
$$;

create or replace function app.is_principal() returns boolean
language sql stable as $$
  select coalesce((select role = 'principal' from member where id = app.member_id()), false)
$$;

create or replace function app.owns_track(t uuid) returns boolean
language sql stable as $$
  select exists (select 1 from track where id = t and owner_member_id = app.member_id())
$$;
```

`lib/db/client.ts`:

```ts
export async function withMember<T>(memberId: string, fn: (tx: Tx) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.member_id', ${memberId}, true)`);
    return fn(tx);
  });
}
```

Every request path resolves the Supabase auth user to a member, then does all work inside
`withMember`. There is no other database entry point in a request path.

### 6.2 Policies

```sql
-- tracks
create policy track_read on track for select using (
  household_id = app.household_id()
);
create policy track_write on track for update using (
  owner_member_id = app.member_id()
  or (kind = 'joint' and app.is_principal() and household_id = app.household_id())
);

-- I-1: milestones are written only by the owner of their track
create policy ms_read on milestone for select using (
  exists (select 1 from track t where t.id = track_id and t.household_id = app.household_id())
  and (
    not is_private
    or exists (select 1 from track t where t.id = track_id and t.owner_member_id = app.member_id())
  )
);
create policy ms_insert on milestone for insert with check (
  app.owns_track(track_id)
  or (app.is_principal()
      and exists (select 1 from track t where t.id = track_id and t.kind = 'joint'
                  and t.household_id = app.household_id()))
);
create policy ms_update on milestone for update using (
  app.owns_track(track_id)
  or (app.is_principal()
      and exists (select 1 from track t where t.id = track_id and t.kind = 'joint'
                  and t.household_id = app.household_id()))
);
```

The private clause in `ms_read` is the whole of I-4 at the read layer: a private milestone is
invisible to everyone but its owner, in every query the app runs, without any caller
remembering to filter. The count another member sees is produced by a separate
`security definer` function that returns only an integer:

```sql
create or replace function app.private_count(t uuid, d domain_code)
returns integer language sql security definer stable as $$
  select count(*)::int from milestone
   where track_id = t and domain_code = d and is_private and status <> 'dropped'
$$;
revoke all on function app.private_count(uuid, domain_code) from public;
grant execute on function app.private_count(uuid, domain_code) to authenticated;
```

It returns a number and nothing else. No titles, no dates, no ids.

Collision visibility, which is I-5:

```sql
create policy collision_read on collision for select using (
  household_id = app.household_id()
  and (not derived_from_private or visible_to_member_id = app.member_id())
);
```

A collision derived from a private item is invisible to the other member at the database, not
in the UI. When its owner chooses to raise it, the app clears `derived_from_private` and
`visible_to_member_id` in the same transaction that writes the shared version.

Method:

```sql
create policy method_read on method_setting for select using (
  exists (select 1 from method_version v where v.id = method_version_id
          and (v.household_id is null or v.household_id = app.household_id()))
);
-- only principals write the method, and only through the version/request path
create policy method_version_write on method_version for insert with check (
  household_id = app.household_id() and app.is_principal()
);
-- I-12f: a two_key setting cannot be written without an approved request
create policy two_key_needs_approval on method_setting for insert with check (
  tier = 'solo' or exists (
    select 1 from method_change_request r
     where r.household_id = app.household_id()
       and r.key = method_setting.key
       and r.status = 'approved'
       and r.approved_at > now() - interval '1 hour'
  )
);
```

The one-hour window is deliberate: an approval authorises one change, not a standing permission.

Advisors:

```sql
create policy advisor_scoped_read on milestone for select using (
  exists (
    select 1 from advisor_grant g
     where g.member_id = app.member_id()
       and g.track_id = milestone.track_id
       and g.domain_code = milestone.domain_code
       and g.revoked_at is null
       and g.expires_at > now()
  ) and not is_private
);
```

Grants expire. There is no policy path that reads an expired grant.

---

## 7. The rules engine

`lib/rules/`. Every function takes a transaction already scoped to a member and returns typed
rows. These are the only source of the numbers Claude ever sees (I-7).

### 7.1 Slippage

```sql
-- milestones that have moved, with count and original date
select m.id, m.ref, m.title, m.target_date, m.original_target_date,
       count(mv.id) as move_count,
       array_agg(mv.to_date order by mv.moved_at) as move_history
  from milestone m
  join milestone_move mv on mv.milestone_id = m.id
 where m.status <> 'dropped'
 group by m.id
having count(mv.id) >= 2;
```

Two or more moves surfaces at review. Three or more carries the line
`the goal needs re-examining, not the date`.

### 7.2 Rollover

```sql
with recursive chain as (
  select id, rolled_from_commitment_id, 1 as depth from commitment where status = 'open'
  union all
  select c.id, p.rolled_from_commitment_id, c.depth + 1
    from chain c join commitment p on p.id = c.rolled_from_commitment_id
)
select id, max(depth) as rollover_count from chain group by id having max(depth) >= 3;
```

Depth 3 emits `ROLLOVER x3: park, drop, or re-scope. Do not carry again.` and blocks the
commitment from being carried again without an explicit re-scope.

### 7.3 Proposed cycles

```sql
select m.id, m.ref, m.title, m.last_authored_by_member_id,
       count(s.id) filter (
         where s.kind = 'review' and s.mode = 'joint' and s.started_at > m.updated_at
       ) as cycles_proposed
  from milestone m
  join track t on t.id = m.track_id and t.kind = 'joint'
  left join session_row s on s.household_id = t.household_id
 where m.agreement = 'proposed'
 group by m.id;
```

At 2 cycles the item is forced: agree it, or move it to the individual track of whoever wants it.
There is no third cycle, and the UI offers exactly those two actions.

The other principal always has three responses, not one: **Agree**, **Propose edit**, and
**Discuss in session**. Disagreement is not rejection, and a single Confirm button forces
everything that is not agreement into inaction.

### 7.4 Assumptions

```sql
select a.*, count(am.milestone_id) as carries
  from assumption a
  left join assumption_milestone am on am.assumption_id = a.id
 where a.state = 'open' and (a.test_by < current_date or a.confidence = 'low')
 group by a.id
 order by carries desc;
```

Increment `carried_review_count` on every review that surfaces an expired assumption without
resolving it. At 3, the copy is `this is a hope, not an assumption`.

### 7.5 Load audit

```sql
select t.id as track_id,
       sum(dl.hours_per_week) as demand,
       c.ceiling_hours_per_week as ceiling,
       sum(dl.hours_per_week) - c.ceiling_hours_per_week as gap
  from track t
  join domain_load dl on dl.track_id = t.id
  join capacity c on c.track_id = t.id
 group by t.id, c.ceiling_hours_per_week;
```

A positive gap is surfaced at the health block and in the home view. The remedies offered are
exactly four: cut a goal, move a date, reduce a scope, or raise the ceiling with a named change.
"Try harder" is not an option the UI provides.

### 7.6 Money audit

The exact parallel of 7.5, and the one that answers "am I committed to more than my income can
take". Everything is per month over a 24 month horizon, converted to the household's reporting
currency using `fx_assumption`.

```sql
-- monthly commitment schedule: recurring spread, one-offs on their landing month
create or replace view v_outflow_month as
with months as (
  select generate_series(date_trunc('month', current_date),
                         date_trunc('month', current_date) + interval '23 months',
                         interval '1 month')::date as m
)
select o.track_id, months.m,
       sum(case when o.kind = 'recurring'
                 and months.m >= date_trunc('month', o.starts_on)
                 and (o.ends_on is null or months.m <= date_trunc('month', o.ends_on))
                then app.fx(o.amount, o.currency) else 0 end) as recurring,
       sum(case when o.kind = 'one_off'
                 and date_trunc('month', o.starts_on) = months.m
                then app.fx(o.amount, o.currency) else 0 end) as one_off,
       bool_or(o.committed) as any_committed
  from obligation o cross join months
 group by o.track_id, months.m;

-- F-1: committed recurring share of income
select track_id,
       sum(recurring) filter (where m = date_trunc('month', current_date)) as committed_monthly,
       app.income_month(track_id, current_date) as income_monthly,
       sum(recurring) filter (where m = date_trunc('month', current_date))
         / nullif(app.income_month(track_id, current_date), 0) as ratio
  from v_outflow_month group by track_id;

-- F-2: the peak month, and any month where commitments exceed income
select track_id, m,
       recurring + one_off as outflow,
       app.income_month(track_id, m) as income,
       recurring + one_off - app.income_month(track_id, m) as shortfall
  from v_outflow_month
 where recurring + one_off > app.income_month(track_id, m)
 order by shortfall desc;

-- F-5: the plan only works on income nobody is building
select i.* from income i
 where i.is_assumed and i.built_by_milestone_id is null;

-- F-6: FX exposure
select track_id,
       sum(app.fx(amount, currency)) filter (where currency <> app.reporting_currency())
         / nullif(sum(app.fx(amount, currency)), 0) as foreign_share
  from obligation group by track_id;
```

**Report F-2 as a named month with three numbers**: what lands, what comes in, and the
shortfall. Never as a percentage, never as "finances look tight". The whole value of this
detector is that it produces a sentence a person can act on.

`committed` versus intended matters and must not be flattened. An intended obligation that
creates a shortfall is a planning problem with a cheap fix. A committed one is a cash problem.
Rank committed shortfalls above intended ones at equal size.

### 7.7 Collisions

Scheduled scan, `api/cron/collisions`. Proposes, never writes a confirmed collision.

Detection passes:
1. Two milestones in different tracks whose date ranges overlap and whose domains are in
   `{CAR, REL}` or `{FIN, REL}` or `{FAM, REL}`.
2. Two or more milestones with money implications targeting the same calendar year.
3. A hard dependency whose upstream is `slipped` or `blocked` and whose downstream is not yet
   `at_risk`.

Any proposal touching a private item sets `derived_from_private = true` and
`visible_to_member_id = <owner>`, and writes a `private_read_log` row (I-4, I-5). Run the scan
under a member scope per principal, never under the service role.

### 7.8 Advisory engine

`lib/rules/findings/`. Runs nightly per household under each principal's member scope, never
under the service role. Four detector families, one module each, all reading the registry in
`finding_rule` rather than hard-coding bars.

**Detection contract.** A detector returns `{ ruleCode, subjectIds, evidence, firstTrueAt }`
or nothing. It never returns prose. If the evidence does not clear the registry bar, it returns
nothing rather than returning something with a caveat.

Representative detectors:

```sql
-- P-1: one domain's milestones move far more than the track median
with moves as (
  select m.track_id, m.domain_code, m.id, count(mv.id) as n
    from milestone m left join milestone_move mv on mv.milestone_id = m.id
   where m.status <> 'dropped' and m.created_at < now() - interval '182 days'
   group by m.track_id, m.domain_code, m.id
), per_domain as (
  select track_id, domain_code, avg(n) as avg_moves, count(*) as items
    from moves group by track_id, domain_code
), per_track as (
  select track_id, percentile_cont(0.5) within group (order by avg_moves) as med
    from per_domain group by track_id
)
select d.track_id, d.domain_code, d.avg_moves, t.med, d.items
  from per_domain d join per_track t using (track_id)
 where d.items >= 3 and t.med > 0 and d.avg_moves >= 2 * t.med;

-- C-3: a live milestone breaches a hard constraint its own track stated
select m.id, m.ref, c.id as constraint_id, c.statement
  from milestone m
  join constraint_row c on c.track_id = m.track_id and c.is_hard
 where m.status not in ('done','dropped','parked')
   and app.milestone_breaches(m.id, c.id);        -- flagged at authoring, reviewed here

-- S-1/S-2: propagate displacement over hard dependencies
with recursive prop as (
  select d.to_milestone_id as id, app.slip_months(d.from_milestone_id) as months, 1 as depth
    from dependency d
   where d.nature = 'hard'
     and (select status from milestone where id = d.from_milestone_id) in ('at_risk','slipped')
  union all
  select d.to_milestone_id, p.months, p.depth + 1
    from prop p join dependency d on d.from_milestone_id = p.id and d.nature = 'hard'
   where p.depth < 8
)
select p.id, max(p.months) as displacement,
       exists (select 1 from gate g
                where g.status = 'open'
                  and (select target_date from milestone where id = p.id)
                      + (max(p.months) || ' months')::interval > g.decide_by) as crosses_gate
  from prop p group by p.id having max(p.months) >= 3;
```

**Surfacing query.** This is where I-10 and I-11 live. Nothing reaches a prompt without passing
through it.

```sql
with visible as (
  select f.* from finding f
   where f.household_id = app.household_id()
     and f.state in ('queued','surfaced')
     and app.member_id() = any(f.visible_to_member_ids)
     and not exists (
       select 1 from finding_suppression s
        where s.rule_code = f.rule_code
          and s.member_id = app.member_id()
          and (s.until is null or s.until > now())
     )
), capped as (
  select *, row_number() over (
    partition by (kind = 'reference') order by severity desc
  ) as rn_within_kind
    from visible
)
select * from capped
 where kind <> 'reference' or rn_within_kind = 1     -- at most one reference in play
 order by severity desc
 limit 3;                                             -- at most three overall
```

Do **not** implement this as `order by (kind = 'reference'), severity desc limit 3`. That sorts
every reference finding to the back, which means a reference finding never surfaces at all
whenever three others are queued, and "at most one" quietly becomes "effectively none". The
window function above is the correct shape: drop all but the strongest reference, then rank the
survivors on severity alone, so a high severity reference finding competes on merit and a second
one can never appear.

Two separate tests, because they fail independently: never more than three, and never more than
one reference. Add a third asserting that a reference finding at top severity does surface when
three others are queued.

**Severity.**

```
severity = blast_radius * window_pressure * persistence

blast_radius   = milestones touched, doubled when the finding spans more than one track
window_pressure= 3 if it concerns a gate inside 90 days, 2 inside 12 months, 1 otherwise
persistence    = ln(1 + days_true / 30)
```

**On-demand advisory review.** A second, separate flow. `POST` from the Review with AI action.

It is not the finding pipeline with the cap lifted. It is its own thing:

| | Threshold findings | Advisory review |
|---|---|---|
| Trigger | a bar was crossed | a person asked |
| Scope | one subject | the whole plan |
| Cap | 3 per cycle, 1 reference | none |
| Output | four fields | a nine section report |
| Storage | `finding` | `advisory_review` |

```ts
advisoryReview = {
  id, householdId, requestedByMemberId, requestedAt, completedAt,
  methodVersionId: uuid,                       // I-12e
  scope: 'household'|'track', trackId: uuid nullable,
  inputsHash: text,                  // what the plan looked like when it ran
  sections: jsonb,                   // the nine, keyed
  actions: jsonb,                    // ranked, each with cost, forecloses, timing
  computedFacts: jsonb,              // every number the report cites, from the rules engine
  artifactUrl: text nullable
}
advisoryReviewAction = {
  id, reviewId, rank: smallint, action: text, cost: text, forecloses: text, timing: text,
  status: 'proposed'|'accepted'|'declined',
  acceptedMilestoneId: uuid nullable // set when accepting turns it into a plan change
}
```

The nine sections are fixed and ordered: verdict, capacity, timing, costing, coverage,
behaviour, outside view, what I would do, what would change my mind. Section order is a
constraint, not a suggestion: a fixed structure is what stops an opinionated report becoming an
undifferentiated wall of advice.

**Rules that carry over from the finding pipeline, and rules that do not.**

Carry over, always: nothing about one member delivered to the other, no outside knowledge
unprompted on faith, family or health, nothing derived from a private item to anyone but its
owner, nothing dismissed as `not_relevant` in any section or any form, nothing during a session.
Enforce these in the report assembler, not the prompt.

Do not carry over: the three-per-cycle cap and the one-reference cap. Someone who asked for an
opinion consented to the long answer.

A finding dismissed as `already_known` and still true **does** belong in a requested review,
framed as what it has cost since. Query it explicitly rather than reusing the surfacing query,
which would suppress it.

**Every number in a review comes from `computedFacts`.** The report assembler runs the rules
engine first, writes the facts, and passes them to the model, which writes prose around them.
A review that cites a figure not present in `computedFacts` fails validation and does not
publish (I-7).

**Lifecycle.**

`queued` on detection. `surfaced` when it reaches a review, incrementing `surfaced_count`.
At `surfaced_count = 3`, `escalated` writes it onto the next joint session agenda. After the
escalated session it moves to `silenced`, and only a changed `evidenceHash` can return it to
`queued` (I-12).

`acted` when a plan change references it. `dismissed` writes a `finding_suppression` row:
90 days for `already_known`, 30 for `not_now`, permanent for `not_relevant`, and permanent plus
a logged alert for `not_true`, because a false positive is a bug in a threshold and should be
fixed rather than absorbed.

---

## 8. Routes and actions

Server actions only. No public API in v1. Every action resolves the member, opens `withMember`,
validates with Zod, writes, and revalidates.

| Action | Guard beyond RLS |
|--------|------------------|
| `createMilestone` | domain in enum; ref generated server side |
| `updateMilestoneTarget` | writes a `milestone_move` row in the same transaction, always |
| `updateMilestoneStatus` | `parked` and `dropped` require a reason |
| `setPrivate` | individual track only; first use returns `needsDisclosure: true` so the UI shows the one-time notice |
| `agreeJointItem` | rejects when actor is `proposedByMemberId` (I-2); appends a `milestoneEvent`; sets `status` to `on_track` on first agreement (I-2b) |
| `proposeEditToJointItem` / `sendJointItemToSession` | the other two responses; both append events, neither changes `agreement` |
| `closeCollision` | `accepted` requires cost and carrier; `open` requires next step, owner and due; appends a `collisionEvent` |
| `decideDecision` | writes an immutable `decisionRecord`; staging additionally requires `decisionStage` complete |
| `raisePendingItem` | writes to another member's track's pending queue, never to its domains |
| `claimTrack` | sets `claimed` on first owner-authored content; never reversible |
| `startSession` / `advanceBlock` / `endSession` | block timings recorded against plan |
| `setWeight` | `(criterionId, memberId)`; actor can only set their own (I-3) |
| `inviteMember` | beyond the second member requires both principals to have acted |
| `setPrivateReadOptIn` | own member row only; recorded with timestamp |
| `setObligation` / `setIncome` | own track, or joint when principal; `one_off` requires a landing date |
| `runAdvisoryReview` | rate limited to 1 per household per 24 hours, because it is the most expensive single call in the system |
| `updateMethodSetting` | solo tier only; writes a new `methodVersion` with a required reason and activates it |
| `requestMethodChange` | two_key tier; writes a `methodChangeRequest` with a required reason |
| `respondToMethodChange` | the other principal only (I-12f); approve writes and activates the version, decline records why |
| `revertToMethodVersion` | activating an older version is itself a new version, never a rollback that loses history |
| `acceptReviewAction` | turns a ranked action into a plan change through the normal milestone path, citing the review |

`updateMilestoneTarget` writing the move row **in the same transaction** is not optional. A date
change without a move row is invisible slippage, and invisible slippage is the failure this
product exists to prevent.

---

## 9. Claude integration

`lib/claude/`. Server only.

### 9.1 Shape

Every flow is: **compute, then converse.**

```ts
const facts = await rules.forReview(tx, { mode, memberId });   // typed, numeric, complete
const system = prompts.review({ timebox, mode, facts });        // facts injected as structured context
const stream = anthropic.messages.stream({
  model, system, tools, messages, max_tokens
});
```

The model is never asked how many times something moved. It is told, and asked to run the
conversation about it (I-7).

### 9.2 Tools

Every tool wraps the same server action the UI calls, executing inside the caller's
`withMember` scope. A tool cannot do anything the signed-in member could not do by clicking.

```ts
[
  { name: 'set_milestone_status',
    input: { ref: string, status: MsStatus, reason?: string } },
  { name: 'move_milestone_target',
    input: { ref: string, newTarget: string, reason: string } },   // reason required
  { name: 'add_milestone',
    input: { trackRef: 'mine'|'joint', domain: DomainCode, title: string,
             target: string, horizon: Horizon } },
  { name: 'record_position_on_joint_item',
    input: { ref: string, position: string } },                    // never confirms
  { name: 'confirm_joint_item', input: { ref: string } },          // fails on own assertion
  { name: 'resolve_assumption',
    input: { ref: string, outcome: 'confirmed'|'broken'|'untested', note?: string } },
  { name: 'log_collision',
    input: { tension: string, tracks: string[], domains: DomainCode[],
             from: string, to: string, kind?: CollKind } },
  { name: 'add_commitment',
    input: { text: string, ownerMemberId: string, due: string } },
  { name: 'raise_pending_item',
    input: { targetMemberId: string, text: string } },
  { name: 'write_session_record', input: { summary: object } },

  // advisory: the model writes findings up, it never decides that one exists
  { name: 'write_finding_prose',
    input: { findingId: string, observation: string, window: string,
             reading: string, disconfirm: string } },
  { name: 'record_finding_response',
    input: { findingId: string,
             response: 'acted'|'already_known'|'not_true'|'not_now'|'not_relevant' } },
  { name: 'write_review_section',
    input: { reviewId: string,
             section: 'verdict'|'capacity'|'timing'|'costing'|'coverage'
                     |'behaviour'|'outside'|'actions'|'change_my_mind',
             body: string } },
  { name: 'propose_review_action',
    input: { reviewId: string, rank: number, action: string,
             cost: string, forecloses: string, timing: string } }
]
```

Notice what is absent. There is no `set_weight`, because weights are a person's own act. There
is no `decide`, because the model does not decide. There is no `write_to_track`, because I-1.
There is no `create_finding` and no `set_severity`, because I-9: the engine decides that a
finding exists and how it ranks, and the model only writes it up from evidence it was handed.
`write_finding_prose` rejects any call whose `findingId` is not already `queued`.

### 9.3 Prompts

Prompts are **method settings, not source files**. The six skills seed the canonical method; the
assembler builds each system prompt from `prompts.*` at request time and stamps the resulting
record with `methodVersionId`. A prompt string literal in application code is a bug for the same
reason a hardcoded threshold is: the method changed six times before the first line of code, and
it will keep changing.

Seed them verbatim. They are the tested version of the method and should not be paraphrased:

| Prompt | Source skill | Timebox |
|--------|-------------|---------|
| `interview` | `life-plan` + domain prompts | untimed, one domain at a time |
| `review` | `life-review` | 30 individual, 45 joint |
| `session` | `strategy-meeting` | 60 individual, 210 joint |
| `brief` | `decision-brief` | untimed |
| `prep` | computed facts, summarised | not conversational |
| `advisor` | `plan-advisor` + threshold registry | not conversational |
| `advisoryReview` | `plan-advisor` + advisory review reference | not conversational, long output |

The assembler also injects the current method into every prompt where behaviour depends on it:
domain order, timeboxes, block structure, thresholds. A prompt that says "seven domains in fixed
order FTH, FAM, ..." in its own text will be wrong the day someone reorders them. It should say
"in the order given below" and receive the order.

Session control is code, not prompt: block advancement, break prompts, and the minute-150
cutoff are enforced by the app. A model asked to watch a clock will not.

### 9.4 The advisor prompt

Given one finding's evidence, produce exactly four fields: what is true, over what window, what
it might mean marked as a reading, and what would show the reading is wrong. It never sees the
suppression table, the severity score, or the other findings in the batch. It cannot argue that
something should be surfaced.

The fourth field is what separates analysis from opinion, and it is the one most likely to be
dropped under a token limit. Validate it server side: a finding whose `disconfirm` is empty or
under 40 characters does not surface.

For reference findings, the prompt additionally requires `notApplicableIf`, a confidence, and a
staleness assessment. Where staleness is medium or high, the flow runs a live check first and
records `verifiedAgainst` and `verifiedAt`, or states plainly in the claim that this is the sort
of thing that changes and should be verified. Immigration rules, programme criteria, costs and
tax treatment are all high staleness by default.

### 9.5 The advisory review prompt

Given `computedFacts` and the plan, write the nine sections. Different in kind from the finding
prompt, and it needs three things holding it:

**It must conclude.** Section 1 is a verdict: does this hold together, and where does it break
first. "There are several areas worth considering" fails the assignment. Validate that section 1
is under 120 words and contains a claim.

**It must rank by leverage.** Section 8 is three to five actions ordered by how much each
changes, not by how easy each is. Validate that at least one of the top three is scored
uncomfortable, or ask again: a comfortable top three is a ranking that flinched.

**It may not invent a number.** Every figure traces to `computedFacts`. The assembler extracts
numerals from the generated prose and fails the review if any is absent from the facts block.
This is I-7 with teeth: prose about money is exactly where a model will produce a plausible
figure, and a plausible figure about someone's income is worse than no figure.

Section 4, costing, is the one people press the button for. It must name months, name amounts,
and name the shortfall. Reject a costing section that contains no month.

### 9.6 Private items

One code path. `rules.forCollisionScan()` is the only function that may load private rows, it
checks `privateReadOptIn` on both principals first, it writes `private_read_log` for every row
it touches, and its output is scoped to the owner. Every other `rules.*` function excludes
private items by relying on the `ms_read` policy, which means the exclusion cannot be forgotten.

---

## 10. UI

Match the prototype. Specifics that are load-bearing rather than cosmetic:

- **Viewer context is global.** The whole shell renders from the perspective of one member.
  Every screen respects it.
- **Absent, not disabled.** When viewing another member's track, edit controls are not rendered
  at all. A greyed-out button still tells you something exists.
- **Private items render as a count.** "3 private items". No rows, no redaction, no dates.
- **Proposed is visually distinct everywhere and carries no execution status.** Dashed borders on
  the timeline, a dashed pill in tables, and the status cell reads "not yet" rather than showing
  a state. It must never look like agreement, and it must never look like work in progress.
- **Agreement offers three responses, not one.** Agree, Propose edit, Discuss in session.
  Disagreement is not rejection.
- **Session state comes from one number.** Elapsed minutes drives the current block, the minutes
  remaining and the cutoff position. Never store the current block.
- **The weight budget is real.** Show what is left to place, and hold the matrix until the total
  is exactly 100.
- **The Method screen shows the argument, not just the value.** Every setting renders its current
  value, the canonical default, and the reasoning it encodes. Someone about to reorder the domains
  should be reading why Faith opens as a filter at the moment they change it, not hunting for it
  in a doc.
- **A two-key setting opens a request, not an edit.** The warning names the protection, who relies
  on it, and what becomes possible without it. Not "are you sure": "Leroo currently relies on you
  not being able to agree your own proposals. Turning this off means a joint item can enter the
  plan with only your agreement."
- **Every method change requires a reason and shows in history.** Reverting is a forward step
  with its own entry, never a rollback that erases what happened.
- **Slippage is always shown with its history.** `moved 2x: Sep 2026 → Oct 2026 → Dec 2026`.
  Never just the current date.
- **The decision matrix has two total columns and no third.** Add a visible note saying why.
- **The matrix is described as a model, not an oracle.** "Under your current weights and scores,
  both of you rank Stage first", then "this is evidence for the conversation, not the decision
  itself". Reserve firm language for mechanical rules ("it cannot roll again unchanged") and keep
  interpretation neutral ("survived three cycles without a test, treat it as unverified").
- **The session view shows blocks, breaks and the cutoff**, not just a timer.
- **Status is never colour alone.** Every status carries its label; on the timeline, fill,
  border and dash carry it too.
- **Findings show all four lines, always.** Observation, window, reading, disconfirmation.
  The reading is visually marked as a reading. Never render a finding with the fourth line
  collapsed behind a disclosure, because that is the line people need most and open least.
- **Reference findings look different.** A distinct treatment, an explicit "general knowledge,
  not from your plan" label, and the "this would not apply to you if" clause given equal weight
  to the claim rather than set as a footnote.
- **Dismissal always asks which of the four reasons.** A single X button loses the signal that
  makes the suppression rules work, and `not_true` is how threshold bugs get found.
- **Review with AI is a deliberate, visible action**, not a background refresh. It states before
  running what it will read, roughly how long it takes, and that it produces an opinion rather
  than a summary. It shows the last run date, because a report read as current when it is six
  weeks old is worse than no report.
- **The nine sections render as nine sections**, in order, all expanded. Do not collapse the
  verdict behind a summary, and do not hide "what would change my mind", which is the section
  that makes the rest usable.
- **Section 8 actions are individually actionable.** Each has Accept, which opens the milestone
  form prefilled and cites the review, and Decline, which records why.
- **The money view shows a month grid**, 24 months, outflow against income, with shortfall
  months marked. A percentage or a ratio alone is not the deliverable: the deliverable is
  "March 2027, 3 commitments land, this much comes in, this much short".

### Timeline

**Detail is reachable by tap and by keyboard, not only by hover.** Every mark, collision region
and gate marker is focusable, `role="button"`, and opens a persistent detail panel on click or on
Enter and Space, dismissed by Escape, a second activation, or an outside tap. Hover keeps a
lightweight tooltip as a desktop convenience only. Under 700px the panel becomes a bottom sheet.
A hover-only chart is unusable on the device this will most often be opened on.

Bespoke inline SVG. Geometry is in the prototype and should be lifted directly:
seven domain groups in fixed order, three lanes each with joint in the middle, horizon bands,
today line, year and quarter gridlines, dependency curves (hard solid, soft dashed, alert
coloured when upstream is slipped or blocked, heavier when crossing tracks), hatched collision
regions, staggered gate markers, hollow slippage ghosts with dotted connectors, and label
suppression when marks crowd. Domain and lane labels are a sticky left column so they survive
horizontal scroll.

Palette, validated all-pairs in both themes:

| Role | Light | Dark |
|------|-------|------|
| Track A (member 1) | `#2a78d6` | `#3987e5` |
| Track B (member 2) | `#eb6834` | `#d95926` |
| Joint | neutral, position carries identity | |
| on_track | `#0ca30c` | same |
| at_risk | `#fab219` | same |
| slipped | `#d03b3b` | same |
| blocked | `#ec835a` hollow with solid border | same |
| done / parked / dropped | muted neutral, filled / hollow / struck | |

Track hues appear only in lane labels, chips and the filter. Marks are coloured by status.
Position tells you whose it is; colour tells you what needs attention, which is what people scan
for.

---

## 11. Phases

Ship in order. Each phase has acceptance criteria that are testable, not impressionistic.

### Phase 0: foundation

Auth, household creation, invite and pairing, the method layer seeded from the six skills,
tracks provisioned from `structure.domains`, all RLS policies plus their test suite.

**The method ships in phase 0, not later.** Every phase after this reads thresholds, domain order,
timeboxes and prompts through the accessor. Building phases 1 to 7 against literals and
retrofitting the method afterwards means finding every hardcoded 3, 150 and domain list by hand,
and missing some.

**Accepts when:** two people sign in and see three tracks, two unclaimed. The method is seeded
and readable through the accessor, with no threshold, domain list or prompt literal anywhere in
`app/` or `lib/` outside `lib/method/seed/`. A solo setting edits with a reason and writes a new
version. A two-key setting cannot be written without an approved request from the other
principal. The RLS suite passes including every negative case in section 12. No request path uses
the service role.

### Phase 1: individual tracks

CRUD across the seven domains: goals, milestones, assumptions, risks, constraints. Private flags
with disclosure on first use. `domain_load` capture per domain. `capacity` in the health block.

**Accepts when:** one person runs their whole track by hand; every domain carries an hour demand
and any money it commits; the health block computes hour demand against ceiling and names the
gap; the finance block holds income, reserve and the assumed-growth line; and a date change
always writes a `milestone_move` row.

Money is captured in phase 1 rather than phase 8 deliberately. The detectors that use it come
later, but obligations recorded retrospectively are guesses, and an affordability analysis built
on guessed dates is worse than none.

### Phase 2: joint plan

Joint track, confirmation flow, cross-track dependencies, pending queues.

**Accepts when:** an item proposed by one principal cannot be agreed by that principal; a
proposed item has no execution status in the database or the UI; the other principal is offered
Agree, Propose edit and Discuss; every agreement appends a `milestoneEvent` rather than mutating
a note; and the two-cycle rule offers exactly two actions. A member cannot write into the other's
track by any route, proven by test.

### Phase 3: timeline

**Accepts when:** the chart matches the prototype, renders correctly in both themes and on a
phone, scrolls only inside its own container, and shows dependency alert colouring when an
upstream item slips.

### Gate: product direction

**Closed on 2026-08-25: product now (OD-7).** Multi-household, billing, onboarding and a
marketing surface are in scope and build alongside phases 4 to 8. The spike below did not run,
so pricing has no measured cost under it: instrument per-household cost by flow from the first
facilitated review, and treat OD-8 in the product spec as the open decision it feeds. The
paragraph that follows is the gate as it was framed, kept for its reasoning.

**Nothing in phase 4 starts until this closes.** Run the spike first: export the real phase 3
data to the markdown format the prototype skills use, run two individual reviews, one joint
review, one individual strategy session and one decision brief by hand through the skills,
measure token cost per flow, and write down whether the facilitated version beat doing the same
review by hand in the app.

The criterion that outranks the rest: are both tracks claimed, and has the joint review happened
on cadence for two months? If not, the direction is private tool, and phase 4 aims at the
drop-off.

### Phase 4: rules engine, then Claude

**The rules engine ships and is tested before any model flow is written.** Then reviews on top
of it. Both audits are in scope here: hours against ceiling, and money against income by month.
The money audit is what lets the system say "March 2027 is short", which is the sentence people
most want from a planning tool and least often get.

**Accepts when:** every rule in section 7 has a test with a fixture that triggers it and one
that does not; a facilitated review produces the same numbers as the rules engine, because it
was given them; and no prompt asks the model to count anything.

### Phase 5: decisions

Options, criteria, two weightings, scores, sensitivity.

**Accepts when:** there is no combined total anywhere in the UI or the schema; weights are
rejected unless they sum to exactly 100 and the matrix does not compute until they do;
sensitivity runs weight flip, score flip and margin; a margin under 8 points is reported as a tie
with reversibility as the tie-break; a gate's `outcomes` match the decision's real options; a
staged decision cannot be saved without information, owner and final date; and every decision
writes an immutable `decisionRecord` capturing what was believed at the time.

### Phase 6: sessions and scheduling

Strategy sessions with block and break enforcement, prep briefs, notifications, the collision
scan with its private-read path and log.

**Accepts when:** the 210 minute joint session enforces its breaks and refuses to open a new
heavy item after minute 150; the collision scan writes a `private_read_log` row for every
private item it reads; and a collision derived from a private item is invisible to the other
member at the database, proven by test.

### Phase 7: members beyond two

Dependents, advisors, scoped grants with expiry.

**Accepts when:** a dependent can propose into the joint plan and cannot confirm; an advisor
sees only granted domains and nothing else; and an expired grant reads nothing.

### Phase 8: the advisory layer

The four detector families, the registry, severity, surfacing, dismissal, escalation and
silencing. Ships last because it needs history: pattern detectors require 8 weeks of logs
before they may fire at all, so there is nothing to build against until phases 4 and 6 have
been running for two months.

Build in this order, and do not reorder it:

1. `finding_rule` registry, seeded, with every bar as data (I-9).
2. Detectors, tested against fixtures at the boundary of each bar.
3. Severity, ranking, and the surfacing query with its limits (I-10, I-11).
4. Lifecycle: surfaced, escalated, silenced, with `evidenceHash` (I-12).
5. Dismissal with its four reasons and the suppression table.
6. Only then the model prose step.
7. The on-demand advisory review: the nine section report, `computedFacts` validation, and the
   numeral check that fails a review citing a figure the rules engine did not produce.
8. Reference findings last of all, with all five gates and the live check.

**Accepts when:** every registry bar has a fixture that trips it and one that does not; the
surfacing query never returns more than 3, never more than 1 reference, and never returns a
suppressed class; a `not_relevant` dismissal is permanent and provably unrepeatable; a finding
at `surfaced_count = 3` escalates once and then goes silent until `evidenceHash` changes; a
reference finding with an empty `not_applicable_if` cannot be written; and an advisory review
citing any figure absent from `computedFacts` fails to publish.

**The riskiest thing in the whole build is here.** Reference findings fire unprompted, carry
knowledge that can be wrong or stale, and land in a system people trust because everything else
in it came from their own data. Ship them last, behind a flag, with the domain gate enforced by
constraint rather than by prompt, and turn them on only once the other three kinds have been
running long enough to have earned the benefit of the doubt.

---

## 12. Testing

### RLS suite, `tests/rls/`

Mandatory before phase 0 is accepted. Every policy tested from both sides, as two real member
sessions against a real database, not mocks.

Negative cases that must fail:

1. Member A inserts a milestone into member B's track.
2. Member A updates a milestone on member B's track.
3. Member A reads a private milestone on member B's track.
4. Member A confirms a joint item they last authored.
5. A dependent confirms a joint item.
6. An advisor reads a domain outside their grant.
7. An advisor reads anything after their grant expires.
8. Member A reads a collision where `derived_from_private` and `visible_to_member_id = B`.
9. Any query in a request path succeeds without `app.member_id` set.
10. `app.private_count` returns anything other than an integer.

Case 9 matters most. It proves the GUC is the gate rather than a convention.

### Rules suite, `tests/rules/`

Every function in section 7, with fixtures at the boundary: 2 moves and 3, 2 rollovers and 3,
1 proposed cycle and 2, an assumption one day before and one day after its `test_by`, a load
gap of zero and of one hour.

### Advisory suite, `tests/findings/`

Mandatory before phase 8 is accepted.

1. Every registry bar: one fixture one unit under, one fixture on it, one clearly over.
2. Surfacing returns at most 3, ever, with 14 queued.
3. Surfacing returns at most 1 reference, with 5 reference findings queued at top severity.
4. A suppressed class never surfaces within its window, and `not_relevant` never surfaces again.
5. `surfaced_count = 3` escalates exactly once, then `silenced`.
6. A silenced finding with an unchanged `evidenceHash` never re-queues; with a changed hash it
   re-queues exactly once.
7. A private-derived finding is invisible to the other member at the database.
8. A P-5 or P-7 finding, which concerns the balance between two people, is either visible to
   both principals or to neither. Never to one.
9. A reference finding on FTH, FAM or HLT cannot be inserted.
10. A finding whose `disconfirm` is empty or under 40 characters does not surface.
11. No finding surfaces while a session is open.
12. No P finding surfaces before 56 days of history exist.
13. An advisory review that cites a numeral absent from `computedFacts` fails validation.
14. An advisory review omits every finding dismissed as `not_relevant`, in all nine sections.
15. An advisory review includes a finding dismissed as `already_known` that is still true.
16. The money audit reports a shortfall month by name with three figures, and a committed
    shortfall ranks above an intended one of equal size.
17. F-5 fires when an assumed income has no `built_by_milestone_id`, and does not when it has.
18. A milestone with `agreement = 'proposed'` and a non-null `status` cannot be inserted.
19. A principal cannot agree a milestone they proposed.
20. Agreeing appends a `milestoneEvent` and leaves the previous note intact.
21. Session state derived from elapsed at every minute boundary agrees with the block table, and
    no code path writes a current-block column.
22. A decision total is not computed when weights sum to anything other than 100.
23. A staged decision without information, owner and final date cannot be saved.
24. Closing a collision as accepted without a cost and a carrier is rejected.

### Method suite, `tests/method/`

Mandatory before phase 0 is accepted.

25. Every setting key in section 5.6 exists in the seeded canonical method with a non-null
    `rationale`, and every `two_key` setting has a non-empty `protects`.
26. A static check over `app/` and `lib/` finds no numeric literal matching a seeded threshold
    and no domain code array outside `lib/method/seed/`. This is a lint rule, not a code review
    habit, because a code review habit will miss one.
27. A principal can change a solo setting alone, and the change writes a new version with the
    reason attached.
28. A principal cannot write a two-key setting without an approved request.
29. A principal cannot approve their own change request.
30. An approval older than one hour does not authorise a write.
31. A record written under v3 still reports v3 after the household moves to v4, and rendering a
    v3 session applies v3 timeboxes rather than v4.
32. Reverting to an older version creates a new version rather than deleting the intervening
    ones.

Case 8 is the one that matters most socially. A correct observation about one person delivered
privately to the other is not analysis, it is ammunition, and the database should make it
impossible rather than the prompt asking nicely.

### Model flows

Snapshot the assembled system prompt for each flow and assert that the injected facts block is
present and complete. Do not assert on model output. Assert that the tool list contains no tool
that could violate an invariant.

---

## 13. Conventions

- TypeScript strict. No `any` in `lib/`.
- Zod at every server action boundary.
- Dates as `date` in Postgres, ISO strings across the wire, never `Date` objects in props.
- Refs (`M-O-FTH-01`, `X-01`, `D-05`, `G-01`) are generated server side, unique per household,
  immutable, and never reused after a drop.
- Timestamps `timestamptz`, always UTC.
- Soft delete everywhere. Hard delete only on household deletion, within 30 days.
- **No em-dashes or en-dashes as punctuation** in any user-facing copy, error message, prompt,
  comment or commit message. Use colons, commas, parentheses, or a full stop.
- Copy is written from the reader's side. "3 private items", not "filtered by RLS policy".
- Errors say what went wrong and what to do. No apologies.

---

## 14. Do not build

The gate closed as "product now" (OD-7), so the first three entries below are now in scope and
are struck through. Everything after them still stands.

- ~~Billing or usage metering. Model usage is included, not charged.~~ In scope. OD-4 is
  reopened as OD-8: pooled and included was decided for two people and does not survive a
  product, because cost scales with engagement.
- ~~Onboarding flows, marketing pages, a landing site.~~ In scope.
- ~~Multi-household or team features.~~ Multi-household is in scope. Teams are not: a household
  is the tenant, and a team is a different product.

Still not in scope, and adding any of them is scope drift:

- Native apps. The web app is responsive and that is the mobile story.
- Internationalisation.
- Sharing outside a household.
- Realtime collaboration. Two people rarely edit the same row, and confirmation is
  asynchronous by design.
- A charting library.
- Any averaged weight, in any form, anywhere.
- A finding class whose bar is a judgement rather than a number.
- Any **proactive** advisory output that recommends an action rather than naming an observation.
  A threshold finding names what is true. A requested review may recommend, because it was
  asked. Do not let the second leak into the first.
- Any figure in a report that the rules engine did not compute.
- Any threshold, timebox, domain list or prompt string as a literal in application code.
- Any path that changes a two-key protection with one principal's action.
