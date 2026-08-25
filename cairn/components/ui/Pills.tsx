import { AGREEMENT, STATUS, type AgreementKey, type StatusKey } from './vocab';

export function StatusPill({ status }: { status: StatusKey | null }) {
  // I-2b: a proposed item has no execution status, so the cell says so in words
  // rather than borrowing a state it does not have.
  if (!status) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed
                   border-rule-strong px-2 py-0.5 text-[.72rem] text-ink-faint"
        title="Not yet part of the plan, so there is nothing to be behind on."
      >
        not yet
      </span>
    );
  }
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-rule
                 bg-surface-2 px-2 py-0.5 text-[.72rem] text-ink"
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{
          background: s.fill ? s.token : 'transparent',
          border: s.fill ? 'none' : `1.5px solid ${s.token}`,
        }}
      />
      {s.label}
    </span>
  );
}

export function AgreementPill({ agreement }: { agreement: AgreementKey }) {
  const a = AGREEMENT[agreement];
  const dashed = agreement === 'proposed';
  return (
    <span
      title={a.hint}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[.72rem] ${
        dashed
          ? 'border border-dashed border-rule-strong text-ink-faint'
          : 'border border-rule bg-brand-soft text-ink'
      }`}
    >
      {a.label}
    </span>
  );
}

export function PrivateCount({ n }: { n: number }) {
  return (
    <div className="rounded-lg border border-dashed border-rule px-3 py-2 text-[.8rem] text-ink-faint">
      {n} private {n === 1 ? 'item' : 'items'}
    </div>
  );
}
