import { describe, expect, it } from 'vitest';
import { assembleReview, renderFacts, FACTS_HEADER } from '@/lib/claude/assemble';
import { Method, type SettingRow } from '@/lib/method/accessor';
import { SETTINGS } from '@/lib/method/seed/settings';
import type { ReviewFacts } from '@/lib/rules/for-review';

/**
 * The assembled prompt is snapshot-asserted for structure, never for model
 * output. Two things must hold: the facts block is present and complete, and
 * nothing in the prompt asks the model to count.
 */

function testMethod(): Method {
  const rows = new Map<string, SettingRow>();
  for (const s of SETTINGS) {
    rows.set(s.key, {
      key: s.key,
      value: s.value,
      defaultValue: s.value,
      tier: s.tier,
      protects: s.protects ?? null,
      rationale: s.rationale,
      fromCanonical: true,
    });
  }
  rows.set('prompts.review', {
    key: 'prompts.review',
    value: 'THE REVIEW METHOD BODY, seeded from the skill that tested it.',
    defaultValue: '',
    tier: 'solo',
    protects: null,
    rationale: 'seeded',
    fromCanonical: true,
  });
  return new Method('version-id', 1, 'test', rows);
}

const facts: ReviewFacts = {
  mode: 'individual',
  actor: 'A principal',
  generatedOn: '2026-08-25',
  timeboxMinutes: 30,
  domains: [
    { code: 'FTH', short: 'Faith', name: 'Faith, values, community, legacy' },
    { code: 'HLT', short: 'Health', name: 'Health, energy, sustainability' },
  ],
  thresholds: {
    slippageMoves: 3, rolloverLimit: 3, proposedCycles: 2, assumptionCycles: 3,
  },
  daysSinceLastReview: 9,
  counts: {
    milestonesInScope: 12, onTrack: 6, atRisk: 3, slipped: 2,
    blocked: 1, done: 0, parked: 0,
  },
  dueInside90Days: [{
    ref: 'M-1-CAR-01', title: 'Ship the thing', trackLabel: 'Mine',
    domainCode: 'CAR', targetDate: '2026-11-01', status: 'at_risk', daysAway: 68,
  }],
  slippage: [{
    id: 'x', ref: 'M-1-HLT-01', title: 'Load under ceiling', trackId: 't',
    domainCode: 'HLT', targetDate: '2026-12-01', originalTargetDate: '2026-08-01',
    moveCount: 3, moveHistory: ['2026-10-01', '2026-11-01', '2026-12-01'],
    needsGoalReexamined: true,
  }],
  rollovers: [{
    id: 'c', text: 'Draft the comparison', ownerMemberId: 'm',
    dueDate: '2026-09-01', rolloverCount: 3, atLimit: true,
  }],
  proposedUnagreed: [],
  expiredAssumptions: [{
    id: 'a', ref: 'A-REL-01', statement: 'The route stays open', domainCode: 'REL',
    confidence: 'medium', testBy: '2026-07-01', carries: 4,
    carriedReviewCount: 3, expired: true, isHope: true,
  }],
  load: [{
    trackId: 't', demand: 46, demandBad: 58, ceiling: 40, gap: 6, overCeiling: true,
  }],
  money: {
    reportingCurrency: 'NGN',
    shortfallMonths: [{
      month: '2027-03-01', outflow: 5400, income: 1000, shortfall: 4400, committed: true,
    }],
    peak: { month: '2027-03-01', outflow: 5400, income: 1000, shortfall: 4400, committed: true },
    assumedIncomeWithoutBuilder: [{ label: 'A role', amountMonthly: 900, currency: 'NGN' }],
  },
  openCollisions: [{ ref: 'X-01', tension: 'Two things, one year', openDays: 120, nextStep: null }],
  pendingForActor: [{ text: 'Have you thought about the visa', raisedAt: '2026-08-01T00:00:00Z' }],
};

describe('the assembled review prompt', () => {
  const prompt = assembleReview(testMethod(), facts);

  it('carries the method body, which is seed data rather than a source literal', () => {
    expect(prompt.system).toContain('THE REVIEW METHOD BODY');
  });

  it('injects the domain order rather than naming one in the text', () => {
    // A prompt that says "seven domains in fixed order FTH, FAM..." is wrong the
    // day someone reorders them, so it is told the order instead.
    expect(prompt.system).toContain('1. FTH');
    expect(prompt.system).toContain('2. HLT');
    expect(prompt.system).toMatch(/order this household's method\s*\n?\s*states/);
  });

  it('injects the timebox and says the application enforces it', () => {
    expect(prompt.system).toContain('30 minutes');
    expect(prompt.system).toMatch(/application enforces the clock/i);
  });

  it('tells the model never to recount, and never asks it to count', () => {
    expect(prompt.system).toMatch(/Never recount, re-derive, or estimate a\s*\n?\s*number/);
    // Nothing in the prompt may ask for a tally.
    for (const phrase of [
      'count the', 'how many times has', 'add up', 'total the', 'work out how many',
      'calculate the number',
    ]) {
      expect(prompt.system.toLowerCase(), phrase).not.toContain(phrase);
    }
  });

  it('bans em dashes, as every other piece of copy does', () => {
    expect(prompt.system).toMatch(/Do not use em dashes/);
    expect(prompt.system).not.toContain('—');
    expect(prompt.facts).not.toContain('—');
  });
});

describe('the facts block', () => {
  const rendered = renderFacts(facts);

  it('opens with its marker so it can be stripped from a stored transcript', () => {
    expect(rendered.startsWith(FACTS_HEADER)).toBe(true);
  });

  it('carries every computed number the review will discuss', () => {
    for (const figure of [
      '12', '3', '2', '1',            // milestone counts
      'M-1-HLT-01', 'moved 3 times',  // slippage with its history
      '2026-08-01',                   // the original date, not just the current one
      'carried 3 times',              // rollover depth
      'A-REL-01',                     // the expired assumption
      '46', '40',                     // demand and ceiling
      '2027-03-01', '5400', '1000', '4400',  // the shortfall month, three numbers
      'X-01', '120',                  // the collision and its age
    ]) {
      expect(rendered, figure).toContain(figure);
    }
  });

  it('marks the thresholds that have been crossed', () => {
    expect(rendered).toContain('AT THE THRESHOLD');
    expect(rendered).toContain('goal question, not a date question');
    expect(rendered).toContain('cannot roll again unchanged');
    expect(rendered).toContain('hope, not an assumption');
  });

  it('names a shortfall month with three numbers and marks it committed', () => {
    expect(rendered).toMatch(/2027-03-01: 5400 lands, 1000 comes in, 4400 short/);
    expect(rendered).toContain('COMMITTED, so this is a cash problem');
  });

  it('names the four remedies for an hour gap, and try harder is not one', () => {
    expect(rendered).toContain('cut a goal');
    expect(rendered).toContain('raise the ceiling with a named change');
    expect(rendered.toLowerCase()).not.toContain('try harder');
  });

  it('carries what someone else raised for this person', () => {
    expect(rendered).toContain('Have you thought about the visa');
  });

  it('leaves out sections that have nothing in them', () => {
    expect(rendered).not.toContain('JOINT ITEMS PROPOSED AND NOT AGREED');
  });
});
