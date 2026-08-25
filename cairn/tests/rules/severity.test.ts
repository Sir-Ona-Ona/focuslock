import { describe, expect, it } from 'vitest';
import { blastRadius, capBatch, persistence, severity, windowPressure } from '@/lib/rules/severity';
import { SETTINGS } from '@/lib/method/seed/settings';

const perCycle = SETTINGS.find((s) => s.key === 'advisory.per_cycle')?.value as number;
const referencePerBatch = SETTINGS
  .find((s) => s.key === 'advisory.reference_per_batch')?.value as number;
const limits = { perCycle, referencePerBatch };

describe('severity', () => {
  it('doubles blast radius when a finding spans more than one track', () => {
    expect(blastRadius({ milestonesTouched: 3, spansMultipleTracks: false })).toBe(3);
    expect(blastRadius({ milestonesTouched: 3, spansMultipleTracks: true })).toBe(6);
  });

  it('raises window pressure as a gate approaches', () => {
    expect(windowPressure(null)).toBe(1);
    expect(windowPressure(400)).toBe(1);
    expect(windowPressure(365)).toBe(2);
    expect(windowPressure(91)).toBe(2);
    expect(windowPressure(90)).toBe(3);
    expect(windowPressure(1)).toBe(3);
  });

  it('grows persistence with how long the finding has been true', () => {
    expect(persistence(0)).toBe(0);
    expect(persistence(30)).toBeCloseTo(Math.log(2), 6);
    expect(persistence(90)).toBeGreaterThan(persistence(30));
  });

  it('multiplies the three factors', () => {
    const s = severity({
      milestonesTouched: 2, spansMultipleTracks: true,
      daysToNearestOpenGate: 45, daysTrue: 60,
    });
    expect(s).toBeCloseTo(4 * 3 * Math.log(3), 6);
  });
});

describe('the batch cap', () => {
  const make = (kind: string, sev: number, id: string) => ({ kind, severity: sev, id });

  it('never returns more than the per-cycle limit, with fourteen queued', () => {
    const queued = Array.from({ length: 14 }, (_, i) => make('pattern', 100 - i, `p${i}`));
    expect(capBatch(queued, limits)).toHaveLength(perCycle);
  });

  it('never returns more than one reference finding, with five queued at top severity', () => {
    const queued = Array.from({ length: 5 }, (_, i) => make('reference', 100 - i, `r${i}`));
    const out = capBatch(queued, limits);
    expect(out.filter((f) => f.kind === 'reference')).toHaveLength(referencePerBatch);
  });

  it('surfaces a top severity reference finding even when three others are queued', () => {
    // The failure this guards is sorting references to the back, which quietly
    // turns "at most one" into "effectively none".
    const queued = [
      make('reference', 99, 'ref'),
      make('pattern', 90, 'a'),
      make('critique', 80, 'b'),
      make('scenario', 70, 'c'),
    ];
    const out = capBatch(queued, limits);
    expect(out.map((f) => f.id)).toContain('ref');
    expect(out).toHaveLength(perCycle);
  });

  it('ranks the survivors on severity alone once the extra references are dropped', () => {
    const queued = [
      make('reference', 50, 'ref-low'),
      make('reference', 45, 'ref-lower'),
      make('pattern', 90, 'a'),
      make('critique', 80, 'b'),
      make('scenario', 70, 'c'),
    ];
    const out = capBatch(queued, limits);
    expect(out.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});
