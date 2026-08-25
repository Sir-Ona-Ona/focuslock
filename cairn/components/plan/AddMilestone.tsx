'use client';

import { useState, useTransition } from 'react';
import { createMilestone } from '@/lib/actions/plan';

export function AddMilestone({
  trackId, domainCode, isJoint,
}: { trackId: string; domainCode: string; isJoint: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-rule px-2.5 py-1 text-[.78rem] text-ink-muted
                   hover:border-rule-strong"
      >
        Add a milestone
      </button>
    );
  }

  return (
    <form
      className="rounded-lg border border-rule bg-surface-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const result = await createMilestone({
            trackId, domainCode, title, targetDate: target, note: note || undefined,
          });
          if (result.ok) {
            setTitle(''); setTarget(''); setNote(''); setOpen(false);
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <label className="kicker block" htmlFor={`t-${domainCode}`}>Milestone</label>
      <input
        id={`t-${domainCode}`}
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Something that is either done or not"
        className="mt-1.5 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.86rem]"
      />
      <label className="kicker mt-3 block" htmlFor={`d-${domainCode}`}>Target date</label>
      <input
        id={`d-${domainCode}`}
        type="date"
        required
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="mt-1.5 rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.86rem]"
      />
      <label className="kicker mt-3 block" htmlFor={`n-${domainCode}`}>Note</label>
      <input
        id={`n-${domainCode}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.86rem]"
      />

      {isJoint ? (
        <p className="mt-2 max-w-[52ch] text-[.76rem] text-ink-muted">
          This enters as proposed. It carries no execution status until the other principal agrees
          it belongs, because whether it is in the plan and how it is going are different questions.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{error}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-3 py-1.5 text-[.82rem] text-on-brand disabled:opacity-45"
        >
          {pending ? 'Saving' : isJoint ? 'Propose it' : 'Add it'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="rounded-md border border-rule px-3 py-1.5 text-[.82rem] text-ink-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
