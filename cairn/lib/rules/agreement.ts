import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';

export interface ProposedRow {
  id: string;
  ref: string;
  title: string;
  domainCode: string;
  proposedByMemberId: string | null;
  lastAuthoredByMemberId: string | null;
  cyclesProposed: number;
  /** At the limit there are exactly two actions, and no third cycle. */
  forced: boolean;
}

/**
 * Joint items still proposed, and how many joint review cycles they have
 * survived unagreed.
 *
 * At the method's limit the item is forced: agree it, or move it to the
 * individual track of whoever wants it. A permanently proposed item is a
 * disagreement nobody has had.
 */
export async function proposedCycles(tx: Tx, householdId: string): Promise<ProposedRow[]> {
  const m = await method(tx);
  const limit = m.num('rules.proposed_cycles');

  const rows = (await tx.execute(sql`
    select m.id, m.ref, m.title, m.domain_code,
           m.proposed_by_member_id, m.last_authored_by_member_id,
           count(s.id) filter (
             where s.kind = 'review' and s.mode = 'joint' and s.started_at > m.updated_at
           )::int as cycles_proposed
      from milestone m
      join track t on t.id = m.track_id and t.kind = 'joint'
      left join session_row s on s.household_id = t.household_id
     where m.agreement = 'proposed'
       and t.household_id = ${householdId}
     group by m.id
     order by cycles_proposed desc, m.target_date`)) as unknown as Array<{
      id: string; ref: string; title: string; domain_code: string;
      proposed_by_member_id: string | null; last_authored_by_member_id: string | null;
      cycles_proposed: number;
    }>;

  return rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    title: r.title,
    domainCode: r.domain_code,
    proposedByMemberId: r.proposed_by_member_id,
    lastAuthoredByMemberId: r.last_authored_by_member_id,
    cyclesProposed: r.cycles_proposed,
    forced: r.cycles_proposed >= limit,
  }));
}

/**
 * Whether this member may agree a given joint item.
 *
 * The database refuses a self agreement outright. This exists so the UI can
 * render the right three actions rather than offering one that will fail.
 */
export function canAgree(item: { proposedByMemberId: string | null }, memberId: string): boolean {
  return item.proposedByMemberId !== null && item.proposedByMemberId !== memberId;
}
