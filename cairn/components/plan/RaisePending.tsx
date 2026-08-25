'use client';

import { useState, useTransition } from 'react';
import { raisePendingItem } from '@/lib/actions/plan';

/**
 * The only way to put something on someone else's track.
 *
 * It lands in their queue, never in their domains. A track written on someone's
 * behalf looks like agreement without being agreement.
 */
export function RaisePending({ trackId, ownerName }: { trackId: string; ownerName: string }) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await raisePendingItem({ trackId, text });
          if (r.ok) { setText(''); setDone(true); } else setError(r.error);
        });
      }}
    >
      <div className="kicker">Raise something for {ownerName}</div>
      <textarea
        required
        rows={2}
        value={text}
        onChange={(e) => { setText(e.target.value); setDone(false); }}
        placeholder="A question, not an edit"
        className="mt-2 w-full rounded-md border border-rule bg-surface-2 px-2.5 py-1.5 text-[.86rem]"
      />
      <p className="mt-1.5 max-w-[56ch] text-[.76rem] text-ink-faint">
        This goes to their queue. They decide what, if anything, changes in their plan.
      </p>
      {error ? <p className="mt-2 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{error}</p> : null}
      {done ? <p className="mt-2 text-[.8rem] text-ink-muted">Raised.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-md border border-rule px-3 py-1.5 text-[.82rem] text-ink-muted disabled:opacity-45"
      >
        {pending ? 'Sending' : 'Raise it'}
      </button>
    </form>
  );
}
