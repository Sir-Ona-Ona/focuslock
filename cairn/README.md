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

The app builds with no environment set, and a deployment that has none renders a
page naming the variables it needs rather than a 500. So it is safe to deploy
first and configure second.

### 1. Create the Supabase project

Any region. Note the project URL and the anon key from Settings, API, and the
database password you set at creation.

### 2. Apply the migrations

Migrations do not run on deploy, and they should not: a deploy that rewrites the
schema is a deploy that can lose a plan. Run them once, from anywhere with the
repository checked out.

```bash
cd cairn
npm install
DIRECT_URL="postgres://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  npm run db:push
```

That applies every migration in order, seeds the canonical method from the six
skills, and creates the `cairn_app` role.

### 3. Give `cairn_app` a password

The app connects as that role, and only that role. Run against the same
database:

```sql
alter role cairn_app with login password 'a long random string';
```

This is the step that matters most. `cairn_app` cannot bypass row level
security; the `postgres` role can. Row level security is the enforcement
mechanism for every privacy and authorship rule in Cairn, and a superuser
ignores all of it silently: the policies still exist and are never consulted.
Point `DATABASE_URL` at the wrong role and the app refuses to serve, with the
reason on screen, rather than quietly showing one member another member's
private items.

### 4. Create the Vercel project

Import `Sir-Ona-Ona/focuslock` and set **Root Directory** to `cairn`. The
repository also holds an unrelated project at its root, so this is required.

### 5. Set the environment variables

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgres://cairn_app:PASSWORD@db.PROJECT.supabase.co:6543/postgres?pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The publishable key, beginning `sb_publishable_` |
| `ANTHROPIC_API_KEY` | Optional. Facilitated reviews only |
| `CRON_SECRET` | Optional until phase 6 |

Port 6543 is the pooler, which is what a serverless runtime should use. Keep
`DIRECT_URL` out of Vercel entirely: it is the owner connection and belongs
only wherever you run migrations.

**No key that can bypass row level security is needed anywhere.** Not the secret
key (`sb_secret_`), not the legacy `service_role` JWT, not
`SUPABASE_SERVICE_ROLE_KEY`. Cairn enforces authorization in the database
against the `cairn_app` role, so there is no request path that could hold one.
If you are looking at the API Keys screen wondering which secret to copy, the
answer is none of them: only the publishable key and the database password.

The publishable key is safe in the browser, which is what the Supabase screen
means by "safe to use in a browser if you have enabled Row Level Security". RLS
is on for every table in Cairn from the first migration, so that condition is
met.

### 6. Point Supabase auth at the deployment

In Supabase, Authentication, URL Configuration, set the Site URL to the Vercel
domain and add `https://YOUR-DOMAIN/auth/callback` to the redirect allow list.
Sign in is an email one time code, so no other provider setup is needed.

### 7. Deploy, then claim

Redeploy so the environment is picked up. Open the site, sign in with your
email, and create the household. Your partner signs in with the address you
gave and claims their own track.

### Deploying from GitHub Actions instead

Two workflows do the whole thing without anyone running a command locally.

`.github/workflows/cairn-migrate.yml` applies the migrations, seeds the method,
gives `cairn_app` its password, and finishes by asserting that `cairn_app`
cannot bypass row level security, failing if it can. Manual, with a typed
confirmation.

`.github/workflows/cairn-deploy.yml` runs the full test suite against a real
Postgres service container, including the row level security suite, then links
the Vercel project (creating it on the first run), syncs the environment from
secrets, builds, deploys, and checks what the deployed site reports about
itself. Manual, or on a push to `main` that touches `cairn/`.

They exist because the Claude Code environment that builds Cairn cannot reach
`api.vercel.com` or `api.supabase.com`: the organization's egress policy denies
both. GitHub runners are not restricted, and the credentials live in repository
secrets rather than in a terminal history.

**Where they go.** GitHub repository secrets, not Vercel and not a file in the
repo:

`https://github.com/Sir-Ona-Ona/focuslock/settings/secrets/actions`

Repo, then Settings, then Secrets and variables, then Actions, then New
repository secret. Add each one on the **Secrets** tab as a *repository* secret.

Not an environment secret. An environment scopes its secrets to jobs that name
that environment, and the check that decides whether a deploy can run lives in
the verify job, which does not name one. A token added as an environment secret
would be invisible there and the deploy would skip silently.

You enter these once, here. The deploy workflow pushes the four application
values into the Vercel project itself, so there is nothing to type into the
Vercel dashboard.


| Secret | Used by | What |
|--------|---------|------|
| `VERCEL_TOKEN` | deploy | A Vercel API token, scoped to the owning team. See the note on expiry below |
| `CAIRN_DATABASE_URL` | deploy | The pooled connection, as `cairn_app`, port 6543 |
| `CAIRN_SUPABASE_URL` | deploy | The Supabase project URL |
| `CAIRN_SUPABASE_ANON_KEY` | deploy | The **publishable** key, beginning `sb_publishable_` |
| `CAIRN_ANTHROPIC_API_KEY` | deploy | Optional. Facilitated reviews only |
| `CAIRN_CRON_SECRET` | deploy | Optional until phase 6 |
| `CAIRN_DIRECT_URL` | migrate | The owner connection, port 5432. Never goes to Vercel |
| `CAIRN_APP_DB_PASSWORD` | migrate | The password to give `cairn_app`. Any characters are fine |

Two optional entries go on the **Variables** tab of that same page rather than
the Secrets tab, because neither is secret: `VERCEL_PROJECT_NAME` if you want
the project called something other than `cairn`, and `VERCEL_TEAM` if the
token's account has more than one team.

**On the token's expiry.** An expired token behaves worse than an absent one.
The deploy job is skipped when `VERCEL_TOKEN` is empty, but an expired token is
not empty: the job runs and fails on authentication, so every push to `main`
touching `cairn/` carries a red cross until it is rotated. Pick the expiry by
how you intend to deploy. A few days if this pipeline is a one-off before
switching to Vercel's own Git integration, ninety days with a rotation reminder
if it is the deploy path, and not "no expiration", which is the credential
nobody remembers until it leaks.

Vercel's Git integration is the alternative worth knowing about: point it at
this repository with the root directory set to `cairn` and it deploys on every
push with no token to hold or rotate. Keep the verify job as CI if you do,
because it runs the row level security suite that Vercel does not, and keep the
migrate workflow, because Vercel never touches the schema. The trade is that
Vercel deploys whether or not the tests pass, while this pipeline will not.

Run `Migrate the Cairn database` first, then `Deploy Cairn to Vercel`.

Every step of both workflows was rehearsed locally against a real Postgres
before being committed: the migration run, the password step against a password
containing quotes, dollar quotes and backslashes, the full 84 test suite over a
password-authenticated TCP connection, and the row level security assertion in
both directions, confirming it passes when the role is scoped and fails when it
is not. Every Vercel CLI flag was checked against the pinned CLI version rather
than recalled.

**One prerequisite:** GitHub only offers the Run workflow button for workflows
that exist on the default branch, so these have to reach `main` before they can
be dispatched.

### Scheduled routes

Not registered in `vercel.json`, deliberately. They are no-ops until phase 6,
and the Hobby plan caps a project at two cron jobs, so registering three fails
the deploy for a reason that has nothing to do with the code. `CRON.md` has the
schedules to add when phase 6 lands.

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
