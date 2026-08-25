# Cairn

A planning application for a household of up to six people, built to the
specification in [CAIRN-BUILD.md](./CAIRN-BUILD.md).

Its core is three tracks: one individual plan per person, plus a joint plan for
what commits two of them together. Plans are organised into seven fixed domains,
carry milestones with dated targets, and are reviewed on a schedule.

The value is not the CRUD. It is that the discipline of the method becomes
**computed rather than remembered**: a milestone that has moved three times, a
commitment that has rolled over three review periods, a joint item proposed but
not agreed for two cycles, an assumption untested past its date, an hour demand
that exceeds a stated ceiling, a month where commitments exceed income. In a
document those depend on someone noticing. Here they are queries.

## What is built

| Phase | Scope | State |
|-------|-------|-------|
| 0 | Auth, household, pairing, the method seeded from the six skills, tracks provisioned, RLS and its suite | Built |
| 1 | Individual track CRUD across seven domains, private flags with disclosure, hours and money capture | Built |
| 2 | Joint plan, the three-response agreement lifecycle, pending queues | Built |
| 3 | Timeline | Built |
| G | Product direction gate | **Closed: product now (OD-7).** Multi-household built, cost instrumented. Billing, onboarding and marketing pending |
| 4 | Rules engine, then Claude-facilitated reviews on top of it | Built. Reviews run against the engine's numbers, with per-household cost instrumented |
| 5 to 8 | Decisions, sessions, members beyond two, the advisory layer | Schema and registry seeded, behaviour not built |

Phases 0 to 3 are usable with no model in the loop, which is the intended
failure mode if the build stalls: a working planning system rather than a chat
interface with no data model under it.

## Running it

```bash
npm install
cp .env.example .env.local        # fill in the values below
npm run db:push                   # applies migrations, seeds the method
npm run dev
```

### The two connections, and why

`DIRECT_URL` is the owner and runs migrations. `DATABASE_URL` is the role the
app serves requests over, and it must be `cairn_app`, created by migration
`0007_app_role.sql`.

This is not a convention. RLS is the enforcement mechanism for the invariants
that matter most: a member cannot write into another member's track, a private
item is invisible to everyone but its owner, a finding derived from a private
item reaches nobody else. A superuser bypasses every one of those policies
silently. The policies still exist, they are simply never consulted.

`lib/db/client.ts` refuses to open a scoped transaction over a connection whose
role is a superuser or carries `BYPASSRLS`, so a misconfigured `DATABASE_URL`
fails loudly at the first query rather than quietly serving the wrong rows.

On Supabase, set a password on `cairn_app` after the migrations run:

```sql
alter role cairn_app with login password 'a long random string';
```

then point `DATABASE_URL` at it through the pooler.

## Deploying to Vercel

The project root is `cairn/`. Set that as the Root Directory in the Vercel
project, add the environment variables from `.env.example`, and deploy. The
build needs no database: every page is server rendered on demand.

Migrations do not run on deploy. Run `npm run db:push` against the target
database with `DIRECT_URL` set, then deploy.

`vercel.json` registers three cron entries for phase 6 (cadence reminders, prep
briefs, the collision scan). They are guarded by `CRON_SECRET` and currently
return a not-implemented response.

## Checks

```bash
npm run typecheck        # strict, no any in lib/
npm run check:literals   # no seeded threshold, domain list or prompt in application code
npm test                 # method, rules, RLS and screen queries
```

`npm test` runs the full suite when `DATABASE_URL` and `DIRECT_URL` point at a
migrated database; without them the database-backed suites skip rather than
pass, because a mocked policy test proves nothing.

To run them locally against a throwaway Postgres:

```bash
createdb cairn
psql -d cairn -c "alter role cairn_app with login"   # after db:push
DIRECT_URL=postgres://you@localhost:5432/cairn \
DATABASE_URL=postgres://cairn_app@localhost:5432/cairn \
npm test
```

## The shape of the code

```
app/                     screens, one per section of the plan
  (auth)/sign-in         email one time code
  setup                  create a household, or claim the track you were invited to
  (app)/                 the shell: home, tracks, joint, timeline, money, method, logs
  api/cron/              guarded entrypoints for phase 6
lib/
  db/                    Drizzle schema, migrations, the withMember scope helper
  method/                the accessor, the change paths, and the six skills as seed
  rules/                 the computed rules, which are the only numbers a model sees
  plan/                  the read layer the screens use
  actions/               server actions, Zod at every boundary
components/              plan, timeline and shared interface pieces
tests/                   method, rules, RLS and screen queries
```

### Reading a method setting

There is one accessor and no literals:

```ts
const m = await method(tx);
m.num('rules.slippage_moves');   // 3
m.domains();                     // ordered
m.prompt('review');              // the review system prompt
m.versionId;                     // stamped onto everything this request writes
```

A hardcoded threshold, timebox, domain list or prompt anywhere in `app/`,
`lib/` or `components/` outside `lib/method/seed/` fails `npm run check:literals`.
Where a number genuinely is not a method value, the line says so:
`// method-literal-ok: <reason>`.

## Facilitated reviews

A review opens from home, runs to the method's timebox, and closes. The order it
runs in is the point:

1. The rules engine computes every count the review will discuss: what has
   moved and how many times, what is unagreed and for how long, what is past its
   test date, where hours exceed the ceiling, and which month the money does not
   cover.
2. Those numbers are rendered into the prompt as a facts block.
3. The model runs the conversation about them.

It is never asked to count. Building the conversation first and the counting
second is the prototype's flaw in a more expensive form, so the engine shipped
and was tested before any model flow was written, and
`tests/claude/assemble.test.ts` asserts that no assembled prompt asks for a
tally.

The tool list is the other half. Every tool wraps the same RLS-guarded operation
the interface calls, so a prompt asking the model to fill in the partner's track
does not fail because the prompt says not to: the row level policy rejects the
write. There is no tool to set a weight, none to decide anything, none to agree
a joint item, and none to write into a track directly. Reaching another member
goes through their pending queue, which is where it goes when a person does it
too.

Reviews need `ANTHROPIC_API_KEY`. Without it every other part of Cairn works and
a review can be run by hand from the track screens.

## Model cost

`/cost` reports what this household costs to run, by flow and by month, priced
at the rate card as it stood on the day of each call. It is written from the
first facilitated review rather than added later, because cost recorded
retrospectively is guesswork and OD-9 turns on the real distribution.

## Product direction

The gate between phase 3 and phase 4 closed on 2026-08-25 as **product now**,
recorded as OD-7 in [the product spec](./docs/PRODUCT-SPEC.md). Multi-household,
billing, onboarding and a marketing surface are in scope and build alongside
phases 4 to 8.

Two things follow from how it closed. The spike did not run, so nobody has
measured token cost per flow, and pricing has no measured floor under it until
phase 4 instruments per-household cost. And OD-4, pooled and included, is
reopened as OD-8: it was decided for two people, where model cost is a personal
expense, and it does not survive a product where cost scales with engagement.

The build order inside phase 4 is unchanged. The rules engine still ships and is
tested before any model flow, and multi-tenancy relaxes no invariant: a second
household is another `household_id`, not a weaker policy.

## What is deliberately not here

Teams, native apps, internationalisation, sharing outside a household, realtime
collaboration, a charting library, and any averaged weight in any form. Section
14 of the build specification has the full list and the reasoning.
