
# Life timeline

The plan files are what get edited. This is what gets looked at. It is how the two of them see
fifteen years of commitments in one view, and it is the visual anchor of every strategic session.

The single most valuable thing this chart does is make the **cross-track picture** visible:
where their track, their track and the joint plan want the same years, and what breaks when one
of them slips.

## Before you build

1. `project_read` `claude/plan-joint.md`, `claude/track-{{principal_a_slug}}.md`, `claude/track-{{principal_b_slug}}.md`.
2. `project_read` `claude/timeline-url.md`. If it holds a URL, you are updating that artifact.
   Pass the URL as `url` on the Artifact call. Getting this wrong gives them a second link and a
   stale first one.
3. Load the `artifact-design` skill before writing the page. Load `dataviz` too: this is a chart,
   and the palette and legibility rules there apply.

If a track file does not exist, render what does exist and mark the missing lane as
`not yet built`. Do not invent content for a missing track.

## What the timeline must show

Read `references/timeline-spec.md` for the full layout. The non-negotiables:

- **Time runs left to right**, from the current month out to the far edge of the Later horizon.
  Horizon bands (Now, Next, Later) visible as background regions. Today is a marked line.
- **Seven domain rows** in the fixed order FTH, FAM, FIN, CAR, REL, LRN, HLT. Fixed order matters:
  they will read this every two weeks and should not have to relearn the layout.
- **Three swimlanes inside each domain row**: {{principal_a}} on top, Joint in the middle, {{principal_b}} below.
  Joint in the middle is deliberate. It is what the two individual lanes connect through, and the
  eye should travel across it.
- **Milestones as marks on their swimlane**, positioned by target date, coloured by status.
  Every mark carries its ID.
- **Cross-track dependency lines** between marks in different lanes. Hard solid, soft dashed.
  If the upstream item is `Slipped` or `Blocked`, the line takes the alert colour. That single
  visual is the reason this chart exists: it shows blast radius across two people's lives.
- **Collision markers** where the collisions register has an open entry. Rendered as a shaded
  vertical region spanning the affected lanes across the contested period, labelled with the
  collision ID. Someone should be able to point at the chart and say "that is the problem".
- **Proposed joint items** rendered with a dashed border, so anything one of them assumed
  about the other is visually distinct from anything actually agreed.
- **Decision gates as vertical markers** spanning full height, labelled with the decide-by date.
- **Slippage ghosts**: a milestone that has moved shows a hollow mark at its original date with
  a light connector. Repeated slippage should be visible without reading a single label.

**View filter** at the top: All | {{principal_a}} | Joint | {{principal_b}}. Default All. Each of them will want to
look at their own track alone sometimes, and the joint session wants the full picture.
Persist the last choice in localStorage inside a try/catch, defaulting to All.

Below the chart, four compact panels: open collisions, open decisions and gates, assumptions
needing attention, and next review dates per track.

## Build rules

- Self contained single HTML file. Inline all CSS and JS. No external hosts.
- Hand-built inline SVG for the chart. Do not pull a charting library.
- Theme aware, light and dark, per the artifact rules. Full light palette on bare `:root`,
  tokens redefined under the dark media query and the dark attribute selector.
- The chart scrolls horizontally inside its own container. The page body never scrolls sideways.
- Readable on a phone. They will open this in a meeting, not at a desk.
- Do not animate anything. This is a reference surface.

## Publishing

- Title: `Life Timeline`. Stable across every republish.
- Favicon: the same one every time. Pick it on the first publish and never change it.
- Pass the stored `url` on every update so it lands at the same address.
- After the first publish, write the URL into `claude/timeline-url.md` immediately. Skipping this
  is how the next session publishes a duplicate.

Give them the link in one line. Do not describe the chart back to them.

## Refresh triggers

Offer a refresh, without being asked, when:

- A review changed a milestone status or date, or added or dropped an item
- A joint item moved between `proposed` and `confirmed`
- A collision was logged, resolved or accepted
- A decision closed and changed the sequence, or a gate moved
- A partner strategic session is about to run and the timeline is older than the last review

Do not refresh on every plan touch. A note edit or a metric update does not need a republish.

## Boundaries

- Render the plan. Do not edit it. If you spot an error while building, say so and let
  `life-plan` fix it, with the owner of that track.
- Do not render anything from a track file that is not there. A blank lane is honest.
  A filled-in guess is not.
- No em-dashes or en-dashes as punctuation, on the page or in what you say about it.
