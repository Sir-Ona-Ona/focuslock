import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';
import { assumptionsFor, constraintsFor, goals, members, milestones, risksFor, tracks } from '@/lib/plan/read';
import { canAgree, proposedCycles } from '@/lib/rules/agreement';
import { DomainSection } from '@/components/plan/DomainSection';
import { AddMilestone } from '@/components/plan/AddMilestone';
import { AgreementActions, MoveTarget, SetStatus } from '@/components/plan/MilestoneActions';
import { Card } from '@/components/ui/Tile';
import { formatMonth } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

export default async function JointPage() {
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const m = await method(tx);
    const allTracks = await tracks(tx);
    const joint = allTracks.find((t) => t.kind === 'joint');
    if (!joint) return null;

    const [items, g, a, r, c, people, unagreed] = await Promise.all([
      milestones(tx, [joint.id]),
      goals(tx, joint.id),
      assumptionsFor(tx, joint.id),
      risksFor(tx, joint.id),
      constraintsFor(tx, joint.id),
      members(tx),
      proposedCycles(tx, viewer.householdId),
    ]);

    return {
      domains: m.domains(),
      proposedLimit: m.num('rules.proposed_cycles'),
      joint, items, g, a, r, c, people, unagreed,
    };
  });

  if (!data) {
    return <p className="text-[.9rem] text-ink-muted">This household has no joint track yet.</p>;
  }

  const isPrincipal = viewer.role === 'principal';
  const cyclesByItem = new Map(data.unagreed.map((u) => [u.id, u]));
  const forced = data.unagreed.filter((u) => u.forced);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">Joint plan</h1>
        <p className="mt-1 max-w-[64ch] text-[.86rem] text-ink-muted">
          What commits both of you. An item is proposed until you both agree it belongs, then
          agreed, then active once it is being worked. A proposed item has no execution status,
          because whether it is in the plan and how it is going are different questions.
        </p>
      </header>

      {forced.length > 0 ? (
        <Card
          title={`Unagreed for ${data.proposedLimit} cycles`}
          sub="Two actions, and there is no third cycle."
        >
          <ul className="space-y-2">
            {forced.map((f) => (
              <li key={f.id} className="text-[.88rem]">
                <span className="ref">{f.ref}</span> {f.title}
                <p className="mt-1 text-[.8rem] text-ink-muted">
                  Agree it, or move it to the individual track of whoever wants it. An item that
                  stays proposed is a disagreement nobody has had.
                </p>
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
              editable={isPrincipal}
            >
              {isPrincipal ? (
                <div className="space-y-3">
                  {items.map((ms) => {
                    const cycles = cyclesByItem.get(ms.id);
                    const proposer = data.people.find((p) => p.id === ms.proposedByMemberId);
                    return (
                      <div key={ms.id} className="rounded-lg border border-rule bg-surface-2 p-3">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-[.82rem]">
                          <span className="ref">{ms.ref}</span>
                          <span className="text-ink-muted">{ms.title}</span>
                          <span className="ml-auto font-mono text-[.72rem] text-ink-faint">
                            {formatMonth(ms.targetDate)}
                          </span>
                        </div>

                        {ms.agreement === 'proposed' ? (
                          <>
                            <p className="mt-1 text-[.78rem] text-ink-faint">
                              Proposed by {proposer?.displayName ?? 'a principal'}
                              {cycles && cycles.cyclesProposed > 0
                                ? `, unagreed for ${cycles.cyclesProposed} `
                                  + `${cycles.cyclesProposed === 1 ? 'cycle' : 'cycles'}`
                                : ''}
                            </p>
                            <AgreementActions
                              milestoneId={ms.id}
                              canAgree={canAgree(
                                { proposedByMemberId: ms.proposedByMemberId }, viewer.memberId,
                              )}
                            />
                          </>
                        ) : (
                          <>
                            <SetStatus milestoneId={ms.id} current={ms.status} />
                            <div className="mt-1"><MoveTarget milestoneId={ms.id} /></div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <AddMilestone trackId={data.joint.id} domainCode={d.code} isJoint />
                </div>
              ) : null}
            </DomainSection>
          );
        })}
      </div>

      {data.c.length > 0 ? (
        <Card title="Shared constraints" sub="Agreed, and tested against before anything is scored.">
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
    </div>
  );
}
