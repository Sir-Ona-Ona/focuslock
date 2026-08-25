'use client';

import { useState, useTransition } from 'react';
import { claimInvite, createHousehold } from '@/lib/actions/household';

export function SetupForm({ email }: { email: string }) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = mode === 'create'
        ? await createHousehold({ householdName, displayName, partnerName, partnerEmail })
        : await claimInvite();
      if (r.ok) window.location.assign('/');
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <div className="mb-4 flex gap-1 rounded-md border border-rule p-0.5" role="group">
        {(['create', 'join'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            aria-pressed={mode === m}
            className={`flex-1 rounded px-2.5 py-1.5 text-[.82rem] ${
              mode === m ? 'bg-surface-2 text-ink' : 'text-ink-muted'
            }`}
          >
            {m === 'create' ? 'Start one' : 'Join one'}
          </button>
        ))}
      </div>

      {mode === 'join' ? (
        <p className="text-[.86rem]">
          If the other principal has already set the household up with {email}, this claims your
          track.
        </p>
      ) : (
        <>
          <Field label="Household name" value={householdName} onChange={setHouseholdName} />
          <Field label="What the plan calls you" value={displayName} onChange={setDisplayName} />
          <Field label="The other principal" value={partnerName} onChange={setPartnerName} />
          <Field
            label="Their email"
            value={partnerEmail}
            onChange={setPartnerEmail}
            type="email"
          />
          <p className="mt-3 max-w-[52ch] text-[.76rem] text-ink-faint">
            They sign in with that address and claim their own track. Neither of you has elevated
            rights over the other, and adding anyone beyond the two of you takes both of you.
          </p>
        </>
      )}

      {error ? (
        <p className="mt-3 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-md bg-brand px-3 py-2 text-[.88rem] text-on-brand disabled:opacity-45"
      >
        {pending ? 'Working' : mode === 'create' ? 'Create the household' : 'Claim my track'}
      </button>
    </form>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="mt-3 first:mt-0">
      <label className="kicker block" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-rule bg-surface-2 px-3 py-2 text-[.88rem]"
      />
    </div>
  );
}
