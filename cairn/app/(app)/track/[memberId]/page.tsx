import { notFound } from 'next/navigation';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';
import {
  assumptionsFor, constraintsFor, goals, members, milestones,
  pendingFor, privateCounts, risksFor, tracks,
} from '@/lib/plan/read';
import { domainLoads, loadAudit } from '@/lib/rules/load';
import { DomainSection } from '@/components/plan/DomainSection';
import { AddMilestone } from '@/components/plan/AddMilestone';
import { MoveTarget, PrivateToggle, SetStatus } from '@/components/plan/MilestoneActions';
import { RaisePending } from '@/components/plan/RaisePending';
import { Card } from '@/components/ui/Tile';
import { formatMonth } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

export default async function TrackPage({
  params,
}: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const viewer = await requireViewer();
  const isMine = memberId === viewer.memberId;

  const data = await withMember(viewer.memberId, async (tx) => {
    const m = await method(tx);
    const [people, allTracks] = await Promise.all([members(tx), tracks(tx)]);
    const owner = people.find((p) => p.id === memberId);
    const track = allTracks.find((t) => t.ownerMemberId === memberId);
    if (!owner || !track) return null;

    const domains = m.domains();
    const [items, g, a, r, c, loads, audit, pending, priv] = await Promise.all([
      milestones(tx, [track.id]),
      goals(tx, track.id),
      assumptionsFor(tx, track.id),
      risksFor(tx, track.id),
      constraintsFor(tx, track.id),
      domainLoads(tx, track.id),
      loadAudit(tx, { trackIds: [track.id] }),
      pendingFor(tx, track.id),
      isMine
        ? Promise.resolve({} as Record<string, number>)
        : privateCounts(tx, track.id, domains.map((d) => d.code)),
    ]);

    return { domains, owner, track, items, g, a, r, c, loads, audit: audit[0], pending, priv, people };
  });

  if (!data) notFound();

  const loadByDomain = new Map(data.loads.map((l) => [l.domainCode, l.hoursPerWeek]));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">
          {isMine ? 'My track' : `${data.owner.displayName}'s track`}
        </h1>
        {data.track.northStar ? (
          <p className="mt-1 max-w-[62ch] text-[.9rem] text-ink-muted">{data.track.northStar}</p>
        ) : null}
        {!isMine ? (
          <p className="mt-2 max-w-[62ch] text-[.82rem] text-ink-faint">
            Read only. Nothing here is yours to change, by any route. If you want to raise
            something, it goes to their queue for them to work through.
          </p>
        ) : null}
      </header>

      {data.track.claimStatus === 'unclaimed' ? (
        <div className="card border-dashed p-4 text-[.86rem]">
          Unclaimed. Cairn creates the track; only its owner puts goals in it.
        </div>
      ) : null}

      {data.audit ? (
        <Card
          title="Hours"
          sub={
            data.audit.overCeiling
              ? `${data.audit.demand} committed against a ceiling of ${data.audit.ceiling}, `
                + `${data.audit.gap.toFixed(1)} over.`
              : `${data.audit.demand} committed, ceiling ${data.audit.ceiling}.`
          }
        >
          <p className="text-[.84rem] text-ink-muted">
            Every domain states what it costs in hours as it is built, and health sums them
            against the ceiling. A bad week runs to {data.audit.demandBad} hours.
          </p>
        </Card>
      ) : null}

      {isMine && data.pending.length > 0 ? (
        <Card
          title="Raised for you"
          sub="Questions someone else left on your track. Work these first."
        >
          <ul className="space-y-2">
            {data.pending.map((p) => (
              <li key={p.id} className="text-[.88rem]">
                {p.text}
                <span className="ml-2 text-[.75rem] text-ink-faint">
                  from {data.people.find((m) => m.id === p.raisedByMemberId)?.displayName ?? 'a member'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!isMine ? <RaisePending trackId={data.track.id} ownerName={data.owner.displayName} /> : null}

      {data.c.length > 0 ? (
        <Card title="Constraints" sub="What this track has already agreed it will not trade.">
          <ul className="space-y-1.5">
            {data.c.map((c) => (
              <li key={c.id} className="text-[.86rem]">
                <span className="ref">{c.ref}</span> {c.statement}
                {c.isHard ? (
                  <span className="ml-1.5 rounded-full border border-rule px-1.5 py-0.5 text-[.7rem] text-ink-muted">
                    hard
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="space-y-3">
        {data.domains.map((d) => {
          const items = data.items.filter((i) => i.domainCode === d.code);
          return (
            <DomainSection
              key={d.code}
              domain={d}
              goals={data.g.filter((g) => g.domainCode === d.code)}
              milestones={items}
              assumptions={data.a.filter((a) => a.domainCode === d.code)}
              risks={data.r.filter((r) => r.domainCode === d.code)}
              privateCount={data.priv[d.code]}
              hoursPerWeek={loadByDomain.get(d.code)}
              editable={isMine}
            >
              {isMine ? (
                <div className="space-y-3">
                  {items.map((ms) => (
                    <div key={ms.id} className="rounded-lg border border-rule bg-surface-2 p-3">
                      <div className="flex flex-wrap items-baseline gap-x-2 text-[.82rem]">
                        <span className="ref">{ms.ref}</span>
                        <span className="text-ink-muted">{ms.title}</span>
                        <span className="ml-auto font-mono text-[.72rem] text-ink-faint">
                          {formatMonth(ms.targetDate)}
                        </span>
                      </div>
                      <SetStatus milestoneId={ms.id} current={ms.status} />
                      <div className="mt-1 flex flex-wrap gap-2">
                        <MoveTarget milestoneId={ms.id} />
                      </div>
                      <PrivateToggle milestoneId={ms.id} isPrivate={ms.isPrivate} />
                    </div>
                  ))}
                  <AddMilestone trackId={data.track.id} domainCode={d.code} isJoint={false} />
                </div>
              ) : null}
            </DomainSection>
          );
        })}
      </div>
    </div>
  );
}
