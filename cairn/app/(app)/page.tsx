import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';
import { collisions, members, milestones, tracks } from '@/lib/plan/read';
import { loadAudit } from '@/lib/rules/load';
import { moneyAudit } from '@/lib/rules/money';
import { slippage } from '@/lib/rules/slippage';
import { proposedCycles } from '@/lib/rules/agreement';
import { openAssumptions } from '@/lib/rules/assumptions';
import { Card, Tile } from '@/components/ui/Tile';
import { StatusPill } from '@/components/ui/Pills';
import { formatMoney, formatMonth } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

export default async function Home() {
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const m = await method(tx);
    const [people, allTracks] = await Promise.all([members(tx), tracks(tx)]);
    const mine = allTracks.find((t) => t.ownerMemberId === viewer.memberId);
    const joint = allTracks.find((t) => t.kind === 'joint');
    const visible = allTracks.map((t) => t.id);

    const [items, moved, unagreed, assumptions, load, money, coll] = await Promise.all([
      milestones(tx, visible),
      slippage(tx),
      proposedCycles(tx, viewer.householdId),
      openAssumptions(tx, mine ? { trackIds: [mine.id] } : {}),
      loadAudit(tx, mine ? { trackIds: [mine.id] } : {}),
      moneyAudit(tx),
      collisions(tx),
    ]);

    const lastReview = (await tx.execute(sql`
      select mode, max(started_at) as last
        from session_row where kind = 'review' group by mode`)) as unknown as
      Array<{ mode: 'individual' | 'joint'; last: string }>;

    return {
      m: {
        cadenceIndividual: m.num('cadence.individual_days'),
        cadenceJoint: m.num('cadence.joint_days'),
        slippageMoves: m.num('rules.slippage_moves'),
        domains: m.domains(),
      },
      people, allTracks, mine, joint, items, moved, unagreed, assumptions, load, money,
      coll, lastReview,
    };
  });

  const now = Date.now();
  const soon = data.items.filter((i) => {
    if (!i.status || i.status === 'done' || i.status === 'dropped') return false;
    const days = (new Date(i.targetDate).getTime() - now) / DAY;
    return days >= 0 && days <= 90;
  });
  const atRisk = data.items.filter(
    (i) => i.status === 'at_risk' || i.status === 'slipped' || i.status === 'blocked',
  );
  const openCollisions = data.coll.filter((c) => c.status === 'open');
  const oldest = openCollisions.reduce<typeof openCollisions[number] | null>(
    (best, c) => (best === null || c.openDays > best.openDays ? c : best), null,
  );
  const myLoad = data.load[0];
  const unclaimed = data.allTracks.filter(
    (t) => t.kind === 'individual' && t.claimStatus === 'unclaimed',
  );

  function nextReview(mode: 'individual' | 'joint'): string {
    const cadence = mode === 'individual' ? data.m.cadenceIndividual : data.m.cadenceJoint;
    const last = data.lastReview.find((r) => r.mode === mode)?.last;
    if (!last) return 'not run yet';
    const due = new Date(last).getTime() + cadence * DAY;
    const days = Math.round((due - now) / DAY);
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'due today';
    return `in ${days} days`;
  }

  const individualOverdue = nextReview('individual').includes('overdue');
  const jointOverdue = nextReview('joint').includes('overdue');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-serif text-[1.7rem]">Home</h1>
        <p className="mt-1 max-w-[62ch] text-[.86rem] text-ink-muted">
          What is due, what has moved, and what is waiting on someone. Every number here is a
          query, so nothing depends on anyone remembering to check it.
        </p>
      </header>

      {unclaimed.length > 0 ? (
        <div className="card border-dashed p-4">
          <div className="kicker">Unclaimed</div>
          <p className="mt-2 max-w-[62ch] text-[.86rem]">
            {unclaimed.map((t) => t.ownerName).filter(Boolean).join(' and ')}
            {unclaimed.length === 1 ? ' has ' : ' have '}
            a track with nothing in it yet. The system creates a track freely; only its owner puts
            goals in it, because a track written on someone else's behalf looks like agreement
            without being agreement.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Your review"
          value={nextReview('individual')}
          note={`every ${data.m.cadenceIndividual} days`}
          alert={individualOverdue}
        />
        <Tile
          label="Joint review"
          value={nextReview('joint')}
          note={`every ${data.m.cadenceJoint} days`}
          alert={jointOverdue}
        />
        <Tile
          label="Due inside 90 days"
          value={String(soon.length)}
          note={`${atRisk.length} at risk, blocked or slipped`}
          alert={atRisk.length > 0}
        />
        <Tile
          label="Open collisions"
          value={String(openCollisions.length)}
          note={oldest ? `oldest open ${oldest.openDays} days` : 'nothing contested'}
          alert={Boolean(oldest && oldest.openDays > 90)}
        />
      </div>

      {myLoad ? (
        <Card
          title="Hours against your ceiling"
          sub={
            myLoad.overCeiling
              ? `${myLoad.demand} hours a week committed against a ceiling of ${myLoad.ceiling}.`
              : `${myLoad.demand} hours a week committed, ceiling ${myLoad.ceiling}.`
          }
        >
          {myLoad.overCeiling ? (
            <div>
              <p className="text-[.86rem]">
                The gap is {myLoad.gap.toFixed(1)} hours a week. There are four ways to close it:
                cut a goal, move a date, reduce a scope, or raise the ceiling with a named change.
              </p>
              <p className="mt-2 text-[.78rem] text-ink-faint">
                A bad week runs to {myLoad.demandBad} hours, which is the number the plan actually
                has to survive.
              </p>
            </div>
          ) : (
            <p className="text-[.86rem] text-ink-muted">
              Inside the ceiling, with {Math.abs(myLoad.gap).toFixed(1)} hours a week spare.
            </p>
          )}
        </Card>
      ) : null}

      {data.money.peak ? (
        <Card
          title="The month the money is tightest"
          sub="Named month, three numbers, no ratios."
        >
          <p className="text-[.9rem]">
            <strong>{formatMonth(data.money.peak.month)}</strong>:{' '}
            {formatMoney(data.money.peak.outflow, data.money.reportingCurrency)} lands,{' '}
            {formatMoney(data.money.peak.income, data.money.reportingCurrency)} comes in,{' '}
            <strong style={{ color: 'var(--st-crit)' }}>
              {formatMoney(data.money.peak.shortfall, data.money.reportingCurrency)} short
            </strong>
            {data.money.peak.committedShortfall
              ? '. This one is committed, so it is a cash problem rather than a planning problem.'
              : '. These are intended rather than committed, which is the cheaper kind of problem.'}
          </p>
          <Link href="/money" className="mt-3 inline-block text-[.8rem] underline decoration-rule-strong">
            The full schedule
          </Link>
        </Card>
      ) : null}

      {data.moved.length > 0 ? (
        <Card
          title="Milestones that have moved"
          sub={`At ${data.m.slippageMoves} moves the goal needs re-examining, not the date.`}
        >
          <ul className="space-y-3">
            {data.moved.map((s) => (
              <li key={s.id} className="border-b border-rule pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="ref">{s.ref}</span>
                  <span className="text-[.9rem]">{s.title}</span>
                </div>
                <div className="mt-1 font-mono text-[.72rem] text-ink-muted">
                  moved {s.moveCount}x: {formatMonth(s.originalTargetDate)}
                  {s.moveHistory.map((d) => ` to ${formatMonth(d)}`).join('')}
                </div>
                {s.needsGoalReexamined ? (
                  <p className="mt-1 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>
                    Moved {s.moveCount} times. This is a goal question now, not a date question.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.unagreed.length > 0 ? (
        <Card
          title="Joint items nobody has agreed"
          sub="Proposed means one principal entered it. It is not part of the plan yet."
        >
          <ul className="space-y-2">
            {data.unagreed.map((u) => (
              <li key={u.id} className="flex flex-wrap items-baseline gap-x-2 text-[.88rem]">
                <span className="ref">{u.ref}</span>
                <span>{u.title}</span>
                {u.forced ? (
                  <span className="text-[.78rem]" style={{ color: 'var(--st-crit)' }}>
                    two cycles unagreed: agree it, or move it to one track
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <Link href="/joint" className="mt-3 inline-block text-[.8rem] underline decoration-rule-strong">
            The joint plan
          </Link>
        </Card>
      ) : null}

      {atRisk.length > 0 ? (
        <Card title="Needs attention" sub="At risk, blocked or slipped, across every track you can see.">
          <ul className="space-y-2">
            {atRisk.slice(0, 12).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 text-[.88rem]">
                <StatusPill status={i.status} />
                <span className="ref">{i.ref}</span>
                <span className="min-w-0">{i.title}</span>
                <span className="ml-auto font-mono text-[.72rem] text-ink-faint">
                  {formatMonth(i.targetDate)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.assumptions.length > 0 ? (
        <Card
          title="Assumptions past their test date"
          sub="The plan rests on these and none of them has been checked."
        >
          <ul className="space-y-2">
            {data.assumptions.map((a) => (
              <li key={a.id} className="text-[.88rem]">
                <span className="ref">{a.ref}</span> {a.statement}
                <div className="mt-0.5 text-[.76rem] text-ink-muted">
                  {a.carries} {a.carries === 1 ? 'milestone rests' : 'milestones rest'} on it,
                  test by {formatMonth(a.testBy)}
                  {a.isHope
                    ? '. Carried through three reviews without a test: this is a hope, not an assumption.'
                    : ''}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
