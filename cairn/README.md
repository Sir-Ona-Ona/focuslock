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
| G | Product direction gate, run as a decision brief against a spike | Not started |
| 4 | Rules engine, then Claude-facilitated reviews on top of it | Rules engine built and tested. Model flows not started |
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

## What is deliberately not here

Billing, onboarding flows, marketing pages, multi-household, native apps,
internationalisation, sharing outside a household, realtime collaboration, a
charting library, and any averaged weight in any form. Section 14 of the build
specification has the full list and the reasoning.
