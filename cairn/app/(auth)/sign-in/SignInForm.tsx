'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

/**
 * Turns an auth failure into something the person reading it can act on.
 *
 * The one that will actually happen is the email rate limit. Supabase's built in
 * mail service is for development: a handful of messages an hour, no delivery
 * guarantee, and it is not meant to carry a real sign in. Hitting it looks like
 * the application is broken when the application never sent anything.
 */
function explainAuthError(message: string): string {
  if (/rate limit/i.test(message)) {
    return 'The email service refused to send: its hourly limit is used up. Supabase ships '
      + 'with a development mail service that sends only a few messages an hour and is not '
      + 'meant for real use. Connect an SMTP provider under Authentication, Emails in the '
      + 'Supabase dashboard, and this stops happening. Until then the limit resets within '
      + 'the hour.';
  }
  if (/invalid|expired/i.test(message) && /token|otp|code/i.test(message)) {
    return 'That code is wrong or has expired. Codes last an hour. Ask for a new one.';
  }
  if (/signups not allowed|not allowed for otp/i.test(message)) {
    return 'This address cannot be signed in. If email signups are disabled in Supabase, '
      + 'the account has to be invited first.';
  }
  return message;
}

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
    if (err) setError(explainAuthError(err.message));
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
    if (err) setError(explainAuthError(err.message));
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
