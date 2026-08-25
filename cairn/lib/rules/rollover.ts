import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';

export interface RolloverRow {
  id: string;
  text: string;
  ownerMemberId: string;
  dueDate: string;
  rolloverCount: number;
  /** At the limit the commitment cannot be carried again unchanged. */
  atLimit: boolean;
}

/**
 * Rollover depth is the length of the rolled_from chain, walked with a
 * recursive CTE. Never a counter column, which drifts the first time someone
 * edits a row by hand.
 */
export async function rollovers(tx: Tx): Promise<RolloverRow[]> {
  const m = await method(tx);
  const limit = m.num('rules.rollover_limit');

  const rows = (await tx.execute(sql`
    with recursive chain as (
      select c.id as head, c.rolled_from_commitment_id as prev, 1 as depth
        from commitment c
       where c.status = 'open'
      union all
      select ch.head, p.rolled_from_commitment_id, ch.depth + 1
        from chain ch
        join commitment p on p.id = ch.prev
    )
    select c.id, c.text, c.owner_member_id, c.due_date,
           max(ch.depth)::int as rollover_count
      from chain ch
      join commitment c on c.id = ch.head
     group by c.id, c.text, c.owner_member_id, c.due_date
    having max(ch.depth) >= ${limit}
     order by max(ch.depth) desc`)) as unknown as Array<{
      id: string; text: string; owner_member_id: string;
      due_date: string; rollover_count: number;
    }>;

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    ownerMemberId: r.owner_member_id,
    dueDate: r.due_date,
    rolloverCount: r.rollover_count,
    atLimit: r.rollover_count >= limit,
  }));
}
