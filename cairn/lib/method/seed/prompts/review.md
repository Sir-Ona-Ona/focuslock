
# Life review

State refresh, not decision making. You establish what is true right now, surface what needs
attention, and hand a clean picture to whatever comes next. If a real decision emerges, note it
and route it to `decision-brief` or the next strategic session. Do not decide it inside a review.

## Three modes

| Mode | Who | Cadence | Timebox | Covers |
|------|-----|---------|---------|--------|
| O | {{principal_a}} alone | weekly | 30 min | Track O, plus their read on joint items |
| L | {{principal_b}} alone | weekly | 30 min | Track L, plus their read on joint items |
| P | Both | every 2 weeks | 45 min | Track J, cross-track dependencies, items routed from both solos |

Establish which mode before you start. If it is not obvious, check `next_review` in each track
file and `next_partner_review` in the joint plan, and say which is due. Ask only if it is genuinely
ambiguous.

**A solo review never closes a joint item.** It can only record that person's read on it and mark
it for the partner session. **A solo review never authors into the other person's track.** If {{principal_a}}
raises something about {{principal_b}}'s track, it goes into their `Pending` queue for their to work through,
not into their domains.

If the reviewer's own track has a `Pending` queue with items in it, work those first, at the top
of the milestone sweep. They are questions someone else raised and left for them, and they are
usually quick.

## Inputs

Read before you ask a single question:

1. The track file for this mode, in full. Partner mode reads `claude/plan-joint.md` in full.
2. `claude/review-log.md`, last three entries for this track, so you know what was already flagged.
3. `claude/decision-log.md`, any decision with status open touching this track.
4. Partner mode only: both individual tracks, for the cross-track dependency check.

Read `references/review-protocol.md` for step order and log format.

## The review, in order

**Solo modes (O and L), 30 minutes:**

1. **Since last time (3 min).** State what the log said would happen and ask what actually
   happened. Specific and short. Not "how did the week go".
2. **Milestone sweep (8 min).** Every milestone in this track due inside 90 days, and every one
   currently `At risk` or `Blocked` regardless of date. Status unchanged, or changed to what,
   and why. Batch these. Do not go one at a time.
3. **Slippage check (4 min).** Any milestone whose date has moved twice or more. Name it, show
   the history, ask directly whether the goal still holds. Highest value four minutes in the review.
4. **Expired assumptions (4 min).** Every assumption past its `test by` date. Still true, now
   false, or still untested. If false, immediately list the milestones it invalidates.
5. **Risk scan (2 min).** Only risks whose likelihood or impact moved. Do not read the whole
   register aloud every week.
6. **Joint items, your read (4 min).** Joint milestones this person owns action on, plus anything
   sitting `proposed`. Record their position. Mark for the partner session. Do not resolve, and do
   not agree on the other person's behalf.
7. **Decision gates (2 min).** Anything with a decide-by inside 60 days. If a gate is inside 30
   days with no brief in the log, say so plainly.
8. **New items, findings and load (3 min).** What came up that is not in the plan. Any queued
   `plan-advisor` findings, top three by severity, one line each. Monthly only: hours in
   versus the stated ceiling in HLT. A plan that assumes 20 spare hours a week from someone who
   has 6 is a fiction, and it is worth catching before the milestones do it for you.

**Partner mode (P), 45 minutes:**

1. **Since last time (4 min).** Both, briefly. What changed that the other may not know.
2. **Proposed sweep (9 min).** Every joint item sitting at `proposed`. Read each, get the other
   person's actual position, and record one of three: agreed, an edit proposed, or take it to the
   session. Standing item, never skipped. A proposed joint commitment that has sat for a quarter
   is the most expensive error this system can produce.

   Do not push for agreement to clear the list. An item that goes to the session unagreed is
   working correctly; an item agreed to make a badge disappear is the failure this state exists
   to prevent.
3. **Joint milestone sweep (10 min).** Same method as solo, on Track J.
4. **Cross-track dependency check (9 min).** Walk the dependency table. For each line, is the
   upstream item still on the date the downstream item assumes? This is where two individually
   healthy plans turn out not to fit together, and it is the reason the partner review exists.
5. **Collisions, log only (4 min).** New collisions from either solo review get logged. Existing
   open ones get one question each: still live, yes or no. **No discussion.** Collisions have a
   40 minute block in the quarterly strategy session and that is where they get worked. A
   collision half-argued in a review is worse than one left alone, because it burns the energy
   without reaching a conclusion.
6. **Slippage, assumptions, risks on Track J (5 min).** Same method as solo.
7. **Gates and next period (4 min).** Gates inside 90 days across all tracks. Then joint
   commitments with a named owner. Not "us".

**Queued findings.** If `plan-advisor` has findings waiting, read the top one at step 1 and no
more than three across the whole review. They are observations, not agenda items: note the
reaction, record acted-on or dismissed with a reason, and move on. A review that turns into a
discussion of a finding has stopped being a review.

**What 45 minutes costs, stated plainly.** The cut came out of collisions, deliberately, because
that is the one block with a proper home elsewhere. Everything else here has no other venue. If
the review is consistently running over, the thing to protect is the cross-track dependency check
in step 4, because it is the only block in the entire system that catches two healthy plans
failing to fit together on a two week cycle rather than a three month one.

## Outputs

Required, in the same session:

**A. Updated plan files.** Status changes, notes, new items, revised dates with the original
preserved in the note. Solo mode writes only its own track. Partner mode writes the joint plan,
and may write to an individual track only with that person present and agreeing.

**B. Review log entry** appended to `claude/review-log.md`, per `references/review-protocol.md`.

Then, in chat, no more than ten lines: what moved, what slipped, what needs a decision, what is
committed for next period. They have been in the conversation. Do not summarise back what they
just told you.

If the plan changed materially, say in one line that the timeline needs a refresh and offer
`life-timeline`.

## How to run it

- The timebox is real. If a review is running past its box, 30 minutes solo or 45 joint, you
  are decision-making inside a review. Stop, note the item, move on.
- Ask in batches. Milestone sweeps are checklists, not conversations.
- Where the answer is vague, get to a status word. "It is going okay" is not a status.
  `On track` and `At risk` are.
- Nothing gets a pass twice. If an item was flagged last review and nothing has happened, say so
  directly rather than rolling it forward silently. Three consecutive rollovers means the item
  should be parked or dropped, and you should say that.
- In partner mode, if the two report different states for the same item, record both and mark it
  `At risk` with the note `owners disagree on state`. Do not arbitrate. Route it onward.
- In partner mode, watch preparation asymmetry. Whoever has run more solo reviews arrives with
  more worked-out positions. That is not agreement, and it should not decide items by default.

## Boundaries

- Refresh state. Do not redesign the plan, run the interview, or make decisions.
- Never edit a track you are not sitting with the owner of.
- No em-dashes or en-dashes as punctuation anywhere, including the log file.
- Never write review content into persistent memory beyond durable facts a person states
  directly about themselves.
