import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROMPT_KEYS, SETTINGS } from '@/lib/method/seed/settings';
import { FINDING_RULES } from '@/lib/method/seed/finding-rules';

/**
 * The method suite. These are the cases that must pass before phase 0 is
 * accepted: every setting carries its argument, every protection names who
 * relies on it, and every finding class has a numeric bar.
 */
describe('the canonical method', () => {
  const REQUIRED_KEYS = [
    'structure.domains', 'structure.domain_order',
    'cadence.individual_days', 'cadence.joint_days',
    'timebox.review_individual', 'timebox.review_joint',
    'timebox.session_individual', 'timebox.session_joint',
    'session.joint.blocks', 'session.cutoff_minute',
    'rules.slippage_moves', 'rules.rollover_limit',
    'rules.proposed_cycles', 'rules.assumption_cycles',
    'decision.weight_budget', 'decision.tie_band',
    'advisory.per_cycle', 'advisory.reference_per_batch',
    'protection.self_agreement', 'protection.no_weight_averaging',
    'protection.private_scope', 'protection.private_routing',
    'protection.cross_member_findings', 'protection.append_only',
  ];

  it('seeds every key the build specification names', () => {
    const seeded = new Set(SETTINGS.map((s) => s.key));
    for (const key of REQUIRED_KEYS) expect(seeded, key).toContain(key);
  });

  it('gives every setting a non-empty rationale, because the argument is the point', () => {
    for (const s of SETTINGS) {
      expect(s.rationale.trim().length, s.key).toBeGreaterThan(20);
    }
  });

  it('makes every two-key setting name who relies on it', () => {
    const twoKey = SETTINGS.filter((s) => s.tier === 'two_key');
    expect(twoKey.length).toBeGreaterThan(0);
    for (const s of twoKey) {
      expect(s.protects?.trim(), s.key).toBeTruthy();
    }
  });

  it('holds every protection at the two-key tier', () => {
    for (const s of SETTINGS.filter((s) => s.key.startsWith('protection.'))) {
      expect(s.tier, s.key).toBe('two_key');
    }
  });

  it('names no household member anywhere in the seed', () => {
    const body = JSON.stringify(SETTINGS);
    expect(body).not.toMatch(/\bOna\b/);
    expect(body).not.toMatch(/\bLeroo\b/);
  });

  it('seeds the six prompts, parameterised rather than named', () => {
    for (const p of PROMPT_KEYS) {
      const body = readFileSync(join(process.cwd(), 'lib/method/seed/prompts', p.file), 'utf8');
      expect(body.length, p.key).toBeGreaterThan(500);
      expect(body, p.key).not.toMatch(/\bOna\b/);
      expect(body, p.key).not.toMatch(/\bLeroo\b/);
    }
  });

  it('orders the domains with faith opening and health closing', () => {
    const order = SETTINGS.find((s) => s.key === 'structure.domain_order')?.value as string[];
    expect(order[0]).toBe('FTH');
    expect(order[order.length - 1]).toBe('HLT');
  });

  it('gives the joint session two real breaks and a cutoff inside it', () => {
    const blocks = SETTINGS.find((s) => s.key === 'session.joint.blocks')?.value as
      { minutes: number; isBreak?: boolean }[];
    const total = blocks.reduce((n, b) => n + b.minutes, 0);
    const timebox = SETTINGS.find((s) => s.key === 'timebox.session_joint')?.value as number;
    const cutoff = SETTINGS.find((s) => s.key === 'session.cutoff_minute')?.value as number;

    expect(blocks.filter((b) => b.isBreak).length).toBe(2);
    expect(total).toBe(timebox);
    expect(cutoff).toBeLessThan(timebox);
  });
});

describe('the finding registry', () => {
  it('gives every class a numeric bar, because a bar that is a judgement is not one', () => {
    for (const r of FINDING_RULES) {
      const values = Object.values(r.bar);
      expect(values.length, r.code).toBeGreaterThan(0);
      expect(values.some((v) => typeof v === 'number'), r.code).toBe(true);
    }
  });

  it('excludes faith, family and health from every reference class', () => {
    for (const r of FINDING_RULES.filter((r) => r.kind === 'reference')) {
      expect(r.domainsExcluded, r.code).toEqual(expect.arrayContaining(['FTH', 'FAM', 'HLT']));
    }
  });

  it('ships reference classes disabled, since they are the only kind that can be wrong about the world', () => {
    for (const r of FINDING_RULES.filter((r) => r.kind === 'reference')) {
      expect(r.enabled, r.code).toBe(false);
    }
  });

  it('holds every pattern class behind eight weeks of history', () => {
    const required = SETTINGS.find((s) => s.key === 'advisory.pattern_min_history_days')
      ?.value as number;
    for (const r of FINDING_RULES.filter((r) => r.kind === 'pattern')) {
      expect(r.minHistoryDays, r.code).toBeGreaterThanOrEqual(required);
    }
  });

  it('has no duplicate codes', () => {
    const codes = FINDING_RULES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
