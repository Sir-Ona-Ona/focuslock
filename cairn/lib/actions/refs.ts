import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';

/**
 * Refs are generated server side, unique per household, immutable, and never
 * reused after a drop. The letter is the track: an owner's initial slot for an
 * individual track, J for the joint plan.
 */
export async function nextMilestoneRef(
  tx: Tx,
  trackId: string,
  domainCode: string,
): Promise<string> {
  const [t] = (await tx.execute(sql`
    select t.kind, coalesce(m.principal_slot, m.seat_no) as slot
      from track t left join member m on m.id = t.owner_member_id
     where t.id = ${trackId}`)) as unknown as
    Array<{ kind: 'individual' | 'joint'; slot: number | null }>;

  const letter = t?.kind === 'joint' ? 'J' : String(t?.slot ?? 1);
  const prefix = `M-${letter}-${domainCode}-`;

  const [row] = (await tx.execute(sql`
    select coalesce(max(nullif(regexp_replace(ref, '^.*-', ''), '')::int), 0) + 1 as n
      from milestone
     where track_id = ${trackId} and ref like ${prefix + '%'}`)) as unknown as
    Array<{ n: number }>;

  return `${prefix}${String(row?.n ?? 1).padStart(2, '0')}`;
}

export async function nextRef(
  tx: Tx,
  table: 'assumption' | 'risk' | 'constraint_row',
  trackId: string,
  prefix: string,
): Promise<string> {
  const target = sql.raw(table);
  const [row] = (await tx.execute(sql`
    select coalesce(max(nullif(regexp_replace(ref, '^.*-', ''), '')::int), 0) + 1 as n
      from ${target}
     where track_id = ${trackId} and ref like ${prefix + '-%'}`)) as unknown as
    Array<{ n: number }>;
  return `${prefix}-${String(row?.n ?? 1).padStart(2, '0')}`;
}
