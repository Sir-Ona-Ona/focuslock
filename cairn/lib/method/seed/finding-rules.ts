/**
 * The advisory registry. I-9: every finding class is a numeric bar and a window,
 * held as data. A class with no numeric bar cannot be registered, which is what
 * stops the model from deciding that something is worth mentioning.
 *
 * Reference classes carry the domain gate as data too: they exclude faith,
 * family and health, and a database constraint refuses any that does not.
 * They also ship disabled, because they are the only kind that can be wrong
 * about the world rather than merely wrong about interpretation.
 */

export interface SeedFindingRule {
  code: string;
  kind: 'pattern' | 'critique' | 'scenario' | 'reference';
  title: string;
  bar: Record<string, number | string>;
  windowDays: number;
  minHistoryDays: number;
  domainsExcluded: string[];
  enabled: boolean;
}

const PATTERN_HISTORY = 56;
const REFERENCE_GATE = ['FTH', 'FAM', 'HLT'];

export const FINDING_RULES: SeedFindingRule[] = [
  // Pattern: what do you keep doing. Their own logs, over time.
  { code: 'P-1', kind: 'pattern', title: 'One domain slips far more than the rest of the track',
    bar: { min_items: 3, moves_multiple_of_median: 2 }, windowDays: 182,
    minHistoryDays: PATTERN_HISTORY, domainsExcluded: [], enabled: true },
  { code: 'P-2', kind: 'pattern', title: 'Commitments in one domain roll over repeatedly',
    bar: { rollovers: 3, within_cycles: 4 }, windowDays: 120,
    minHistoryDays: PATTERN_HISTORY, domainsExcluded: [], enabled: true },
  { code: 'P-3', kind: 'pattern', title: 'Assumptions are carried past their test date as a habit',
    bar: { expired_untested: 3 }, windowDays: 182,
    minHistoryDays: PATTERN_HISTORY, domainsExcluded: [], enabled: true },
  { code: 'P-5', kind: 'pattern', title: 'The two tracks carry the plan unequally',
    bar: { commitment_share_gap: 0.65 }, windowDays: 182,
    minHistoryDays: PATTERN_HISTORY, domainsExcluded: [], enabled: true },
  { code: 'P-7', kind: 'pattern', title: 'Joint items are proposed by one principal and agreed by neither',
    bar: { proposed_unagreed: 3, cycles: 2 }, windowDays: 120,
    minHistoryDays: PATTERN_HISTORY, domainsExcluded: [], enabled: true },

  // Critique: does the plan hold together, as it stands now.
  { code: 'C-1', kind: 'critique', title: 'Hour demand exceeds the stated ceiling',
    bar: { gap_hours: 1 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },
  { code: 'C-2', kind: 'critique', title: 'A domain carries goals and no milestone',
    bar: { goals: 1, milestones: 0 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },
  { code: 'C-3', kind: 'critique', title: 'A live milestone breaches a hard constraint its own track stated',
    bar: { breaches: 1 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },
  { code: 'C-4', kind: 'critique', title: 'A collision has been open a long time with no next step',
    bar: { open_days: 90 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },
  { code: 'C-5', kind: 'critique', title: 'A gate falls due with no decision opened against it',
    bar: { days_to_decide_by: 60 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },

  // Financial: can the income carry this, by month.
  { code: 'F-1', kind: 'critique', title: 'Committed recurring outflow is a large share of income',
    bar: { ratio: 0.6 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },
  { code: 'F-2', kind: 'critique', title: 'A month where commitments exceed income',
    bar: { shortfall_amount: 1 }, windowDays: 730, minHistoryDays: 0, domainsExcluded: [], enabled: true },
  { code: 'F-5', kind: 'critique', title: 'The plan rests on income nobody is building',
    bar: { assumed_income_without_milestone: 1 }, windowDays: 0, minHistoryDays: 0,
    domainsExcluded: [], enabled: true },
  { code: 'F-6', kind: 'critique', title: 'A large share of outflow sits in a foreign currency',
    bar: { foreign_share: 0.4 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },

  // Scenario: mechanical propagation over the dependency graph.
  { code: 'S-1', kind: 'scenario', title: 'A slip displaces downstream items by several months',
    bar: { displacement_months: 3 }, windowDays: 0, minHistoryDays: 0, domainsExcluded: [], enabled: true },
  { code: 'S-2', kind: 'scenario', title: 'A displaced item crosses an open gate',
    bar: { displacement_months: 1, crosses_gate: 1 }, windowDays: 0, minHistoryDays: 0,
    domainsExcluded: [], enabled: true },

  // Reference: the only kind that can be wrong about the world. Ships off.
  { code: 'R-1', kind: 'reference', title: 'A benchmark cost for a decision the plan has open',
    bar: { attached_to_open_decision: 1, per_topic_months: 6 }, windowDays: 182,
    minHistoryDays: 0, domainsExcluded: REFERENCE_GATE, enabled: false },
  { code: 'R-2', kind: 'reference', title: 'A benchmark timeline for a gate the plan has open',
    bar: { attached_to_open_gate: 1, per_topic_months: 6 }, windowDays: 182,
    minHistoryDays: 0, domainsExcluded: REFERENCE_GATE, enabled: false },
];
