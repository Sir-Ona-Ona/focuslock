'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

type Method = 'password' | 'code';

/**
 * Turns an auth failure into something the person reading it can act on.
 *
 * Most of these are not application faults at all, they are states of the
 * Supabase project, and the raw message says so in a way that reads like Cairn
 * broke. Anything unrecognised passes through unchanged, so a real error is
 * never buried under a guess.
 */
function explainAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'That email and password do not match an account. If the account was only just '
      + 'created, check the address for a typo. Passwords are set in Supabase, under '
      + 'Authentication, Users.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'The account exists but has never been confirmed, so it cannot sign in. Confirm it '
      + 'in Supabase under Authentication, Users. Creating a user with Auto Confirm on avoids '
      + 'this.';
  }
  if (/rate limit/i.test(message)) {
    return 'The email service refused to send: its hourly limit is used up. Supabase ships '
      + 'with a development mail service that sends only a few messages an hour and is not '
      + 'meant for real use. Signing in with a password does not send email and is not '
      + 'affected. Otherwise the limit resets within the hour.';
  }
  if (/invalid|expired/i.test(message) && /token|otp|code/i.test(message)) {
    return 'That code is wrong or has expired. Codes last an hour. Ask for a new one.';
  }
  if (/signups not allowed|not allowed for otp/i.test(message)) {
    return 'This address cannot be signed in. If email signups are disabled in Supabase, the '
      + 'account has to be created there first.';
  }
  return message;
}

/**
 * Two ways in, both ending at the same account.
 *
 * A password is the path when accounts are created directly in Supabase, and
 * it sends no email, so it works whatever state the mail service is in. The
 * emailed code stays because it needs nothing set up in advance.
 */
export function SignInForm() {
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'request' | 'code'>('request');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function chooseMethod(next: Method) {
    setMethod(next);
    setStage('request');
    setCode('');
    setError(null);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(explainAuthError(err.message));
    else window.location.assign('/');
  }

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

  const onSubmit = method === 'password'
    ? signInWithPassword
    : stage === 'request' ? sendCode : verify;

  const label = busy
    ? 'Working'
    : method === 'password' ? 'Sign in'
      : stage === 'request' ? 'Send a code' : 'Sign in';

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <label className="kicker block" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={stage === 'code'}
        className="mt-2 w-full rounded-md border border-rule bg-surface-2 px-3 py-2 text-[.9rem]"
      />

      {method === 'password' ? (
        <>
          <label className="kicker mt-4 block" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-md border border-rule bg-surface-2 px-3 py-2 text-[.9rem]"
          />
        </>
      ) : null}

      {method === 'code' && stage === 'code' ? (
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
        {label}
      </button>

      {method === 'code' && stage === 'code' ? (
        <button
          type="button"
          onClick={() => { setStage('request'); setCode(''); }}
          className="mt-2 w-full rounded-md border border-rule px-3 py-2 text-[.82rem] text-ink-muted"
        >
          Use a different email
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => chooseMethod(method === 'password' ? 'code' : 'password')}
        className="mt-3 w-full text-[.8rem] text-ink-faint underline decoration-rule-strong"
      >
        {method === 'password' ? 'Email me a code instead' : 'Use a password instead'}
      </button>
    </form>
  );
}
