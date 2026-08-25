import { notFound } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { forReview } from '@/lib/rules/for-review';
import { ReviewPane } from '@/components/session/ReviewPane';

export const dynamic = 'force-dynamic';

export default async function SessionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const [session] = (await tx.execute(sql`
      select s.id, s.mode, s.kind, s.planned_minutes, s.started_at, s.ended_at,
             s.summary, s.transcript_ref, v.version as method_version
        from session_row s
        join method_version v on v.id = s.method_version_id
       where s.id = ${id}`)) as unknown as Array<{
        id: string; mode: 'individual' | 'joint'; kind: string; planned_minutes: number;
        started_at: string; ended_at: string | null; summary: unknown;
        transcript_ref: string | null; method_version: number;
      }>;

    if (!session) return null;

    const changes = (await tx.execute(sql`
      select c.entity_type, c.field, c.from_value, c.to_value, c.reason, c.at,
             m.ref, m.title
        from session_change c
        left join milestone m on m.id = c.entity_id
       where c.session_id = ${id}
       order by c.at`)) as unknown as Array<{
        entity_type: string; field: string; from_value: string | null;
        to_value: string; reason: string | null; at: string;
        ref: string | null; title: string | null;
      }>;

    const commitments = (await tx.execute(sql`
      select text, due_date::text as due_date from commitment
       where session_id = ${id} order by due_date`)) as unknown as
      Array<{ text: string; due_date: string }>;

    const facts = await forReview(tx, {
      mode: session.mode, memberId: viewer.memberId, householdId: viewer.householdId,
    });

    return { session, changes, commitments, facts };
  });

  if (!data) notFound();

  const history: { role: string; text: string }[] = [];
  if (data.session.transcript_ref) {
    try {
      const parsed = JSON.parse(data.session.transcript_ref) as Array<{
        role: string; content: unknown;
      }>;
      for (const entry of parsed) {
        const blocks = Array.isArray(entry.content) ? entry.content : [];
        const text = blocks
          .filter((b): b is { type: 'text'; text: string } =>
            typeof b === 'object' && b !== null && (b as { type?: string }).type === 'text')
          .map((b) => b.text)
          .join('\n');
        if (text.trim()) history.push({ role: entry.role, text });
      }
    } catch {
      // A transcript that will not parse is not a reason to refuse the page.
      // The plan is in the database; the transcript is a record of talking.
    }
  }

  return (
    <ReviewPane
      sessionId={data.session.id}
      mode={data.session.mode}
      plannedMinutes={data.session.planned_minutes}
      startedAt={data.session.started_at}
      endedAt={data.session.ended_at}
      methodVersion={data.session.method_version}
      history={history}
      changes={data.changes.map((c) => ({
        ref: c.ref,
        title: c.title,
        field: c.field,
        fromValue: c.from_value,
        toValue: c.to_value,
        reason: c.reason,
      }))}
      commitments={data.commitments.map((c) => ({ text: c.text, due: c.due_date }))}
      facts={{
        counts: data.facts.counts,
        slippage: data.facts.slippage.length,
        proposedUnagreed: data.facts.proposedUnagreed.length,
        expiredAssumptions: data.facts.expiredAssumptions.length,
        dueInside90Days: data.facts.dueInside90Days.length,
        overCeiling: data.facts.load.some((l) => l.overCeiling),
        shortfallMonths: data.facts.money.shortfallMonths.length,
      }}
    />
  );
}
