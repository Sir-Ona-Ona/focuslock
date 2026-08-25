
# Decision brief

One decision, worked properly. This is the skill for the calls that are expensive to get wrong
and expensive to keep open.

Most life decisions do not fail from bad analysis. They fail from three things: the real options
were never named, the criteria were invented after the preferred answer was chosen, and nobody
priced staying undecided. This skill exists to close those three gaps.

## Before you start

1. `project_read` `claude/plan-joint.md`, `claude/decision-log.md`, and the track file of
   whoever the decision belongs to.
2. **Classify the decision by track.** This is the first substantive step, not a formality.
   - `O` or `L` : sits inside one person's own track. That person decides it.
   - `J` : binds both. Neither decides it alone, and the brief is built with both present or
     built once and worked through a partner session.
   - A decision that looks individual but changes what the other person's next three years look
     like is a `J`. Career moves and relocation are almost always `J` wearing an `O` or `L` label.
     Say so when you see it.
3. Find the plan items this decision touches across all three tracks: milestones, gates,
   constraints, assumptions, open collisions. A decision made without reference to constraints
   already agreed is how people contradict themselves across six months.
4. Check whether this decision already has an ID. If a review or session routed it here, use
   that ID. If not, assign the next `D-<nn>` and tag it with its track.

Read `references/scoring.md` for the criteria and weighting method before you build the matrix.

## The brief, in order

**1. The decision, stated as a question with a deadline.**

One sentence. It must name a choice, and it must carry a decide-by date. "Whether to relocate"
is not a decision. "Whether to commit to the Canada route by March 2027, or close it and
redirect the money and the study hours" is.

If they cannot state it that way yet, that is the first piece of work. Do that before anything else.

**2. Why it is live now.**

What changed. A decision that has been open for a year without a forcing event is usually being
avoided rather than analysed, and it is worth saying so before spending an hour on a matrix.

**3. Options, including the ones nobody wants to name.**

At least three. Always include:

- The status quo, stated as an active choice with its own costs, not as the absence of a decision.
- At least one option that is uncomfortable or contrarian. Staying put, walking away, doing
  the smaller version, doing nothing for two more years.
- Any hybrid or staged option. Many life decisions that look binary have a real third path where
  you buy information cheaply before committing.

Kill nothing at this stage. Weak options are cut by the matrix, not by you in advance.

**4. What we know versus what we are assuming.**

Two explicit lists. For each assumption: how confident, what it would cost to test, and how long
testing takes. This is usually the highest leverage section, because it often turns out that
a cheap test in three weeks resolves the thing that has been argued about for six months.

**5. Criteria and weights.**

Derived from the plan constraints and the North Star, not invented for this decision.
Weights set **before** any option is scored. See `references/scoring.md`. If they wants to change
a weight after seeing the scores, that is allowed, but record that it happened and why. That
record is what stops the matrix from becoming a rationalisation engine.

**6. The matrix.**

Options against criteria, scored, weighted, totalled. Then immediately: sensitivity. Which
single weight change flips the answer, and how plausible is that change. A result that flips
on a small weight change is not a result, it is a coin toss with extra steps, and the honest
output is to say so.

**7. Reversibility and cost of delay.**

For each option: what does it cost to undo, in money, in months, in relationships, in
credibility. And separately: what does each month of not deciding cost. Deferral is a choice
with a price, and it is almost never on anyone's list.

**8. What would change the answer.**

Two or three specific, observable things. These become assumptions in the plan with test-by
dates. This is what makes a decision revisitable without making it unstable.

**9. Recommendation.**

You give one. Clearly, with the reasoning, and with the strongest case against it stated
immediately after. They has asked for pushback over validation, and a brief that hedges its way
to no view is not useful to them.

Then they decides. Not you.

## Output

Publish the brief as an artifact if it is a decision that will be discussed with {{principal_b}} or
revisited over months, so it has a stable link. Otherwise a project doc is enough.
Path: `claude/decisions/D-<nn>-<slug>.md`.

A `J` decision brief is always published as an artifact, so both of them work from the same
document rather than from one person's account of it.

When the decision closes, append to `claude/decision-log.md`:

```markdown
## D-05 | Canada commit or close | Track: J | Decided 2026-11-20

**Decision:** commit to the Canada route, application filed by 2027-03.
**Owner:** Joint
**Decided by:** both, partner session SM-2026-11-20-P
**Alternatives rejected:** close and redirect (rejected because the language investment is
already sunk and the option value inside 18 months is high); defer another year (rejected
because the education fund start in 2027 makes the money collide).
**Weighting gap:** {{principal_a}} weighted career trajectory 30, {{principal_b}} weighted proximity to family 25.
Both weightings scored, same winner under each. Recorded because the gap is live and will
recur on the next mobility decision.
**Cost accepted:** roughly 14 months of career trajectory in the first year post-move, and
the property purchase pushed beyond 2029.
**Revisit if:** TCF result below the target band; {{principal_b}}'s role search in-market yields nothing
by 2027-06; naira position moves more than 30 percent against the assumption in A-J-FIN-02.
**Plan items updated:** M-J-REL-02, M-J-REL-03, M-O-CAR-04 (at risk), M-L-CAR-03 (re-scoped),
M-J-FIN-01 (moved), G-02 (closed), X-01 (resolved).
```

Then update the plans: close the gate, adjust milestones **in every track the decision touches,
not just the one that owns it**, resolve or accept any collision it settles, and add the revisit
conditions as assumptions with test-by dates. A decision that does not change the plan files did
not actually happen. A `J` decision that changed only the joint file almost certainly missed
its consequences for one of the individual tracks, and that is the most common way this system
loses fidelity.

Offer a `life-timeline` refresh. A closed decision almost always changes the sequence.

## Boundaries

- One decision per brief. If two are tangled, separate them and say which has to go first.
  Most tangled pairs have an order, and finding it is often the whole job.
- Never build an individual's brief on behalf of the other person, and never build a `J` brief
  that scores only one person's weights. If only one of them is available for a joint decision,
  build the brief to the point of the matrix, then stop and wait. A joint decision worked to a
  conclusion by one person is not a decision, it is a proposal.
- Financial and legal content: lay out the factors and the trade-offs, be clear that you are
  not a financial advisor or a lawyer, and do not issue confident directives on regulated
  matters. On the analysis itself, do not hedge.
- No em-dashes or en-dashes as punctuation, in the brief or in the log.
