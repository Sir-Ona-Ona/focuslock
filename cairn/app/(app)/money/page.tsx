import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { moneyAudit } from '@/lib/rules/money';
import { tracks } from '@/lib/plan/read';
import { Card, Tile } from '@/components/ui/Tile';
import { formatMoney, formatMonth } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

export default async function MoneyPage() {
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const [audit, allTracks] = await Promise.all([moneyAudit(tx), tracks(tx)]);
    return { audit, allTracks };
  });

  const { audit } = data;
  const trackLabel = (id: string) => {
    const t = data.allTracks.find((x) => x.id === id);
    return t?.kind === 'joint' ? 'Joint' : (t?.ownerName ?? 'Track');
  };

  // One row per month across every track, so the grid reads as a schedule.
  const byMonth = new Map<string,
    { outflow: number; income: number; committed: number; assumed: number }>();
  for (const r of audit.months) {
    const cur = byMonth.get(r.month) ?? { outflow: 0, income: 0, committed: 0, assumed: 0 };
    cur.outflow += r.outflow;
    cur.income += r.income;
    cur.committed += r.committedOutflow;
    cur.assumed += r.assumedIncome;
    byMonth.set(r.month, cur);
  }
  const anyAssumed = [...byMonth.values()].some((v) => v.assumed > 0);
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  const worst = Math.max(1, ...months.map(([, v]) => Math.max(v.outflow, v.income)));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">Money</h1>
        <p className="mt-1 max-w-[64ch] text-[.86rem] text-ink-muted">
          What lands, what comes in, and the shortfall, by month over the horizon the method sets.
          Reported in {audit.reportingCurrency}, converted at the rates this household stated.
          Income the plan assumes but nobody has yet is shown separately and never counted as
          cover.
        </p>
      </header>

      {audit.months.length === 0 ? (
        <p className="text-[.9rem] text-ink-muted">
          Nothing costed yet. Every domain records what it commits in money as it is built, because
          obligations recorded afterwards are guesses, and an affordability analysis built on
          guessed dates is worse than none.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile
              label="Shortfall months"
              value={String(audit.shortfallMonths.length)}
              note={
                audit.shortfallMonths.some((s) => s.committedShortfall)
                  ? 'at least one is committed, which is a cash problem'
                  : 'all intended rather than committed'
              }
              alert={audit.shortfallMonths.length > 0}
            />
            <Tile
              label="Tightest month"
              value={audit.peak ? formatMonth(audit.peak.month) : 'none'}
              note={
                audit.peak
                  ? `${formatMoney(audit.peak.shortfall, audit.reportingCurrency)} short`
                  : 'commitments stay inside income'
              }
              alert={Boolean(audit.peak)}
            />
            <Tile
              label="Assumed income with nothing building it"
              value={String(audit.assumedIncomeWithoutBuilder.length)}
              note="income the plan needs and nobody has yet"
              alert={audit.assumedIncomeWithoutBuilder.length > 0}
            />
          </div>

          {audit.shortfallMonths.length > 0 ? (
            <Card
              title="The months that do not cover"
              sub="Named months and three numbers each. Committed shortfalls rank above intended ones of equal size."
            >
              <ul className="space-y-2.5">
                {audit.shortfallMonths.map((s) => (
                  <li key={`${s.trackId}-${s.month}`} className="text-[.88rem]">
                    <strong>{formatMonth(s.month)}</strong>
                    <span className="ml-1.5 text-[.76rem] text-ink-faint">
                      {trackLabel(s.trackId)}
                    </span>
                    <div className="mt-0.5 tnum">
                      {formatMoney(s.outflow, audit.reportingCurrency)} lands,{' '}
                      {formatMoney(s.income, audit.reportingCurrency)} comes in,{' '}
                      <span style={{ color: 'var(--st-crit)' }}>
                        {formatMoney(s.shortfall, audit.reportingCurrency)} short
                      </span>
                    </div>
                    <div className="text-[.76rem] text-ink-muted">
                      {s.committedShortfall
                        ? 'Committed, so this is a cash problem rather than a planning one.'
                        : 'Intended rather than committed, which is the cheaper kind of problem.'}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title="The schedule" sub="Outflow against income, month by month.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[.82rem]">
                <thead>
                  <tr>
                    {['Month', 'Outflow', 'Committed', 'Income',
                      ...(anyAssumed ? ['Assumed'] : []), 'Balance'].map((h) => (
                      <th
                        key={h}
                        className="border-b border-rule-strong px-2 py-1.5 text-left font-mono
                                   text-[.64rem] uppercase tracking-[.1em] font-medium text-ink-faint"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {months.map(([m, v]) => {
                    const balance = v.income - v.outflow;
                    return (
                      <tr key={m}>
                        <td className="border-b border-rule px-2 py-1.5">{formatMonth(m)}</td>
                        <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum">
                          <span className="mr-2 inline-block h-1.5 rounded-full align-middle"
                                style={{
                                  width: `${Math.max(2, (v.outflow / worst) * 60)}px`,
                                  background: 'var(--st-warn)',
                                }} />
                          {formatMoney(v.outflow, audit.reportingCurrency)}
                        </td>
                        <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum">
                          {formatMoney(v.committed, audit.reportingCurrency)}
                        </td>
                        <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum">
                          {formatMoney(v.income, audit.reportingCurrency)}
                        </td>
                        {/* Assumed income sits in its own column and never in the
                            balance: a plan is not covered by money nobody has yet. */}
                        {anyAssumed ? (
                          <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum text-ink-faint">
                            {formatMoney(v.assumed, audit.reportingCurrency)}
                          </td>
                        ) : null}
                        <td
                          className="border-b border-rule px-2 py-1.5 text-right font-mono tnum"
                          style={balance < 0 ? { color: 'var(--st-crit)' } : undefined}
                        >
                          {formatMoney(balance, audit.reportingCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {audit.assumedIncomeWithoutBuilder.length > 0 ? (
            <Card
              title="Income the plan needs and nobody is building"
              sub="The quietest failure in household planning is a plan affordable only on income nobody has committed to producing."
            >
              <ul className="space-y-1.5">
                {audit.assumedIncomeWithoutBuilder.map((i) => (
                  <li key={i.id} className="text-[.86rem]">
                    {i.label}, {formatMoney(i.amountMonthly, i.currency)} a month, with no milestone
                    building it.
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
