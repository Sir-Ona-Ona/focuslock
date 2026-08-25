# Cairn: Product Requirements Document

A cairn is a marker on a long path that people add stones to over time. Name confirmed.

**Status:** draft v1, for build
**Owner:** Ona
**Audience:** Ona and Leroo, private. Architected so a product version does not require a rewrite.
**Name:** Cairn, confirmed
**Date:** 2026-08-25

---

## 1. Why this exists

Two people are running a shared life plan across seven domains and a fifteen year horizon.
The planning method already works and has been prototyped as a set of Claude skills operating
on markdown files in a project. That prototype validated the model. It also exposed exactly
what a file-based system cannot do.

The method depends on rules that must be applied consistently, every session, over years:

- A milestone that has moved three times needs its goal re-examined, not its date.
- A commitment that has rolled over three review periods must be parked or dropped.
- A joint item proposed but not agreed for two partner cycles must be agreed or removed.
- An assumption untested past its date through three reviews is unverified, and should be treated that way.
- When an upstream milestone slips, every downstream item in the other person's track is
  now at risk, and someone has to notice.

In markdown, every one of those rules depends on a model remembering to apply it while reading
a long file. They are not enforced, they are hoped for. In a database they are queries that
either return rows or do not.

**That is the product thesis. The value is not the forms. It is that the discipline becomes
computed rather than remembered.**

The second thing files cannot do: give two people genuinely separate individual planning while
keeping one joint plan automatically in step. Today that is a choice between "she has no privacy"
and "you sync the joint plan by hand". Row level security removes the trade entirely.

## 2. Design principles

Carried from the prototype. These are load-bearing and should survive every implementation
decision.

1. **Three tracks, not one plan with an owner column.** His, hers, and joint. Most couples'
   planning collapses into one person's plan with the other appended, and the structure is what
   prevents it.
2. **Provisioning is not authoring.** The system creates any track freely. Only its owner puts
   goals in it. A track written on someone's behalf looks like agreement without being agreement.
3. **Nothing disappears, and nothing is overwritten.** Dropped items keep their IDs and stay
   visible at low prominence. Slippage history accumulates. Agreements, collision closures and
   decisions append events rather than mutating fields, because in three years the valuable
   question is not what the status is, it is what you believed when you chose. A plan that hides
   its own failures is decorative.
4. **Agreement is a separate question from execution.** A joint item is `proposed` until both
   agree it belongs, then `agreed`, then `active` once it is being worked. A proposed item has no
   execution status at all, because "do we agree this belongs in our plan" and "how is it going"
   are different questions, and an item marked at risk before both people agreed it exists is
   answering the second before the first. Agreement offers three responses, not one: agree,
   propose an edit, or take it to the session. Disagreement is not rejection.
5. **Never average two people's weights.** On a joint decision both weight independently, each
   allocating exactly 100 points, and both results are shown side by side. An averaged weighting
   produces a preference neither person holds, and there is no column in the schema where one
   could be stored. The budget is real: raising one criterion means taking those points from
   another, which is the trade the method exists to make explicit.
6. **The system does not decide, and its models do not pretend to authority.** It surfaces,
   computes, facilitates and records. A weighted matrix has not discovered anything except what
   follows from the weights and scores entered, and the copy says so: "under your current weights
   and scores", then "this is evidence for the conversation, not the decision itself". Firm
   language is reserved for mechanical rules; interpretation stays neutral.
7. **Timeboxes are real.** Reviews and sessions have fixed durations, and the app enforces them
   rather than suggesting them. In long sessions that means enforcing breaks and a cutoff for
   opening new heavy items, not just showing a countdown.
8. **Domain order is an argument, not a convention.** FTH, FAM, FIN, CAR, REL, LRN, HLT, fixed
   everywhere: interview, review, and every rendering. Faith opens as a filter because it
   produces the constraints the rest are tested against, and a constraint stated after the goals
   it should have bounded arrives too late to do any work. Health closes as an audit: every
   domain declares a weekly hour demand as it is built, and health sums them against a stated
   ceiling. The order is a method setting, so it is changeable, and changing it is a decision
   with a recorded reason rather than a refactor.
9. **Every domain is costed twice, in hours and in money.** `domain_load` against
   `capacity_ceiling` in the health block, and `obligation` against `income` by month in the
   finance block. Hours and money are the two capacities a plan can exceed, and a plan audited
   on only one of them is half audited. Uncosted plans take eighteen months to reveal what a
   cost line reveals in one.
10. **Privacy is per person, not per household.** Either individual can keep items out of the
   other's view without leaving the shared system.
11. **The system analyses, it does not decide.** Naming that career milestones slip while family
   ones never do is an observation from their own data that neither of them can make about
   themselves. What to do about it is theirs. The line sits between analysis and decision, not
   between recording and analysis, and drawn in the wrong place it makes the system a filing
   cabinet.
12. **Staging is a real outcome, not a delay wearing a better name.** Where a gate can resolve
    by buying more information, that is a first class option, permitted once, and it must name
    what information is being bought, who owns buying it, and the final decision date. Without
    all three it is postponement. Gate titles name the decision, not two of its three answers.
13. **The method is data, and it belongs to the household.** Domain order, cadences, timeboxes,
    agenda blocks, thresholds and prompts are versioned records, not code. The six skills seed
    the canonical method; a household forks it and changes it. Every record is stamped with the
    version it was made under, so a review run in March is never reinterpreted under a method
    written in September. The method changed six times before the first line of code was written,
    which is the whole argument.
14. **Everything is editable, and anything that reduces the other person's protection takes two
    keys.** Nothing is locked. But a setting one principal can change alone, which weakens what
    the other relies on, is not a preference: it is a unilateral edit to a two-party agreement.
    The distinction is not strictness, it is who bears the consequence. A cadence is yours. The
    rule that you cannot agree your own proposal is what the other person relies on, and it
    should not be switchable by the person it constrains at the moment it inconveniences them.
15. **Proactive advice fires on a threshold, never on judgement.** Every finding class is a
   number and a window. Three findings a cycle at most, one of them at most from outside
   knowledge. A dismissal is honoured, and three unheeded attempts end in permanent silence
   rather than a permanent nag.

## 3. Users and roles

A household holds **up to six members**, in three roles. UI ships for two; adding beyond two is
an explicit action in settings.

| Role | Max | Individual track | Joint plan | Typical |
|------|-----|------------------|------------|---------|
| Principal | 2 | yes | co-owns, agrees | the couple |
| Dependent | 4 | yes | reads, proposes, cannot agree | an adult child, a parent being planned with |
| Advisor | 4, outside the 6 | no | reads only what is granted | a coach, a financial adviser, a mentor |

Household membership is capped at six: at most 2 principals plus up to 4 dependants. Advisors sit
outside that count, up to 4 of them, because an advisor is someone you grant a view rather than
someone in the household. A household with a joint plan has exactly two principals; one is
allowed and the joint plan is simply empty.

**No admin role, and no hierarchy between the two principals.** A planning tool where one person
has elevated rights over the other reproduces the failure mode the whole design exists to prevent.
Principals jointly control membership: adding or removing any member requires both to act, so
neither can quietly bring a third party into the household's planning.

### What "joint" means with more than two members

Answered explicitly, because the three-track model was designed around two people and the answer
is not obvious once a third exists.

- **The joint plan belongs to the principals only.** Agreeing a joint item requires the other
  principal. A dependent or advisor can never agree one, however many members exist.
- **Dependents get their own individual track**, and an additional lane on the timeline in
  domains where they have items. They can raise things into a principal's pending queue and
  propose joint items, which land `proposed` and need a principal to agree them.
- **Advisors have no track and write nothing.** They read what they are granted and comment.
  Grants are scoped per track per domain by that track's owner, revocable, and expiring after
  90 days by default so a stale grant does not quietly persist for years.
- **The collisions register spans every member's track.** That is where extra members earn their
  place: an adult child's relocation plan colliding with a joint education fund is exactly the
  kind of thing this system exists to surface.

Adding a third member changes what the tool is, and the app should say so once at the point of
adding rather than presenting it as a neutral setting. A plan two people wrote for themselves
reads differently the moment a third person can see it, and both principals should agree to that
knowingly.

## 4. Domain model

### 4.1 Core entities

```
household
  id, name, created_at
  cadence_individual_days   default 7
  cadence_joint_days        default 14
  timebox_review_individual  default 30 (minutes)
  timebox_review_joint       default 45
  timebox_session_individual default 60    -- monthly
  timebox_session_joint      default 210   -- quarterly

member
  id, household_id, user_id (auth), display_name, joined_at
  role                 principal | dependent | advisor
  private_read_optin   bool, per member, governs machine reads of THEIR OWN private items
  CHECK: at most 2 principals, at most 6 members per household

advisor_grant             scoped read for advisors, never write
  id, member_id (advisor), track_id, domain_code
  granted_by_member_id, granted_at, expires_at (default +90 days), revoked_at

private_read_log          every machine read of a private item, visible to its owner
  id, item_type, item_id, owner_member_id, read_at, purpose (collision_detection), run_id

track
  id, household_id
  kind                 individual | joint
  owner_member_id      null for joint
  claim_status         unclaimed | claimed
  visibility           private | visible_to_household   (individual only)
  north_star           text
  version              int

domain                seed data, 7 rows, ordered
  code                 FTH FAM FIN CAR REL LRN HLT
  name, sort_order

goal
  id, track_id, domain_code
  horizon              now | next | later | horizon
  text

milestone
  id, track_id, domain_code
  ref                  M-O-FTH-01, generated, immutable
  title, note
  target_date
  original_target_date
  status               on_track | at_risk | slipped | blocked | done | parked | dropped
  status_reason        required when parked or dropped
  confirmed            bool, joint tracks only
  private              bool, individual tracks only
  completed_at

milestone_move
  id, milestone_id, from_date, to_date, moved_at, moved_by, reason
```

`milestone_move` is the slippage history as rows. Move count and original date become
`count(*)` and `min(from_date)` rather than a string someone remembered to append to a note.
This single table is why the three-moves rule becomes enforceable.

```
assumption
  id, track_id, domain_code, ref
  statement, confidence (high|medium|low)
  test_by
  resolution           null | confirmed | broken | expired_untested
  resolved_at
  carried_review_count   incremented each review it survives untested

assumption_milestone      join: which milestones an assumption carries

risk
  id, track_id, domain_code, ref, statement
  likelihood, impact, mitigation, owner_member_id

constraint
  id, track_id, ref, statement, agreed_at, source, hard bool

domain_load                 the hour cost of what a domain commits to
  id, track_id, domain_code
  hours_per_week            normal week
  hours_per_week_bad        bad week
  stated_at

capacity                    one row per track, set in the health block
  track_id
  ceiling_hours_per_week
  early_signal              observable, not a feeling
  stated_at

income                      what comes in, set once in the finance block
  id, track_id, label, kind, amount_monthly, currency
  confidence, starts_on, ends_on
  is_assumed                income the plan needs and nobody has yet
  built_by_milestone_id     null on an assumed income is itself the finding

obligation                  what goes out, captured in every domain
  id, track_id, domain_code, milestone_id
  label, kind (recurring | one_off)
  amount, currency, starts_on, ends_on
  committed                 committed and intended behave differently

reserve                     track_id, amount, currency, target_months
fx_assumption               household_id, base, quote, rate, assumption_id
```

`constraint.hard = true` means the decision engine eliminates any option breaching it before
scoring, and records the elimination.

The money model is the exact parallel of the hours model, and it exists because the question
people most want a planning tool to answer is whether they have committed to more than their
income can carry. Answering that needs amounts with dates on both sides. Without them a system
can only wave at money, which is what almost every planning tool does.

`committed` versus intended is not cosmetic. An intended obligation creating a shortfall is a
planning problem with a cheap fix. A committed one is a cash problem, and they rank differently.

`is_assumed` with a null `built_by_milestone_id` is the quietest failure in household planning:
a plan affordable only on income nobody has committed to producing. Writing the line down is
what makes the hole visible.

### 4.2 Cross-track entities

```
dependency
  id, household_id
  from_milestone_id, to_milestone_id
  nature               hard | soft
  note

collision
  id, household_id
  tension, tracks[], domains[]
  contested_from, contested_to
  kind                 information | weighting | values
  status               open | resolved | accepted
  resolved_by_decision_id
  opened_at, closed_at

gate
  id, household_id, ref
  title, decide_by, trigger, tracks[], domains[]
  status               open | closed
  closed_by_decision_id
```

`collision.opened_at` makes "open for four months" a computed field. In the prototype that was
a thing someone had to notice.

### 4.3 Sessions and commitments

```
review_session
  id, household_id
  mode                 individual | joint
  actor_member_ids[]
  started_at, ended_at
  gap_days             computed against previous session of same mode and actor
  summary jsonb

session_change            every status change made in a session
  id, session_id, entity_type, entity_id, from_value, to_value, reason

commitment
  id, session_id, household_id
  text, owner_member_id, due_date
  status               open | done | rolled | dropped
  rolled_from_commitment_id
  rollover_count       computed via the chain

pending_item              the queue for an unclaimed or absent owner
  id, track_id, raised_by_member_id, raised_at, text, status (open|actioned|dismissed)
```

`commitment.rolled_from_commitment_id` makes the rollover chain traversable, so
"ROLLOVER x3, park or drop" fires on a query rather than on recall.

### 4.4 Decisions

```
decision
  id, household_id, ref
  track_scope          individual | joint
  owner_member_id      individual scope only
  question             must name a choice
  decide_by
  status               open | decided | deferred | dropped
  outcome, cost_accepted, revisit_conditions
  decided_at, decided_in_session_id

decision_option
  id, decision_id, label, description, is_status_quo bool

decision_criterion
  id, decision_id, label, derived_from (constraint_id | north_star | goal_id)

decision_weight
  id, criterion_id, member_id, weight int      -- one row per member per criterion
  UNIQUE (criterion_id, member_id)

decision_score
  id, option_id, criterion_id, score 1..5, rationale
```

`decision_weight` being keyed by member is how principle 5 becomes structural rather than a rule
someone follows. There is no column in which an averaged weight could be stored.

## 5. Authorization

Postgres row level security, from day one, not retrofitted.

| Object | Read | Write |
|--------|------|-------|
| Own individual track | owner | owner |
| Another member's individual track | household members, excluding items flagged `private` | nobody but the owner |
| Joint track | household members | household members, writes land `confirmed = false` unless the writer is confirming |
| Confirmation of a joint item | household members | only a member who is not the item's last author |
| Pending items on a track | track owner, plus the member who raised each | raiser creates, owner actions |
| Review sessions | participants and household | participants |
| Individual strategy session records | actor only | actor |

Two policies worth stating explicitly because they are the ones that will be tempting to relax:

**A member can never write into another member's individual track.** Not as a convenience, not as
an import, not through an admin path. The server rejects it regardless of what the client sends,
and regardless of what a model asks for.

**A principal cannot agree their own joint proposal.** Agreement requires the other principal's
session. Otherwise `proposed` degrades into a formality within a month, and agreement offers
three responses rather than one: agree, propose an edit, or take it to the session.

### Individual tracks: visible by default, private per item

An individual track is visible to the household. Privacy is exercised per item, by its owner,
with a `private` flag. A private item renders to other members as a count only: "3 private items"
in that domain, and nothing more. Not a placeholder row, not a redacted title, not a date.

Default visible rather than default private is a deliberate call. A private-by-default track makes
the joint plan harder to build and quietly signals that the other person is an adversary. Per-item
privacy gets the same protection where it is actually wanted, without setting that tone.

### Machine reads of private items

**Claude may read private items, for collision detection only.** This is a decided position, not
a default, and it needs four things around it to stay defensible. All four are requirements, not
recommendations.

**1. Both principals opt in at household setup, separately.** Not a checkbox one person ticks
while creating the household. Each principal is asked, in their own session, and the answer is
recorded per member. If either declines, private items are excluded from machine reads for the
whole household. A privacy setting one person chose for both is not consent.

**2. Disclosure at the moment of marking.** The first time a member marks an item private, the UI
says plainly that private items are read by collision detection and never shown to other members.
Once, clearly, at the point of the decision. Burying this in a privacy policy would make the
opt-in worthless.

**3. Output routes to the owner, never to the household.** This is the load-bearing one. When
collision detection surfaces a collision derived from a private item, **it goes to that item's
owner alone.** The owner sees the collision and decides whether to raise it, and only then does
it enter the shared register. The other member never sees a collision they cannot trace, and
never learns that a private item exists in a particular domain by inference.

Without this rule the whole thing collapses. If a partner sees "collision detected in your
partner's private items", private has stopped meaning anything, and within a month people stop
marking things private at all, which loses far more than it gains.

**4. Reads are logged and visible to the owner.** A member can see, at any time, every machine
read of their private items: when, and which detection run. No content, since the content is
theirs already, but the fact of the read. An unlogged machine read of something someone marked
private is indistinguishable from no privacy at all.

Beyond collision detection, private items are excluded from every model context: reviews,
sessions, briefs, prep, exports shared with another member. The tool layer enforces this by
scope, not by prompt, so a private item can only enter a context through the one code path that
is allowed to load it.

## 6. Claude in the loop

The skills become server-side system prompts plus a typed tool set. This is the part that makes
the app more than a set of forms, and it is also where the authorization model earns its keep:
**Claude's tools are the same RLS-guarded operations the UI uses.** A prompt asking it to fill in
the partner's track does not fail because the prompt says not to. It fails because the row level
policy rejects the write.

### Where Claude runs

| Flow | What it does | Prototype source |
|------|--------------|------------------|
| First build interview | Walks the seven domains in fixed order, one at a time, writes as it goes | `life-plan` + domain prompts |
| Review session | Runs the protocol to the timebox, batches the milestone sweep, forces status words | `life-review` |
| Strategy session | Facilitates, forces the alternative, names the cost, closes each item, tracks blocks and breaks against the timebox | `strategy-meeting` |
| Decision brief | Derives criteria from constraints, builds the matrix, runs sensitivity | `decision-brief` |
| Session prep | Pre-session brief: what is due, what slipped, what is proposed and unagreed | computed + summarised |
| Collision proposal | Scheduled scan of cross-track dates and money against dependencies, across every member's track | new |
| Load audit | Sums `domain_load` against `capacity` and flags the gap, per track and jointly | health block |
| Money audit | Schedules `obligation` against `income` by month over 24 months, names shortfall months and the peak | finance block |
| Advisory findings | Writes up a finding the engine already detected: what is true, over what window, what it might mean, what would show that reading is wrong | `plan-advisor` |
| Advisory review | On demand. Reads the whole plan and writes a nine section report: verdict, capacity, timing, costing, coverage, behaviour, outside view, ranked actions, what would change its mind | `plan-advisor` |

### The method layer

The six Claude skills are not the prototype's scaffolding to be thrown away. They are the
method, and the method is the product's most valuable object. They ship as **seed data for a
versioned, editable method** rather than as prompt files in the codebase.

The argument is empirical. Over the course of designing this, the method changed six times:
Faith moved to first, Health to last, the joint review went from 60 minutes to 45, the joint
session from 90 to 210, individual sessions were pinned to monthly, and confirmation became a
three-state agreement lifecycle. Under a design where the method lives in code, every one of
those is an edit and a deploy. Under this one, each is a versioned record with a reason attached.

**What lives in the method:** domain codes and their order, cadences, timeboxes, the nine joint
session blocks and the minute-150 cutoff, every rule threshold (three moves, three rollovers,
two proposed cycles, three assumption cycles), the decision weight budget and tie band, the
advisory registry and its caps, and the text of all six prompts.

**What reads it:** everything. One accessor, resolved per request. A hardcoded 3, 150, 100 or
domain list anywhere in application code is a bug, caught by a lint rule rather than by review.

**Every record is stamped with the method version it was made under.** Sessions, findings,
decisions and advisory reviews all carry `method_version_id`. A review run in March under one
method is never reinterpreted under a method written in September, and rendering an old session
applies the timeboxes it actually ran under. Without this the logs become uninterpretable the
first time the method changes.

#### Two tiers of change, and nothing locked

Most settings a principal changes alone, with a reason. A small set does not work that way, and
the reason is not strictness.

A setting one principal can change alone, which weakens what the other principal relies on, is
not a preference. It is a unilateral edit to a two-party agreement. Those settings are still
fully editable; they simply take two keys, through a request the other principal approves, in
exactly the way adding a member does.

| Protection | Who relies on it |
|------------|------------------|
| Cannot agree your own proposal | the other principal |
| Weights are never averaged | the other principal |
| Private items excluded from every context but conflict checks | the item's owner |
| Findings from private items route to the owner alone | the item's owner |
| No finding about one member delivered to the other | the member it concerns |
| History is append-only | both, and every future reader |

The warning on a two-key request names the protection, who relies on it, and what becomes
possible without it. Not "are you sure", but "Leroo currently relies on you not being able to
agree your own proposals. Turning this off means a joint item can enter the plan with only your
agreement."

Nothing here is locked. The point is that the person a rule constrains should not be able to
switch it off alone, at the moment it inconveniences them, without the person it protects
knowing.

### The advisory layer

Detection and facilitation answer "what happened" and "what will you do". Neither answers
"what do you keep doing", which is the question a system holding three years of a household's
planning is uniquely able to answer and the household is uniquely unable to answer about itself.

Five kinds of analysis, in ascending order of care required:

| Kind | Question | Source | Can it be wrong about the world? |
|------|----------|--------|----------------------------------|
| Pattern | What do you keep doing? | their logs, over time | No |
| Critique | Does this plan hold together? | all tracks, now | No |
| Financial | Can your income carry this? | income and obligations, by month | No |
| Scenario | What breaks if this slips? | the dependency graph | No, it is arithmetic |
| Reference | What does this usually cost? | knowledge outside the plan | **Yes** |

Financial is the one people ask for. It answers "am I committed to more than my income can take"
in named months with three numbers: what lands, what comes in, and the shortfall. Never as a
ratio and never as "things look tight", because the whole value of the detector is that it
produces a sentence someone can act on.

### Two modes, and why they differ

| | Threshold findings | Advisory review |
|---|---|---|
| Trigger | a stated bar was crossed | someone pressed Review with AI |
| Scope | one subject | the whole plan |
| Cap | 3 a cycle, 1 reference | none |
| Output | four fields | a nine section report |
| Stance | names what is true | says what it would do |

A threshold finding is the system interrupting, so it is gated hard and never recommends. An
advisory review is the system being consulted, so it concludes: verdict, capacity, timing,
costing, coverage, behaviour, outside view, ranked actions, and what would change its mind.
Someone who asked for an opinion has consented to the long answer.

The rules about **what may be said about whom** apply to both, and are enforced in the assembler
rather than the prompt: nothing about one member delivered to the other, nothing derived from a
private item to anyone but its owner, no outside knowledge unprompted on faith, family or
health, nothing dismissed as "not your business", nothing during a session. The rules about
**how much** may be said apply only to the proactive mode.

Every figure in a review traces to the rules engine. A report citing a number the engine did not
compute fails validation and does not publish. Prose about money is exactly where a plausible
invented figure appears, and a plausible figure about someone's income is worse than none.

Findings fire proactively when a stated threshold trips. Every class is a number and a window,
held in a seeded registry rather than in code or in a prompt, so the model never decides that
something is worth mentioning: it writes up what the engine already surfaced.

Four rules keep this from becoming noise, which is the failure mode that kills advisory
features:

- **Three findings per cycle**, ranked by severity, one from outside knowledge at most.
- **Four dismissal reasons**, each with a defined suppression window. "Not your business" is
  permanent, because some findings are correct and unwelcome, and a system that keeps raising a
  correct unwelcome thing is one people stop opening.
- **Three attempts, then silence.** Surfaced twice, escalated once onto the joint agenda, then
  permanently quiet unless the underlying numbers change.
- **Nothing fires during a session.** A session runs the agenda that was set.

Reference findings carry five hard gates because they are the only kind that can be wrong about
the world rather than merely wrong about interpretation: attached to a live decision or gate
only, never on faith, family or health, at most one per topic per six months, always carrying
what would make the claim not apply, and verified live where the fact is the kind that goes
stale. A reference finding that cannot clear all five is dropped, not softened until it passes.

### Where Claude must not run

- Generating goals or milestones a person did not state.
- Authoring into any track the current session's actor does not own.
- Deciding anything. It produces the analysis and the recommendation with the counter-case;
  the decision row is written by a member action.
- Deciding that a finding exists, or how it ranks. The engine detects and scores; the model
  writes the finding up from evidence it was handed.
- Offering an unprompted view on faith, family or health from general knowledge. If asked
  directly, answer. Unprompted, never: these are where outside knowledge is least reliable and
  most intrusive.
- Reading a `private` item for any purpose other than collision detection, and even then only
  where both principals opted in, with the output routed to the item's owner alone and the read
  written to `private_read_log`. Reviews, sessions, briefs and prep never load private items.

### Architecture

- Anthropic TypeScript SDK, server side only, in Next.js route handlers. Never a browser-side key.
- Tool use, not free text parsing. Every mutation Claude makes goes through a typed tool that
  wraps the same service layer the UI calls, executing as the authenticated member.
- Session transcripts stored per session, so a review can be resumed and audited.
- Streaming responses for the conversational flows. Reviews are 30 minutes of back and forth.
- The computed rules (slippage count, rollover chain, proposed cycles, expired assumptions,
  hour and money capacity)
  are queried and injected into the prompt as structured context. **Claude is never asked to
  count.** It is given the counts and asked to run the conversation.

That last line is the single most important architectural decision in this document. The
prototype's weakness was asking a model to be a database. Here it is asked to be a facilitator,
which is what it is good at.

## 7. Screens, v1

1. **Home.** Next review per member and joint, with overdue in alert. What is due inside 90 days.
   Open collisions with age. Unclaimed track banner if applicable. Pending queue count.
2. **My track.** Seven domains, collapsible. Milestones with status, slippage ghosts inline,
   assumptions with expiry, risks, constraints. Inline edit. Private toggle per item.
3. **Another member's track.** Same layout, read only. Private items render as a count and
   nothing else: "3 private items" in that domain, no placeholder rows, no redacted titles, no
   dates. Advisors see only what their grant covers, with everything else absent rather than
   locked, so the shape of what they cannot see is not itself information.
4. **Joint plan.** Same, plus confirmation state on every item and a confirm action available
   only to the member who did not last author it.
5. **Timeline.** The swimlane chart. Seven domain rows in fixed order FTH, FAM, FIN, CAR, REL,
   LRN, HLT, three lanes each, Joint in the middle.
   Cross-track dependency lines, collision regions, decision gates, slippage ghosts,
   dashed borders on proposed items, which carry no execution status at all. Detail opens on tap
   and on keyboard, not only on hover. View filter All / each member / Joint.
6. **Session.** Conversational pane, visible countdown against the timebox, structured side panel
   showing the item under discussion and what has changed so far. Works on a phone.
   The 210 minute joint session needs more than a timer: block-by-block progress against plan,
   the two scheduled breaks surfaced as prompts rather than suggestions, and a hard marker at
   minute 150 after which no new heavy item can be opened. Agenda items carry a weight so the
   app can order them heaviest first and refuse to bury the hard one at the end.
7. **Decision.** Options, criteria, two weight columns side by side labelled by name, scores,
   two weighted totals, sensitivity output. Explicitly no combined total anywhere in the UI.
8. **Logs.** Review log and decision log, filterable by track and date.
9. **Method.** The whole method as editable data: structure, cadence and timeboxes, session
   blocks, rules and thresholds, decision settings, advisory settings, prompts, and protections.
   Every setting shows its value, the canonical default, and the argument it encodes. Solo
   settings edit in place with a reason. Protections show what they guard and for whom, and open
   a request to the other principal rather than an edit. Version history with diffs, and
   reverting is a forward step.
10. **Settings.** Household, export. Members: invite, roles, advisor grants
   with their expiry dates, and the private-read opt-in shown per principal with its current
   state. Adding a member beyond the second requires both principals to act and shows the
   one-time note about what changes when a third person can see the plan.
11. **Private read log.** Every machine read of the viewer's own private items: when, and which
    detection run. Reachable from settings and from any private item. Only the owner can open it.
12. **Findings.** The advisory queue. Each finding shows all four lines with none collapsed,
    the reading visually marked as a reading, and dismissal that asks which of the four reasons.
    Reference findings get a distinct treatment, an explicit "general knowledge, not from your
    plan" label, and the "would not apply to you if" clause given equal weight to the claim.

Mobile is not a reduced version. Sessions and the timeline are both things they will open on a
phone in a room together.

## 8. Build sequence

| Phase | Contents | Ships when |
|-------|----------|-----------|
| 0 | Auth, household, invite and pairing, the method seeded from the six skills, tracks provisioned from the method's domain list, RLS policies and their tests | Two people log in, see three empty tracks, and can change the method |
| 1 | Individual track CRUD across seven domains, goals, milestones, assumptions, risks, constraints, private flags with disclosure at marking, `domain_load` and `obligation` capture, plus `income` and `reserve` in the finance block | One person can run their whole track by hand, costed in both hours and money |
| 2 | Joint plan, agreement lifecycle, dependencies, pending queue | The joint plan is real and proposed means something |
| 3 | Timeline | The picture exists |
| **G** | **Product direction gate.** See below. Nothing in phase 4 starts until this closes | A direction is written down with its reasoning |
| 4 | Computed rules engine including the load audit and the money audit, then Claude-facilitated reviews on top of it | The discipline becomes automatic, and the plan is tested against both capacities |
| 5 | Decisions with dual weighting and sensitivity | Heavy calls get worked properly |
| 6 | Strategy sessions with block and break enforcement, scheduled prep briefs, notifications, collision scanning with the private-read path and its log | The full method |
| 7 | Members beyond two: dependents, advisors, scoped grants | A third person can join without the model bending |
| 8 | The advisory layer: registry, detectors, severity, surfacing, dismissal, escalation, silence, and the on-demand advisory review | The system can say what you keep doing, give an opinion when asked, and knows when to stop saying it |

Phase 4 is ordered deliberately: **the rules engine ships before the Claude flows that use it.**
Building the conversation first and the counting second reproduces the prototype's flaw in a
more expensive form.

Phases 0 to 3 are usable without any model in the loop. If the API budget or the build stalls,
what exists is still a working planning system, which is a better failure mode than a chat
interface with no data model under it.

### The gate between phase 3 and phase 4

Product direction is decided here, before any phase 4 work starts (OD-3). The gate exists because
phases 4 through 7 are where private and product diverge in cost, and deciding after them means
paying product prices for a private tool or rebuilding a private tool into a product.

**The evidence problem, and how to fix it.** Phases 0 to 3 produce CRUD screens and a chart.
That is not the product. The thing that makes Cairn worth building is the rules engine and the
facilitated sessions, and both land in phase 4. Judging "is there a product here" on phases 0 to
3 alone means judging the wrong artifact, and it will produce a no for the wrong reason or a yes
on nothing.

The fix is cheap, because the prototype already exists. Before the gate, run a **spike**:

1. Take the real plan data now sitting in the phase 1 to 3 database, export it to the markdown
   format the skills use.
2. Run the actual facilitated flows against it by hand, using the five Claude skills: two
   individual reviews, one joint review, one individual strategy session, one decision brief.
3. Measure token cost per flow. This is the OD-4 number, and it is the only way to have it before
   phase 4 rather than after.
4. Write down, honestly, whether the facilitated version was better than doing the same review
   by hand in the app built in phases 1 to 3. If it was not, that is the most valuable finding
   the project will produce, and it arrives before the expensive part.

The spike costs a few days and answers the question the gate actually turns on.

**What the gate decides.** Three directions, and each changes what phases 4 to 7 look like:

| Direction | Phases 4 to 7 | Cost profile |
|-----------|---------------|--------------|
| Private tool, permanently | Build only the flows the two of you use. Skip advisor grants, member management UI, cost instrumentation, anything multi-household | Smallest. Phase 7 probably never ships |
| Private now, product later | Build phases 4 to 7 as specified. Keep instrumenting cost. Revisit at the end of phase 6 with real usage | Middle. The current plan |
| Product now | Add multi-household, billing, onboarding and a marketing surface alongside phase 4. Pricing has to be answered, which needs the spike's cost numbers | Largest, and it competes for time with the rules engine |

**The criterion that outranks the others.** Before any of the above: **are both of you actually
using it?** Not "is it built", not "is it good". Are both individual tracks claimed, and has the
bi-weekly joint review happened on cadence for two months?

If the answer is no, the direction is "private tool" regardless of how the rest of the evidence
reads, and the work in phase 4 should be aimed squarely at whatever is causing the drop-off.
A planning tool the builder's own household will not sustain has no product case, and building a
product on top of that would be building on the one thing the whole design already identified as
the most likely failure.

**Run the gate as a decision brief.** It is exactly the shape `decision-brief` handles: named
options including the status quo, criteria derived from constraints, weights set before scoring,
sensitivity. Use the tool on itself. If the matrix comes out inside 8 percent, that is a real
finding too, and the tie-break is reversibility: "private now, product later" is the cheapest
direction to change your mind about.

## 9. Stack

You said open, with Claude in the loop. The call and the reasoning:

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js App Router | Vercel is the deploy target and server actions suit a mutation-heavy app with no public API surface |
| Hosting | Vercel | Stated |
| Data and auth | Supabase Postgres | Row level security is not a nice-to-have here, it is the enforcement mechanism for principle 2 and section 5. Getting it from the platform rather than hand-rolling authorization in application code is the single largest risk reduction available |
| ORM | Drizzle | Typed schema, migrations in the repo, and it does not fight RLS the way heavier ORMs do |
| Model | Anthropic TypeScript SDK, server side | Tool use with typed handlers. Not a wrapper library, because the session flows need control over the loop |
| Charts | Hand-built inline SVG | The timeline is bespoke. Swimlanes, cross-lane dependency routing, collision regions and slippage ghosts are not a library chart with options set |
| Styling | Tailwind, dark and light | Both will use it at night |
| Scheduling | Vercel cron | Prep briefs, cadence reminders, collision scans |

Not chosen and why: no state management library, server components carry most of it. No realtime
in v1, two people are rarely editing the same row simultaneously and the confirmation flow is
asynchronous by design.

## 10. Product-shaped, without building a product

What is being paid for now, at roughly 20 percent extra effort:

- `household` as an entity rather than two hardcoded users, holding up to six members in three
  roles from the first migration, even though the UI ships for two
- `track.kind` as data rather than three tables
- `domain` as seeded reference rows rather than a code enum, so a future product can let people
  define their own
- No names in code, prompts or seed data. Prompts are parameterised by household and member
- RLS from day one
- Full audit trail on every mutation
- Export to markdown, which also keeps the prototype format alive as a fallback

Explicitly not built: billing and metering, since OD-4 makes model usage included rather than
charged; onboarding, marketing surface, teams, native apps, i18n, sharing outside a household.
Member management beyond two exists as a function in settings, not as a designed onboarding flow.

## 11. Non-functional

- **Data export.** Every household can export the full plan to the markdown format the prototype
  uses, at any time, without asking. A life plan that is trapped in someone's side project is
  a liability to the people using it.
- **Deletion.** Household deletion removes everything within 30 days. Individual items are
  soft deleted and stay visible as `dropped`, per principle 3.
- **Model cost.** Three facilitated reviews a week across two people, two monthly individual
  sessions, one 210 minute quarterly joint session, plus scheduled prep briefs. The quarterly
  session is a single very long conversation and will be the largest single-context cost in the
  system. This is the main running cost and it scales with engagement, which
  is the wrong direction for a product but fine for two people. Worth measuring in phase 4 before
  phase 6 adds the scheduled flows.
- **Availability.** No uptime commitment. It is a planning tool used a few times a week.
- **Sensitive content.** These files will hold candid material about money, careers, faith and a
  marriage. Encryption at rest via the platform, no analytics on content, no third party
  processors beyond Supabase and Anthropic, and no training on the data.

## 12. Decisions made

Five of the six opened with this document are now closed. They are recorded here rather than
deleted, because the reasoning is what a future maintainer will need.

| ID | Decision | Resolution |
|----|----------|-----------|
| OD-1 | Individual track default visibility | **Visible by default, private per item.** A private-by-default track makes the joint plan harder to build and signals that the other person is an adversary. Per-item privacy protects what actually needs it without setting that tone |
| OD-2 | Machine reads of private items | **Permitted, for collision detection only**, subject to the four conditions in section 5: separate opt-in per principal, disclosure at the moment of marking, output routed to the item's owner alone, and every read logged and visible to that owner |
| OD-4 | Anthropic key and billing | **Pooled, included, not separately metered.** Model usage is part of the product, not a line item the household sees or manages. No bring-your-own-key path |
| OD-5 | Members beyond two | **Schema holds up to six, UI ships for two, add-member is an enabled function.** Three roles: principal, dependent, advisor. Section 3 has the model |
| OD-6 | Name | **Cairn** |
| OD-3 | When product direction is decided | **Before phase 4**, at an explicit gate between phase 3 and phase 4, informed by a spike that runs the facilitated flows by hand against real phase 3 data. Section 8 has the gate, its evidence and its three directions |

### Still open

None. All six decisions opened with this document are closed.

New decisions get IDs continuing from OD-7 and are recorded here with their reasoning rather
than replacing what is above. The gate in section 8 will produce at least one.

### Where OD-3 and OD-4 meet

Pooled and included means model cost is absorbed rather than passed on, and it scales with
engagement: a household that runs every session as designed costs several times one that runs
reviews only. The 210 minute quarterly joint session is a single very long conversation and will
be the largest per-event cost in the system.

For two people this is a personal expense and the decision is easy. For a product it is a margin
question that has to be answered before pricing exists.

OD-3 puts the direction decision before phase 4, which is before the facilitated flows ship,
which is before that cost data would naturally exist. The gate spike in section 8 is what closes
that circle: run the flows by hand through the prototype skills, measure tokens per flow, and
carry real numbers into the gate. Without the spike, OD-3 and OD-4 contradict each other and the
direction gets picked on instinct.

From phase 4 onward, instrument per-household monthly model cost split by flow, so the numbers
keep improving on the spike's estimate rather than going stale at it.

## 13. What would make this fail

Named up front, because they are more useful now than in a retrospective.

1. **One person uses it and the other does not.** The most likely failure by a wide margin.
   Mitigated by the unclaimed state being visible rather than nagged about, by the pending queue
   making a cold start fast, and by the track health check surfacing asymmetry monthly. Not
   solvable by software beyond that.
2. **Building the chat before the rules engine.** It would demo well and reproduce the exact
   weakness the app exists to fix.
3. **The agreement flow becoming a formality.** If agreeing is one click with no context,
   `proposed` stops meaning anything within a month. Agreement should require reading the item
   and taking a position, in a session, not a notification tap. Offering three responses rather
   than one helps: a single Confirm button forces everything that is not agreement into inaction,
   and people click it to clear the badge.
4. **Scope drift toward product before the gate.** Multi-tenancy, billing and onboarding are all
   more fun than the rules engine, and none of them make the plan work. The gate now exists to
   make that a decision at a fixed point rather than a drift, which only helps if nothing from
   the product column gets started before it opens.
5. **The gate decided on the wrong artifact.** Phases 0 to 3 are CRUD and a chart. Answering
   "is this a product" on that evidence produces a confident answer to a question nobody asked.
   The spike is the mitigation and it is skippable, which makes it the requirement most likely
   to get skipped when the build is running late.
6. **Cost surprise in phase 4.** Pooled billing means the cost lands on you, and it scales with
   how well the system is used. The spike gives a first number before the gate; instrument
   properly from the first facilitated flow rather than waiting for phase 6.
7. **Private stops meaning anything.** If a collision derived from a private item ever surfaces
   to the other member, even as a bare notification, people stop marking things private within a
   month. The owner-routing rule in section 5 is what prevents this, and it is the requirement
   most likely to be quietly relaxed for convenience during phase 6.
8. **The advisory layer becomes noise.** Fourteen findings in a bad quarter, or the same
   correct observation raised for the fifth time, and people stop opening the app. The three
   per cycle limit, the four dismissal reasons and the three-attempts-then-silence rule are the
   mitigations, and all three are in the surfacing query rather than in a prompt, because a
   prompt asked to show restraint will not.
9. **A reference finding that is confidently out of date.** Immigration rules, programme
   criteria and costs all change, and being wrong about someone's relocation inside a system
   they trust because everything else came from their own data does disproportionate damage.
   Ship reference findings last, behind a flag, with a live check on anything that goes stale.
10. **A third member added without a real conversation.** An advisor with a broad grant, or a
   dependent added by one principal in a hurry, changes what the household will write down. The
   both-principals-must-act rule and the 90 day grant expiry are there to make that a decision
   rather than a drift.
