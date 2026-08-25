import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { Card } from '@/components/ui/Tile';
import { formatMonth } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

/**
 * The audit trail is the product. In three years the valuable question is not
 * what the status is, it is what you believed when you chose.
 */
export default async function LogsPage() {
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const events = (await tx.execute(sql`
      select e.id, e.event, e.at, e.note, m.ref, m.title, mm.display_name as who
        from milestone_event e
        join milestone m on m.id = e.milestone_id
        join member mm on mm.id = e.by_member_id
       order by e.at desc
       limit 100`)) as unknown as Array<{
        id: string; event: string; at: string; note: string | null;
        ref: string; title: string; who: string;
      }>;

    const moves = (await tx.execute(sql`
      select mv.id, mv.from_date::text as from_date, mv.to_date::text as to_date,
             mv.moved_at, mv.reason, m.ref, m.title, mm.display_name as who
        from milestone_move mv
        join milestone m on m.id = mv.milestone_id
        left join member mm on mm.id = mv.moved_by_member_id
       order by mv.moved_at desc
       limit 100`)) as unknown as Array<{
        id: string; from_date: string; to_date: string; moved_at: string;
        reason: string | null; ref: string; title: string; who: string | null;
      }>;

    const sessions = (await tx.execute(sql`
      select s.id, s.kind, s.mode, s.started_at, s.ended_at, s.planned_minutes,
             v.version as method_version
        from session_row s
        join method_version v on v.id = s.method_version_id
       order by s.started_at desc
       limit 50`)) as unknown as Array<{
        id: string; kind: string; mode: string; started_at: string;
        ended_at: string | null; planned_minutes: number; method_version: number;
      }>;

    const decisions = (await tx.execute(sql`
      select d.id, d.ref, d.title, d.state, d.decide_by::text as decide_by,
             d.outcome, v.version as method_version
        from decision d
        join method_version v on v.id = d.method_version_id
       order by d.decide_by
       limit 50`)) as unknown as Array<{
        id: string; ref: string; title: string; state: string;
        decide_by: string; outcome: string | null; method_version: number;
      }>;

    return { events, moves, sessions, decisions };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">Logs</h1>
        <p className="mt-1 max-w-[64ch] text-[.86rem] text-ink-muted">
          Append only. Nothing here was overwritten, and every session and decision carries the
          method version it was made under, so an old record is never reinterpreted under a newer
          method.
        </p>
      </header>

      <Card title="Date changes" sub="Every move, with the reason given at the time.">
        {data.moves.length === 0 ? (
          <p className="text-[.86rem] text-ink-muted">No dates have moved.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.moves.map((m) => (
              <li key={m.id} className="border-b border-rule pb-2.5 text-[.86rem] last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="ref">{m.ref}</span>
                  <span>{m.title}</span>
                  <span className="ml-auto font-mono text-[.72rem] text-ink-faint">
                    {formatMonth(m.from_date)} to {formatMonth(m.to_date)}
                  </span>
                </div>
                {m.reason ? (
                  <p className="mt-0.5 max-w-[62ch] text-[.8rem] text-ink-muted">
                    {m.reason}{m.who ? `, ${m.who}` : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Agreement history" sub="What was proposed, agreed, edited or taken to a session.">
        {data.events.length === 0 ? (
          <p className="text-[.86rem] text-ink-muted">Nothing on the joint plan yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.events.map((e) => (
              <li key={e.id} className="text-[.86rem]">
                <span className="ref">{e.ref}</span>{' '}
                <span className="font-mono text-[.74rem] text-ink-muted">
                  {e.event.replace('_', ' ')}
                </span>{' '}
                by {e.who}
                <span className="ml-2 font-mono text-[.72rem] text-ink-faint">
                  {new Date(e.at).toISOString().slice(0, 10)}
                </span>
                {e.note ? (
                  <p className="max-w-[62ch] text-[.8rem] text-ink-muted">{e.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Reviews and sessions" sub="Rendered against the timeboxes they actually ran under.">
        {data.sessions.length === 0 ? (
          <p className="text-[.86rem] text-ink-muted">
            No review has been run yet. Reviews arrive in phase 4, after the rules engine they read
            from.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.sessions.map((s) => (
              <li key={s.id} className="text-[.86rem]">
                <span className="font-mono text-[.74rem] text-ink-muted">
                  {s.mode} {s.kind}
                </span>{' '}
                {new Date(s.started_at).toISOString().slice(0, 10)}, {s.planned_minutes} minutes,
                method v{s.method_version}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.decisions.length > 0 ? (
        <Card title="Decisions" sub="Open and closed, with the method version each was worked under.">
          <ul className="space-y-2">
            {data.decisions.map((d) => (
              <li key={d.id} className="text-[.86rem]">
                <span className="ref">{d.ref}</span> {d.title}
                <span className="ml-2 text-[.76rem] text-ink-muted">
                  {d.state}, decide by {formatMonth(d.decide_by)}, method v{d.method_version}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
