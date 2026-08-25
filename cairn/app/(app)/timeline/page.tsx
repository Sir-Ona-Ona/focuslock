import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';
import { collisions, members, milestones, tracks } from '@/lib/plan/read';
import { Timeline, type TimelineDependency, type TimelineMark } from '@/components/timeline/Timeline';
import { trackToken } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

export default async function TimelinePage() {
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const m = await method(tx);
    const [people, allTracks] = await Promise.all([members(tx), tracks(tx)]);
    const items = await milestones(tx, allTracks.map((t) => t.id));
    const coll = await collisions(tx);

    const gates = (await tx.execute(sql`
      select id, ref, title, decide_by::text as decide_by
        from gate where status = 'open' order by decide_by`)) as unknown as
      Array<{ id: string; ref: string; title: string; decide_by: string }>;

    const deps = (await tx.execute(sql`
      select d.id, d.from_milestone_id, d.to_milestone_id, d.nature,
             (f.status in ('slipped','blocked')) as alert
        from dependency d
        join milestone f on f.id = d.from_milestone_id`)) as unknown as
      Array<{
        id: string; from_milestone_id: string; to_milestone_id: string;
        nature: 'hard' | 'soft'; alert: boolean;
      }>;

    return { domains: m.domains(), people, allTracks, items, coll, gates, deps };
  });

  // Lanes: the two individual tracks with joint in the middle, so position tells
  // you whose an item is without needing colour.
  const principals = data.people
    .filter((p) => p.role !== 'advisor')
    .sort((a, b) => a.seatNo - b.seatNo);

  const laneOf = new Map<string, string>();
  for (const t of data.allTracks) {
    laneOf.set(t.id, t.kind === 'joint' ? 'joint' : `m:${t.ownerMemberId}`);
  }

  const lanes = [
    ...(principals[0] ? [{
      key: `m:${principals[0].id}`,
      label: principals[0].displayName,
      token: trackToken(principals[0].principalSlot),
    }] : []),
    { key: 'joint', label: 'Joint', token: trackToken(null) },
    ...principals.slice(1).map((p) => ({
      key: `m:${p.id}`,
      label: p.displayName,
      token: trackToken(p.principalSlot),
    })),
  ];

  const marks: TimelineMark[] = data.items
    .filter((i) => i.status !== 'dropped')
    .map((i) => ({
      id: i.id,
      ref: i.ref,
      title: i.title,
      note: i.note,
      domainCode: i.domainCode,
      laneKey: laneOf.get(i.trackId) ?? 'joint',
      targetDate: i.targetDate,
      originalTargetDate: i.originalTargetDate,
      moveHistory: i.moveHistory,
      status: i.status,
      agreement: i.agreement,
    }));

  const dependencies: TimelineDependency[] = data.deps.map((d) => ({
    id: d.id,
    fromId: d.from_milestone_id,
    toId: d.to_milestone_id,
    nature: d.nature,
    alert: d.alert,
  }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-[1.7rem]">Timeline</h1>
        <p className="mt-1 max-w-[64ch] text-[.86rem] text-ink-muted">
          Seven domains in the method's order, three lanes each with the joint plan in the middle.
          Position tells you whose an item is. Colour tells you what needs attention.
        </p>
      </header>

      {marks.length === 0 ? (
        <p className="text-[.9rem] text-ink-muted">
          Nothing to draw yet. Milestones appear here as soon as either track has them.
        </p>
      ) : (
        <Timeline
          domains={data.domains}
          lanes={lanes}
          marks={marks}
          gates={data.gates.map((g) => ({
            id: g.id, ref: g.ref, title: g.title, decideBy: g.decide_by,
          }))}
          collisions={data.coll
            .filter((c) => c.status === 'open')
            .map((c) => ({
              id: c.id, ref: c.ref, tension: c.tension,
              from: c.contestedFrom, to: c.contestedTo, domains: c.domains,
            }))}
          dependencies={dependencies}
          todayIso={today}
        />
      )}
    </div>
  );
}
