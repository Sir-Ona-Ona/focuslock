import { sql } from 'drizzle-orm';
import { uuidList, type Tx } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';

export interface AssumptionRow {
  id: string;
  ref: string;
  statement: string;
  domainCode: string;
  confidence: 'high' | 'medium' | 'low';
  testBy: string;
  carries: number;
  carriedReviewCount: number;
  expired: boolean;
  /** At the method's limit this is a hope, and the plan should say so. */
  isHope: boolean;
}

/**
 * Assumptions past their test date, or held at low confidence, ordered by how
 * many milestones rest on them.
 */
export async function openAssumptions(
  tx: Tx,
  opts: { trackIds?: string[] } = {},
): Promise<AssumptionRow[]> {
  const m = await method(tx);
  const limit = m.num('rules.assumption_cycles');

  const rows = (await tx.execute(sql`
    select a.id, a.ref, a.statement, a.domain_code, a.confidence, a.test_by,
           a.carried_review_count,
           count(am.milestone_id)::int as carries,
           (a.test_by < current_date) as expired
      from assumption a
      left join assumption_milestone am on am.assumption_id = a.id
     where a.state = 'open'
       and (a.test_by < current_date or a.confidence = 'low')
       ${opts.trackIds?.length
         ? sql`and a.track_id = any(${uuidList(opts.trackIds)})`
         : sql``}
     group by a.id
     order by carries desc, a.test_by`)) as unknown as Array<{
      id: string; ref: string; statement: string; domain_code: string;
      confidence: 'high' | 'medium' | 'low'; test_by: string;
      carried_review_count: number; carries: number; expired: boolean;
    }>;

  return rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    statement: r.statement,
    domainCode: r.domain_code,
    confidence: r.confidence,
    testBy: r.test_by,
    carries: r.carries,
    carriedReviewCount: r.carried_review_count,
    expired: r.expired,
    isHope: r.carried_review_count >= limit,
  }));
}

/**
 * Called once per review that surfaces an expired assumption without resolving
 * it. The counter is what makes "carried through three reviews" a fact rather
 * than an impression.
 */
export async function carryAssumptions(tx: Tx, assumptionIds: string[]): Promise<void> {
  if (assumptionIds.length === 0) return;
  await tx.execute(sql`
    update assumption
       set carried_review_count = carried_review_count + 1
     where id = any(${uuidList(assumptionIds)}) and state = 'open'`);
}
