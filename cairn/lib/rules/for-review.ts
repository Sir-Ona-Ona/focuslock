import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';
import { milestones, members, tracks, pendingFor, collisions } from '@/lib/plan/read';
import { slippage, type SlippageRow } from './slippage';
import { rollovers, type RolloverRow } from './rollover';
import { proposedCycles, type ProposedRow } from './agreement';
import { openAssumptions, type AssumptionRow } from './assumptions';
import { loadAudit, type LoadAudit } from './load';
import { moneyAudit, type MoneyAudit } from './money';

/**
 * Everything the model is given, and the only numbers it will ever see.
 *
 * This is the single most important thing in the phase 4 architecture. The
 * prototype's weakness was asking a model to be a database: to read a long file
 * and remember to count how many times something had moved. Here every count is
 * a query, computed before the conversation starts, and the model is handed the
 * answers and asked to run the conversation about them.
 *
 * So nothing downstream may ask it to tally, total or check. If a number is
 * needed in a review and it is not in this bundle, the fix is a query here, not
 * a sentence in a prompt.
 */

export interface DueRow {
  ref: string;
  title: string;
  trackLabel: string;
  domainCode: string;
  targetDate: string;
  status: string | null;
  daysAway: number;
}

export interface ReviewFacts {
  mode: 'individual' | 'joint';
  actor: string;
  generatedOn: string;
  timeboxMinutes: number;
  domains: { code: string; short: string; name: string }[];
  thresholds: {
    slippageMoves: number;
    rolloverLimit: number;
    proposedCycles: number;
    assumptionCycles: number;
  };
  daysSinceLastReview: number | null;
  counts: {
    milestonesInScope: number;
    onTrack: number;
    atRisk: number;
    slipped: number;
    blocked: number;
    done: number;
    parked: number;
  };
  dueInside90Days: DueRow[];
  slippage: SlippageRow[];
  rollovers: RolloverRow[];
  proposedUnagreed: ProposedRow[];
  expiredAssumptions: AssumptionRow[];
  load: LoadAudit[];
  money: {
    reportingCurrency: string;
    shortfallMonths: { month: string; outflow: number; income: number; shortfall: number; committed: boolean }[];
    peak: { month: string; outflow: number; income: number; shortfall: number; committed: boolean } | null;
    assumedIncomeWithoutBuilder: { label: string; amountMonthly: number; currency: string }[];
  };
  openCollisions: { ref: string; tension: string; openDays: number; nextStep: string | null }[];
  pendingForActor: { text: string; raisedAt: string }[];
}

const DAY = 86_400_000;

/**
 * Computes the bundle for one review.
 *
 * An individual review sees that person's track. A joint review sees the joint
 * track. Neither sees a private item on anyone else's track, because the read
 * policy removes them before this code runs.
 */
export async function forReview(
  tx: Tx,
  opts: { mode: 'individual' | 'joint'; memberId: string; householdId: string },
): Promise<ReviewFacts> {
  const m = await method(tx);
  const [people, allTracks] = await Promise.all([members(tx), tracks(tx)]);

  const actor = people.find((p) => p.id === opts.memberId);
  const own = allTracks.find((t) => t.ownerMemberId === opts.memberId);
  const joint = allTracks.find((t) => t.kind === 'joint');

  const scope = opts.mode === 'joint'
    ? [joint?.id].filter((id): id is string => Boolean(id))
    : [own?.id].filter((id): id is string => Boolean(id));

  const trackLabel = (id: string) => {
    const t = allTracks.find((x) => x.id === id);
    if (!t) return 'Unknown';
    return t.kind === 'joint' ? 'Joint' : (t.ownerName ?? 'Individual');
  };

  const [items, moved, rolled, unagreed, assumptions, load, money, coll, pending] =
    await Promise.all([
      milestones(tx, scope),
      slippage(tx, { trackIds: scope }),
      rollovers(tx),
      opts.mode === 'joint'
        ? proposedCycles(tx, opts.householdId)
        : Promise.resolve([] as ProposedRow[]),
      openAssumptions(tx, { trackIds: scope }),
      loadAudit(tx, { trackIds: scope }),
      moneyAudit(tx, { trackIds: scope }),
      collisions(tx),
      own ? pendingFor(tx, own.id) : Promise.resolve([]),
    ]);

  const gap = (await tx.execute(sql`
    select extract(day from now() - max(started_at))::int as days
      from session_row
     where kind = 'review' and mode = ${opts.mode}`)) as unknown as
    Array<{ days: number | null }>;

  const now = Date.now();
  const live = items.filter((i) => i.status !== 'dropped');
  const count = (status: string) => live.filter((i) => i.status === status).length;

  const dueInside90Days: DueRow[] = live
    .filter((i) => {
      if (!i.status || i.status === 'done') return false;
      const days = (new Date(i.targetDate).getTime() - now) / DAY;
      return days >= 0 && days <= 90;
    })
    .map((i) => ({
      ref: i.ref,
      title: i.title,
      trackLabel: trackLabel(i.trackId),
      domainCode: i.domainCode,
      targetDate: i.targetDate,
      status: i.status,
      daysAway: Math.round((new Date(i.targetDate).getTime() - now) / DAY),
    }))
    .sort((a, b) => a.daysAway - b.daysAway);

  const shortfall = (r: { month: string; outflow: number; income: number; shortfall: number; committedShortfall: boolean }) => ({
    month: r.month,
    outflow: Math.round(r.outflow),
    income: Math.round(r.income),
    shortfall: Math.round(r.shortfall),
    committed: r.committedShortfall,
  });

  return {
    mode: opts.mode,
    actor: actor?.displayName ?? 'the member',
    generatedOn: new Date().toISOString().slice(0, 10),
    timeboxMinutes: m.num(
      opts.mode === 'joint' ? 'timebox.review_joint' : 'timebox.review_individual',
    ),
    domains: m.domains(),
    thresholds: {
      slippageMoves: m.num('rules.slippage_moves'),
      rolloverLimit: m.num('rules.rollover_limit'),
      proposedCycles: m.num('rules.proposed_cycles'),
      assumptionCycles: m.num('rules.assumption_cycles'),
    },
    daysSinceLastReview: gap[0]?.days ?? null,
    counts: {
      milestonesInScope: live.length,
      onTrack: count('on_track'),
      atRisk: count('at_risk'),
      slipped: count('slipped'),
      blocked: count('blocked'),
      done: count('done'),
      parked: count('parked'),
    },
    dueInside90Days,
    slippage: moved,
    rollovers: rolled,
    proposedUnagreed: unagreed,
    expiredAssumptions: assumptions,
    load,
    money: {
      reportingCurrency: money.reportingCurrency,
      shortfallMonths: money.shortfallMonths.map(shortfall),
      peak: money.peak ? shortfall(money.peak) : null,
      assumedIncomeWithoutBuilder: money.assumedIncomeWithoutBuilder.map((i) => ({
        label: i.label,
        amountMonthly: Math.round(i.amountMonthly),
        currency: i.currency,
      })),
    },
    openCollisions: coll
      .filter((c) => c.status === 'open')
      .map((c) => ({
        ref: c.ref, tension: c.tension, openDays: c.openDays, nextStep: c.nextStep,
      })),
    pendingForActor: pending.map((p) => ({ text: p.text, raisedAt: p.raisedAt })),
  };
}
