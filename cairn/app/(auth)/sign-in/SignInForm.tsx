'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

/** Email one time code. No passwords in v1. */
export function SignInForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setStage('code');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.verifyOtp({
      email, token: code, type: 'email',
    });
    setBusy(false);
    if (err) setError(err.message);
    else window.location.assign('/');
  }

  return (
    <form onSubmit={stage === 'email' ? sendCode : verify} className="card p-5">
      <label className="kicker block" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={stage === 'code'}
        className="mt-2 w-full rounded-md border border-rule bg-surface-2 px-3 py-2 text-[.9rem]"
      />

      {stage === 'code' ? (
        <>
          <label className="kicker mt-4 block" htmlFor="code">Code from your email</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-2 w-full rounded-md border border-rule bg-surface-2 px-3 py-2
                       font-mono text-[.9rem] tracking-[.2em]"
          />
        </>
      ) : null}

      {error ? (
        <p className="mt-3 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-md bg-brand px-3 py-2 text-[.88rem] text-on-brand
                   disabled:opacity-45"
      >
        {busy ? 'Working' : stage === 'email' ? 'Send a code' : 'Sign in'}
      </button>

      {stage === 'code' ? (
        <button
          type="button"
          onClick={() => { setStage('email'); setCode(''); }}
          className="mt-2 w-full rounded-md border border-rule px-3 py-2 text-[.82rem] text-ink-muted"
        >
          Use a different email
        </button>
      ) : null}
    </form>
  );
}
