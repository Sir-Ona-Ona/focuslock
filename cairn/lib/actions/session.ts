'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { withMember } from '@/lib/db/client';
import { requireViewer } from '@/lib/auth/session';
import { method } from '@/lib/method/accessor';
import { modelAvailable } from '@/lib/claude/client';

export type Result = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Opens a review.
 *
 * The timebox comes from the method rather than from a literal, and the method
 * version is stamped on the row, so rendering this session in a year applies
 * the timeboxes it actually ran under rather than whatever the method says then.
 */
export async function startReview(mode: 'individual' | 'joint'): Promise<Result> {
  const parsed = z.enum(['individual', 'joint']).safeParse(mode);
  if (!parsed.success) return { ok: false, error: 'That is not a review mode.' };

  if (!modelAvailable()) {
    return {
      ok: false,
      error: 'ANTHROPIC_API_KEY is not set, so facilitated reviews are unavailable. '
        + 'Everything else in Cairn works without it.',
    };
  }

  const viewer = await requireViewer();
  if (parsed.data === 'joint' && viewer.role !== 'principal') {
    return { ok: false, error: 'The joint review belongs to the principals.' };
  }

  let id: string;
  try {
    id = await withMember(viewer.memberId, async (tx) => {
      const m = await method(tx);
      const minutes = m.num(
        parsed.data === 'joint' ? 'timebox.review_joint' : 'timebox.review_individual',
      );

      const [open] = (await tx.execute(sql`
        select id from session_row
         where kind = 'review' and ended_at is null
           and ${viewer.memberId}::uuid = any(actor_member_ids)`)) as unknown as
        Array<{ id: string }>;
      if (open) return open.id;

      const [gap] = (await tx.execute(sql`
        select extract(day from now() - max(started_at))::int as days
          from session_row where kind = 'review' and mode = ${parsed.data}`)) as unknown as
        Array<{ days: number | null }>;

      const [row] = (await tx.execute(sql`
        insert into session_row
          (household_id, kind, mode, method_version_id, actor_member_ids,
           planned_minutes, gap_days)
        values (${viewer.householdId}, 'review', ${parsed.data}, ${m.versionId},
                array[${viewer.memberId}]::uuid[], ${minutes}, ${gap?.days ?? null})
        returning id`)) as unknown as Array<{ id: string }>;

      return row.id;
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'The review did not open.' };
  }

  redirect(`/session/${id}`);
}

export async function endReview(sessionId: string): Promise<Result> {
  const parsed = z.string().uuid().safeParse(sessionId);
  if (!parsed.success) return { ok: false, error: 'That is not a session.' };

  const viewer = await requireViewer();
  try {
    await withMember(viewer.memberId, async (tx) => {
      await tx.execute(sql`
        update session_row set ended_at = now()
         where id = ${parsed.data} and ended_at is null`);
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'The review did not close.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
