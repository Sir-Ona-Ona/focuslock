'use client';

import { useState, useTransition } from 'react';
import { respondToRequest } from '@/lib/actions/method';

export function ChangeRequest({
  requestId, settingKey, fromValue, toValue, reason, requestedBy, isMine, protects,
}: {
  requestId: string; settingKey: string; fromValue: string; toValue: string;
  reason: string; requestedBy: string; isMine: boolean; protects: string | null;
}) {
  const [declining, setDeclining] = useState(false);
  const [why, setWhy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-lg border border-rule bg-surface-2 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <code className="font-mono text-[.78rem]">{settingKey}</code>
        <span className="text-[.76rem] text-ink-faint">from {requestedBy}</span>
      </div>
      <div className="mt-1 font-mono text-[.78rem]">{fromValue} to {toValue}</div>
      <p className="mt-1.5 max-w-[62ch] text-[.83rem] text-ink-muted">{reason}</p>
      {protects ? (
        <p className="mt-1 text-[.8rem]" style={{ color: 'var(--st-serious)' }}>
          This protects {protects}.
        </p>
      ) : null}

      {isMine ? (
        <p className="mt-2 text-[.8rem] text-ink-faint">
          Yours to withdraw, not to approve. The other principal answers it.
        </p>
      ) : (
        <div className="mt-3">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => {
                const r = await respondToRequest({ requestId, approve: true });
                if (!r.ok) setError(r.error);
              })}
              className="rounded-md bg-brand px-3 py-1.5 text-[.8rem] text-on-brand disabled:opacity-45"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setDeclining(!declining)}
              className="rounded-md border border-rule px-3 py-1.5 text-[.8rem] text-ink-muted"
            >
              Decline
            </button>
          </div>
          {declining ? (
            <form
              className="mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                start(async () => {
                  const r = await respondToRequest({
                    requestId, approve: false, declineReason: why,
                  });
                  if (r.ok) setDeclining(false); else setError(r.error);
                });
              }}
            >
              <input
                required
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Why you are declining"
                className="w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.84rem]"
              />
              <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md border border-rule px-3 py-1.5 text-[.8rem] text-ink-muted"
              >
                Record it
              </button>
            </form>
          ) : null}
          {error ? (
            <p className="mt-2 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{error}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
