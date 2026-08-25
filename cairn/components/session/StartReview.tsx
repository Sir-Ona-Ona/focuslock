'use client';

import { useState, useTransition } from 'react';
import { startReview } from '@/lib/actions/session';

export function StartReview({
  mode, label, available,
}: { mode: 'individual' | 'joint'; label: string; available: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!available) {
    return (
      <p className="text-[.8rem] text-ink-faint">
        Facilitated reviews need ANTHROPIC_API_KEY. Everything else works without it, and a
        review can be run by hand from the track screens.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await startReview(mode);
          if (r && !r.ok) setError(r.error);
        })}
        className="rounded-md bg-brand px-3 py-1.5 text-[.84rem] text-on-brand disabled:opacity-45"
      >
        {pending ? 'Opening' : label}
      </button>
      {error ? (
        <p className="mt-2 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{error}</p>
      ) : null}
    </div>
  );
}
