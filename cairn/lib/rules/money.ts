import { sql } from 'drizzle-orm';
import { uuidList, type Tx } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';

export interface MonthRow {
  trackId: string;
  month: string;
  recurring: number;
  oneOff: number;
  committedOutflow: number;
  outflow: number;
  income: number;
  /** Income the plan needs and nobody has yet. Never counted as cover. */
  assumedIncome: number;
  shortfall: number;
  /** A committed shortfall is a cash problem. An intended one is a planning problem. */
  committedShortfall: boolean;
}

export interface MoneyAudit {
  months: MonthRow[];
  shortfallMonths: MonthRow[];
  peak: MonthRow | null;
  committedRatio: { trackId: string; committedMonthly: number; incomeMonthly: number; ratio: number }[];
  assumedIncomeWithoutBuilder: {
    id: string; trackId: string; label: string; amountMonthly: number; currency: string;
  }[];
  foreignShare: { trackId: string; share: number }[];
  reportingCurrency: string;
}

/**
 * The money audit: what lands, what comes in, and the shortfall, by named month.
 *
 * Never as a ratio alone and never as "things look tight". The whole value of
 * this detector is that it produces a sentence someone can act on: this month,
 * this much lands, this much comes in, this much short.
 */
export async function moneyAudit(
  tx: Tx,
  opts: { trackIds?: string[] } = {},
): Promise<MoneyAudit> {
  const m = await method(tx);
  const horizon = m.num('money.horizon_months');
  const filter = opts.trackIds?.length
    ? sql`where o.track_id = any(${uuidList(opts.trackIds)})`
    : sql``;

  const months = (await tx.execute(sql`
    select o.track_id, o.m::text as month, o.recurring, o.one_off,
           o.committed_outflow,
           app.income_month(o.track_id, o.m) as income,
           app.income_month_assumed(o.track_id, o.m) as assumed_income
      from v_outflow_month o
      ${filter}
     order by o.track_id, o.m
     limit ${horizon * 8}`)) as unknown as Array<{
      track_id: string; month: string; recurring: string; one_off: string;
      committed_outflow: string; income: string; assumed_income: string;
    }>;

  const rows: MonthRow[] = months.map((r) => {
    const recurring = Number(r.recurring);
    const oneOff = Number(r.one_off);
    const committedOutflow = Number(r.committed_outflow);
    const income = Number(r.income);
    const assumedIncome = Number(r.assumed_income);
    const outflow = recurring + oneOff;
    return {
      trackId: r.track_id,
      month: r.month,
      recurring,
      oneOff,
      committedOutflow,
      outflow,
      income,
      assumedIncome,
      shortfall: outflow - income,
      committedShortfall: committedOutflow > income,
    };
  });

  const shortfallMonths = rows
    .filter((r) => r.shortfall > 0)
    // A committed shortfall ranks above an intended one of equal size.
    .sort((a, b) => {
      if (a.committedShortfall !== b.committedShortfall) return a.committedShortfall ? -1 : 1;
      return b.shortfall - a.shortfall;
    });

  const ratios = (await tx.execute(sql`
    select o.track_id,
           sum(o.committed_outflow) filter (where o.m = date_trunc('month', current_date))
             as committed_monthly,
           app.income_month(o.track_id, current_date) as income_monthly
      from v_outflow_month o
      ${filter}
     group by o.track_id`)) as unknown as Array<{
      track_id: string; committed_monthly: string | null; income_monthly: string;
    }>;

  const assumed = (await tx.execute(sql`
    select i.id, i.track_id, i.label, i.amount_monthly, i.currency
      from income i
     where i.is_assumed and i.built_by_milestone_id is null
       ${opts.trackIds?.length
         ? sql`and i.track_id = any(${uuidList(opts.trackIds)})`
         : sql``}`)) as unknown as Array<{
      id: string; track_id: string; label: string; amount_monthly: string; currency: string;
    }>;

  const fx = (await tx.execute(sql`
    select o.track_id,
           coalesce(
             sum(app.fx(o.amount, o.currency))
               filter (where o.currency <> app.reporting_currency())
             / nullif(sum(app.fx(o.amount, o.currency)), 0), 0) as foreign_share
      from obligation o
      ${filter}
     group by o.track_id`)) as unknown as Array<{ track_id: string; foreign_share: string }>;

  const [{ cur }] = (await tx.execute(sql`
    select app.reporting_currency() as cur`)) as unknown as { cur: string }[];

  return {
    months: rows,
    shortfallMonths,
    peak: shortfallMonths[0] ?? null,
    committedRatio: ratios.map((r) => {
      const committedMonthly = Number(r.committed_monthly ?? 0);
      const incomeMonthly = Number(r.income_monthly);
      return {
        trackId: r.track_id,
        committedMonthly,
        incomeMonthly,
        ratio: incomeMonthly > 0 ? committedMonthly / incomeMonthly : 0,
      };
    }),
    assumedIncomeWithoutBuilder: assumed.map((r) => ({
      id: r.id,
      trackId: r.track_id,
      label: r.label,
      amountMonthly: Number(r.amount_monthly),
      currency: r.currency,
    })),
    foreignShare: fx.map((r) => ({ trackId: r.track_id, share: Number(r.foreign_share) })),
    reportingCurrency: cur,
  };
}
