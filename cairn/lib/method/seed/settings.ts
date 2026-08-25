/**
 * The canonical method Cairn ships.
 *
 * The six skills are not scaffolding to be thrown away: they are the method,
 * and the method is the product's most valuable object. It ships as seed data
 * for a versioned, editable record rather than as literals in the codebase,
 * because the method changed six times before the first line of code was
 * written and it will keep changing.
 *
 * Nothing outside this directory may contain a threshold, a timebox, a domain
 * list or a prompt string. scripts/check-literals.ts enforces that.
 */

export type Tier = 'solo' | 'two_key';

export interface SeedSetting {
  key: string;
  value: unknown;
  tier: Tier;
  /** Who is worse off if this is weakened. Required on two_key. */
  protects?: string;
  /** The argument the setting encodes, shown at the point of editing. */
  rationale: string;
}

export const CANONICAL_LABEL = 'Faith first, health last';
export const CANONICAL_NOTE =
  'The method as the six skills define it: seven domains in a fixed order, weekly '
  + 'individual reviews, a fortnightly joint review, monthly individual sessions and a '
  + 'quarterly joint session.';

export const SETTINGS: SeedSetting[] = [
  {
    key: 'structure.domains',
    tier: 'solo',
    value: [
      { code: 'FTH', short: 'Faith', name: 'Faith, values, community, legacy' },
      { code: 'FAM', short: 'Family', name: 'Family, marriage, children' },
      { code: 'FIN', short: 'Finance', name: 'Finance, investment, property' },
      { code: 'CAR', short: 'Career', name: 'Career and professional trajectory' },
      { code: 'REL', short: 'Relocation', name: 'Relocation and mobility' },
      { code: 'LRN', short: 'Learning', name: 'Learning, credentials, capability' },
      { code: 'HLT', short: 'Health', name: 'Health, energy, sustainability' },
    ],
    rationale:
      'Seven domains, because a plan split finer than this stops being a plan and becomes a '
      + 'task list, and split coarser it hides the trade between career and family that the '
      + 'method exists to make visible.',
  },
  {
    key: 'structure.domain_order',
    tier: 'solo',
    value: ['FTH', 'FAM', 'FIN', 'CAR', 'REL', 'LRN', 'HLT'],
    rationale:
      'Faith opens as a filter because it produces the constraints the rest are tested '
      + 'against, and a constraint stated after the goals it should have bounded arrives too '
      + 'late to do any work. Health closes as an audit because every other domain declares a '
      + 'weekly hour demand as it is built, and health is where those are summed against a '
      + 'stated ceiling. Reordering is allowed; it is a decision, not a preference.',
  },
  {
    key: 'cadence.individual_days',
    tier: 'solo',
    value: 7,
    rationale:
      'Weekly is short enough that a slipped item is caught while the reason is still '
      + 'remembered. Longer and the review becomes archaeology.',
  },
  {
    key: 'cadence.joint_days',
    tier: 'solo',
    value: 14,
    rationale:
      'Fortnightly on the joint plan. Weekly on a shared plan produces a meeting with nothing '
      + 'in it, and monthly lets a proposed item sit unanswered for a season.',
  },
  {
    key: 'timebox.review_individual',
    tier: 'solo',
    value: 30,
    rationale:
      'Thirty minutes is enough for a status refresh across seven domains and not enough to '
      + 'start deciding things. That separation is the point: reviews refresh, sessions decide.',
  },
  {
    key: 'timebox.review_joint',
    tier: 'solo',
    value: 45,
    rationale:
      'Forty five minutes, cut down from sixty. The joint review kept finishing early and then '
      + 'drifting into decisions it was not set up to make.',
  },
  {
    key: 'timebox.session_individual',
    tier: 'solo',
    value: 60,
    rationale:
      'An hour, monthly. Pinned to monthly because an individual session called only when it '
      + 'felt needed was never called.',
  },
  {
    key: 'timebox.session_joint',
    tier: 'solo',
    value: 210,
    rationale:
      'Three and a half hours, quarterly, raised from ninety minutes. Ninety could not hold '
      + 'nine blocks and two breaks, so the hard item was always the one that got buried.',
  },
  {
    key: 'session.joint.blocks',
    tier: 'solo',
    value: [
      { n: 1, label: 'Open: what changed since last time', minutes: 15 },
      { n: 2, label: 'Milestone sweep across all three tracks', minutes: 30 },
      { n: 3, label: 'Slippage and what it means', minutes: 25 },
      { n: 4, label: 'Break', minutes: 10, isBreak: true },
      { n: 5, label: 'Collisions and cross-track dependencies', minutes: 35 },
      { n: 6, label: 'Money and hours against capacity', minutes: 25 },
      { n: 7, label: 'Break', minutes: 10, isBreak: true },
      { n: 8, label: 'Decisions and gates coming due', minutes: 40 },
      { n: 9, label: 'Close: commitments, owners and dates', minutes: 20 },
    ],
    rationale:
      'Nine blocks with two real breaks. Agenda items carry a weight so the heavy one is opened '
      + 'first: an agenda ordered by convenience buries the item the session was called for.',
  },
  {
    key: 'session.cutoff_minute',
    tier: 'solo',
    value: 150,
    rationale:
      'After this minute no new heavy item may be opened. A decision taken in the last hour of '
      + 'a long session is taken by whoever still has energy, which is not a method.',
  },
  {
    key: 'rules.slippage_moves',
    tier: 'solo',
    value: 3,
    rationale:
      'A milestone that has moved three times has a goal problem, not a date problem. At two '
      + 'moves it surfaces; at three the copy stops offering a new date as the first option.',
  },
  {
    key: 'rules.rollover_limit',
    tier: 'solo',
    value: 3,
    rationale:
      'A commitment carried three review periods is not a commitment. Park it, drop it, or '
      + 're-scope it into something that fits the week it actually has.',
  },
  {
    key: 'rules.proposed_cycles',
    tier: 'solo',
    value: 2,
    rationale:
      'A joint item proposed and unagreed for two cycles is forced: agree it, or move it to the '
      + 'individual track of whoever wants it. There is no third cycle, because a permanently '
      + 'proposed item is a disagreement nobody has had.',
  },
  {
    key: 'rules.assumption_cycles',
    tier: 'solo',
    value: 3,
    rationale:
      'An assumption carried past its test date through three reviews is a hope. The plan may '
      + 'still rest on it, but it should say so in those words.',
  },
  {
    key: 'decision.weight_budget',
    tier: 'solo',
    value: 100,
    rationale:
      'Exactly one hundred points per person per decision. The budget is the method: raising one '
      + 'criterion means taking those points from another, which is the trade being made explicit. '
      + 'Allowing any total turns it into "assign whatever importance you like".',
  },
  {
    key: 'decision.tie_band',
    tier: 'solo',
    value: 8,
    rationale:
      'A margin under eight points is a tie, and a tie is reported as one. The tie-break is '
      + 'reversibility, not the extra decimal place the matrix happens to produce.',
  },
  {
    key: 'advisory.per_cycle',
    tier: 'solo',
    value: 3,
    rationale:
      'At most three findings a cycle, ranked by severity. Advice fatigue kills this layer faster '
      + 'than wrong advice: a bad quarter that generates fourteen findings must still surface three.',
  },
  {
    key: 'advisory.reference_per_batch',
    tier: 'solo',
    value: 1,
    rationale:
      'At most one finding a cycle may come from outside knowledge, because that is the only kind '
      + 'that can be wrong about the world rather than merely wrong about interpretation.',
  },
  {
    key: 'advisory.attempts_before_silence',
    tier: 'solo',
    value: 3,
    rationale:
      'Surfaced twice, escalated once onto the joint agenda, then permanently quiet unless the '
      + 'underlying numbers move. A system that raises the same thing indefinitely gets routed around.',
  },
  {
    key: 'advisory.pattern_min_history_days',
    tier: 'solo',
    value: 56,
    rationale:
      'Eight weeks of logs before a pattern detector may fire at all. A pattern claimed from three '
      + 'weeks of data is a coincidence with a confident voice.',
  },
  {
    key: 'advisory.disconfirm_min_chars',
    tier: 'solo',
    value: 40,
    rationale:
      'The fourth line of a finding, what would show the reading is wrong, is the one most likely '
      + 'to be dropped under a token limit and the one that separates analysis from opinion.',
  },
  {
    key: 'money.horizon_months',
    tier: 'solo',
    value: 24,
    rationale:
      'Two years of monthly schedule. Long enough to catch the year everything lands in, short '
      + 'enough that the numbers are still worth arguing about.',
  },

  /* ---------------------------------------------------------- protections */

  {
    key: 'protection.self_agreement',
    tier: 'two_key',
    value: true,
    protects: 'the other principal',
    rationale:
      'A principal cannot agree their own joint proposal. Without it, proposed degrades into a '
      + 'formality within a month and a joint item can enter the plan with one person’s agreement.',
  },
  {
    key: 'protection.no_weight_averaging',
    tier: 'two_key',
    value: true,
    protects: 'the other principal',
    rationale:
      'Two weightings are shown side by side and never combined. An averaged weighting produces a '
      + 'preference neither person holds, and there is no column in the schema where one could be stored.',
  },
  {
    key: 'protection.private_scope',
    tier: 'two_key',
    value: true,
    protects: 'the item’s owner',
    rationale:
      'Private items are excluded from every model context except collision detection, by scope '
      + 'rather than by prompt, so a private item can only enter a context through the one code '
      + 'path allowed to load it.',
  },
  {
    key: 'protection.private_routing',
    tier: 'two_key',
    value: true,
    protects: 'the item’s owner',
    rationale:
      'A finding derived from a private item goes to that item’s owner alone. If a partner ever '
      + 'sees that a collision came from private items, private has stopped meaning anything and '
      + 'people stop marking things private within a month.',
  },
  {
    key: 'protection.cross_member_findings',
    tier: 'two_key',
    value: true,
    protects: 'the member the finding is about',
    rationale:
      'No finding about one member is delivered to the other. A correct observation about one '
      + 'person delivered privately to the other is not analysis, it is ammunition.',
  },
  {
    key: 'protection.append_only',
    tier: 'two_key',
    value: true,
    protects: 'both principals, and every future reader',
    rationale:
      'Agreements, collision closures and decisions append events rather than mutating fields. In '
      + 'three years the valuable question is not what the status is, it is what you believed when '
      + 'you chose.',
  },
];

/** The prompt keys seeded from the six skills, and where each is used. */
export const PROMPT_KEYS = [
  { key: 'prompts.interview', file: 'interview.md', source: 'life-plan' },
  { key: 'prompts.review', file: 'review.md', source: 'life-review' },
  { key: 'prompts.session', file: 'session.md', source: 'strategy-meeting' },
  { key: 'prompts.brief', file: 'brief.md', source: 'decision-brief' },
  { key: 'prompts.advisor', file: 'advisor.md', source: 'plan-advisor' },
  { key: 'prompts.timeline', file: 'timeline.md', source: 'life-timeline' },
] as const;

export const PROMPT_RATIONALE =
  'Seeded verbatim from the skill that tested it. Names are placeholders the assembler fills per '
  + 'household, and anything the method controls (domain order, timeboxes, thresholds) is injected '
  + 'rather than written into the text, because a prompt that names its own order will be wrong the '
  + 'day someone reorders it.';
