/**
 * Finding severity, computed by the engine and never by the model.
 *
 *   severity = blast_radius * window_pressure * persistence
 *
 * blast_radius    milestones touched, doubled when the finding spans more than one track
 * window_pressure 3 if it concerns a gate inside 90 days, 2 inside 12 months, 1 otherwise
 * persistence     ln(1 + days_true / 30)
 *
 * Kept as a pure function so it is testable at the boundary of each bar without
 * a database, and so there is exactly one definition of the ranking.
 */

export interface SeverityInput {
  milestonesTouched: number;
  spansMultipleTracks: boolean;
  daysToNearestOpenGate: number | null;
  daysTrue: number;
}

export function blastRadius(input: Pick<SeverityInput, 'milestonesTouched' | 'spansMultipleTracks'>): number {
  return Math.max(1, input.milestonesTouched) * (input.spansMultipleTracks ? 2 : 1);
}

// The severity formula is arithmetic rather than a method setting: the bands
// below define what severity means, so changing one would not tune the method,
// it would change what the word measures.
// method-literal-ok: part of the severity formula, not a tunable threshold
export function windowPressure(daysToNearestOpenGate: number | null): 1 | 2 | 3 {
  if (daysToNearestOpenGate === null) return 1;
  // method-literal-ok: part of the severity formula
  if (daysToNearestOpenGate <= 90) return 3;
  if (daysToNearestOpenGate <= 365) return 2;
  return 1;
}

export function persistence(daysTrue: number): number {
  // method-literal-ok: part of the severity formula, the month it is scaled by
  return Math.log(1 + Math.max(0, daysTrue) / 30);
}

export function severity(input: SeverityInput): number {
  return (
    blastRadius(input)
    * windowPressure(input.daysToNearestOpenGate)
    * persistence(input.daysTrue)
  );
}

/**
 * The cap, applied after the database has already excluded suppressed classes.
 *
 * Written as: drop all but the strongest reference finding, then rank the
 * survivors on severity alone. Sorting references to the back instead would mean
 * a reference finding never surfaces at all whenever enough others are queued,
 * and "at most one" quietly becomes "effectively none".
 */
export function capBatch<T extends { kind: string; severity: number }>(
  findings: T[],
  limits: { perCycle: number; referencePerBatch: number },
): T[] {
  const bySeverity = [...findings].sort((a, b) => b.severity - a.severity);
  let referencesKept = 0;
  const survivors = bySeverity.filter((f) => {
    if (f.kind !== 'reference') return true;
    if (referencesKept >= limits.referencePerBatch) return false;
    referencesKept += 1;
    return true;
  });
  return survivors.slice(0, limits.perCycle);
}
