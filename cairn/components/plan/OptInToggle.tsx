'use client';

import { useState, useTransition } from 'react';
import { setPrivateReadOptIn } from '@/lib/actions/plan';

export function OptInToggle({ optedIn }: { optedIn: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await setPrivateReadOptIn(!optedIn);
          if (!r.ok) setError(r.error);
        })}
        className="rounded-md border border-rule px-2.5 py-1 text-[.76rem] text-ink-muted disabled:opacity-45"
      >
        {optedIn ? 'Withdraw my opt in' : 'Opt in'}
      </button>
      {error ? (
        <span className="text-[.78rem]" style={{ color: 'var(--st-crit)' }}>{error}</span>
      ) : null}
    </>
  );
}
