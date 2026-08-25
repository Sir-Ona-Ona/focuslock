import { StatusPill, AgreementPill, PrivateCount } from '@/components/ui/Pills';
import { formatMonth, HORIZON } from '@/components/ui/vocab';
import type { AssumptionListRow, GoalRow, MilestoneView, RiskListRow } from '@/lib/plan/read';

export interface DomainSectionProps {
  domain: { code: string; short: string; name: string };
  goals: GoalRow[];
  milestones: MilestoneView[];
  assumptions: AssumptionListRow[];
  risks: RiskListRow[];
  privateCount?: number;
  hoursPerWeek?: number;
  /** Edit controls are absent rather than disabled when this is someone else's track. */
  editable: boolean;
  children?: React.ReactNode;
}

export function DomainSection(props: DomainSectionProps) {
  const { domain, goals, milestones, assumptions, risks } = props;
  const empty =
    goals.length === 0 && milestones.length === 0
    && assumptions.length === 0 && risks.length === 0
    && !props.privateCount;

  return (
    <details open={!empty} className="card overflow-hidden">
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-4 py-3">
        <span className="font-mono text-[.66rem] uppercase tracking-[.12em] text-ink-faint">
          {domain.code}
        </span>
        <span className="font-serif text-[1.05rem]">{domain.short}</span>
        <span className="text-[.76rem] text-ink-muted">{domain.name}</span>
        {props.hoursPerWeek !== undefined ? (
          <span className="ml-auto font-mono text-[.7rem] text-ink-muted tnum">
            {props.hoursPerWeek} h/wk
          </span>
        ) : null}
      </summary>

      <div className="space-y-4 p-4">
        {goals.length > 0 ? (
          <div>
            <div className="kicker">Goals</div>
            <ul className="mt-2 space-y-1">
              {goals.map((g) => (
                <li key={g.id} className="flex gap-2 text-[.88rem]">
                  <span className="ref shrink-0 pt-0.5">
                    {HORIZON[g.horizon as keyof typeof HORIZON] ?? g.horizon}
                  </span>
                  <span>{g.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {milestones.length > 0 ? (
          <div>
            <div className="kicker">Milestones</div>
            <ul className="mt-2 space-y-3">
              {milestones.map((ms) => (
                <li key={ms.id} className="border-b border-rule pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {ms.agreement ? <AgreementPill agreement={ms.agreement} /> : null}
                    <StatusPill status={ms.status} />
                    <span className="ref">{ms.ref}</span>
                    <span className="ml-auto font-mono text-[.72rem] text-ink-faint tnum">
                      {formatMonth(ms.targetDate)}
                    </span>
                  </div>
                  <div className="mt-1 text-[.9rem]">{ms.title}</div>

                  {/* Slippage is always shown with its history, never just the current date. */}
                  {ms.moveCount > 0 ? (
                    <div className="mt-1 font-mono text-[.71rem] text-ink-muted">
                      moved {ms.moveCount}x: {formatMonth(ms.originalTargetDate)}
                      {ms.moveHistory.map((d) => ` to ${formatMonth(d)}`).join('')}
                    </div>
                  ) : null}

                  {ms.note ? (
                    <p className="mt-1 max-w-[62ch] text-[.8rem] text-ink-muted">{ms.note}</p>
                  ) : null}
                  {ms.statusReason ? (
                    <p className="mt-1 max-w-[62ch] text-[.8rem] text-ink-muted">
                      {ms.statusReason}
                    </p>
                  ) : null}
                  {ms.isPrivate ? (
                    <p className="mt-1 font-mono text-[.7rem] text-ink-faint">private</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {props.privateCount ? <PrivateCount n={props.privateCount} /> : null}

        {assumptions.length > 0 ? (
          <div>
            <div className="kicker">Assumptions</div>
            <ul className="mt-2 space-y-1.5">
              {assumptions.map((a) => (
                <li key={a.id} className="text-[.85rem]">
                  <span className="ref">{a.ref}</span> {a.statement}
                  <span className="ml-1 text-[.76rem] text-ink-muted">
                    ({a.confidence} confidence, test by {formatMonth(a.testBy)}
                    {a.state !== 'open' ? `, ${a.state.replace('_', ' ')}` : ''})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {risks.length > 0 ? (
          <div>
            <div className="kicker">Risks</div>
            <ul className="mt-2 space-y-1.5">
              {risks.map((r) => (
                <li key={r.id} className="text-[.85rem]">
                  <span className="ref">{r.ref}</span> {r.statement}
                  <span className="ml-1 text-[.76rem] text-ink-muted">
                    ({r.likelihood} likelihood, {r.impact} impact)
                  </span>
                  {r.mitigation ? (
                    <div className="text-[.78rem] text-ink-muted">Mitigation: {r.mitigation}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {empty ? (
          <p className="text-[.84rem] text-ink-faint">
            Nothing here yet.
          </p>
        ) : null}

        {props.children}
      </div>
    </details>
  );
}
