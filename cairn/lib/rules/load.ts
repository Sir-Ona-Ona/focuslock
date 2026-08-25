import { sql } from 'drizzle-orm';
import { uuidList, type Tx } from '@/lib/db/client';

export interface LoadAudit {
  trackId: string;
  demand: number;
  demandBad: number;
  ceiling: number;
  gap: number;
  overCeiling: boolean;
}

export interface DomainLoadRow {
  trackId: string;
  domainCode: string;
  hoursPerWeek: number;
  hoursPerWeekBad: number | null;
}

/**
 * Hour demand against a stated ceiling, per track.
 *
 * A positive gap is surfaced at the health block and on home. The remedies the
 * UI offers are exactly four: cut a goal, move a date, reduce a scope, or raise
 * the ceiling with a named change. Trying harder is not one of them.
 */
export async function loadAudit(tx: Tx, opts: { trackIds?: string[] } = {}): Promise<LoadAudit[]> {
  const rows = (await tx.execute(sql`
    select track_id, demand, demand_bad, ceiling, gap
      from v_load_audit
     ${opts.trackIds?.length
       ? sql`where track_id = any(${uuidList(opts.trackIds)})`
       : sql``}`)) as unknown as Array<{
      track_id: string; demand: string; demand_bad: string; ceiling: string; gap: string;
    }>;

  return rows.map((r) => ({
    trackId: r.track_id,
    demand: Number(r.demand),
    demandBad: Number(r.demand_bad),
    ceiling: Number(r.ceiling),
    gap: Number(r.gap),
    overCeiling: Number(r.gap) > 0,
  }));
}

export async function domainLoads(tx: Tx, trackId: string): Promise<DomainLoadRow[]> {
  const rows = (await tx.execute(sql`
    select dl.track_id, dl.domain_code, dl.hours_per_week, dl.hours_per_week_bad
      from domain_load dl
      join domain d on d.code = dl.domain_code
     where dl.track_id = ${trackId}
     order by d.sort_order`)) as unknown as Array<{
      track_id: string; domain_code: string;
      hours_per_week: string; hours_per_week_bad: string | null;
    }>;

  return rows.map((r) => ({
    trackId: r.track_id,
    domainCode: r.domain_code,
    hoursPerWeek: Number(r.hours_per_week),
    hoursPerWeekBad: r.hours_per_week_bad === null ? null : Number(r.hours_per_week_bad),
  }));
}
