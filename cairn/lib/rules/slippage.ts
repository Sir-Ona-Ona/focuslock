import { sql } from 'drizzle-orm';
import { uuidList, type Tx } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';

export interface SlippageRow {
  id: string;
  ref: string;
  title: string;
  trackId: string;
  domainCode: string;
  targetDate: string;
  originalTargetDate: string;
  moveCount: number;
  moveHistory: string[];
  /** True once the count reaches the method's threshold. */
  needsGoalReexamined: boolean;
}

/**
 * Milestones that have moved, with the count and the history as rows.
 *
 * Two or more surfaces at review. At the method's threshold the copy stops
 * offering a new date as the first option: a milestone that has moved that many
 * times has a goal problem, not a date problem.
 */
export async function slippage(tx: Tx, opts: { trackIds?: string[] } = {}): Promise<SlippageRow[]> {
  const m = await method(tx);
  const threshold = m.num('rules.slippage_moves');
  const surfaceAt = threshold - 1;

  const rows = (await tx.execute(sql`
    select m.id, m.ref, m.title, m.track_id, m.domain_code,
           m.target_date, m.original_target_date,
           count(mv.id)::int as move_count,
           jsonb_agg(mv.to_date order by mv.moved_at) as move_history
      from milestone m
      join milestone_move mv on mv.milestone_id = m.id
     where (m.status is null or m.status <> 'dropped')
       ${opts.trackIds?.length
         ? sql`and m.track_id = any(${uuidList(opts.trackIds)})`
         : sql``}
     group by m.id
    having count(mv.id) >= ${surfaceAt}
     order by count(mv.id) desc, m.target_date`)) as unknown as Array<{
      id: string; ref: string; title: string; track_id: string; domain_code: string;
      target_date: string; original_target_date: string;
      move_count: number; move_history: string[];
    }>;

  return rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    title: r.title,
    trackId: r.track_id,
    domainCode: r.domain_code,
    targetDate: r.target_date,
    originalTargetDate: r.original_target_date,
    moveCount: r.move_count,
    moveHistory: r.move_history ?? [],
    needsGoalReexamined: r.move_count >= threshold,
  }));
}
