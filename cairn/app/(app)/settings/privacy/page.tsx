import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { Card } from '@/components/ui/Tile';

export const dynamic = 'force-dynamic';

/**
 * Every machine read of the viewer's own private items: when, and which run.
 * No content, because the content is already theirs. An unlogged machine read
 * of something someone marked private is indistinguishable from no privacy.
 */
export default async function PrivacyPage() {
  const viewer = await requireViewer();

  const reads = await withMember(viewer.memberId, async (tx) =>
    (await tx.execute(sql`
      select l.id, l.item_type, l.read_at, l.purpose, l.run_id
        from private_read_log l
       where l.owner_member_id = ${viewer.memberId}
       order by l.read_at desc
       limit 200`)) as unknown as Array<{
        id: string; item_type: string; read_at: string; purpose: string; run_id: string | null;
      }>);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">Your private read log</h1>
        <p className="mt-1 max-w-[64ch] text-[.86rem] text-ink-muted">
          Every time collision detection read one of your private items: when, and which run. Only
          you can open this page.
        </p>
      </header>

      <Card title="Reads" sub={`${reads.length} recorded`}>
        {reads.length === 0 ? (
          <p className="text-[.86rem] text-ink-muted">
            Nothing has read your private items.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {reads.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-3 font-mono text-[.78rem]">
                <span className="text-ink">{new Date(r.read_at).toISOString().replace('T', ' ').slice(0, 16)}</span>
                <span className="text-ink-muted">{r.item_type}</span>
                <span className="text-ink-faint">{r.purpose}</span>
                {/* method-literal-ok: a short uuid prefix, not a threshold */}
                {r.run_id ? <span className="text-ink-faint">run {r.run_id.slice(0, 8)}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
