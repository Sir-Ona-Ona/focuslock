/**
 * Turns a connection failure into something actionable.
 *
 * The one that costs the most time is Supabase's direct connection being
 * IPv6-only. A CI runner with no IPv6 route reports ENETUNREACH against a
 * resolved address, which looks like a firewall problem, a wrong password, or a
 * dead database, and is none of those.
 */
export function explainConnectionError(e: unknown, which: 'DIRECT_URL' | 'DATABASE_URL'): string {
  const err = e as { code?: string; address?: string; message?: string };
  const message = err?.message ?? String(e);
  const looksIpv6 = typeof err?.address === 'string' && err.address.includes(':');

  if (err?.code === 'ENETUNREACH' && looksIpv6) {
    return [
      `${which} points at a host that only answers over IPv6, and this machine has no IPv6 route.`,
      '',
      "Supabase's direct connection, db.PROJECT.supabase.co, is IPv6 only. GitHub runners are",
      'IPv4 only, so it can never be reached from CI. This is not a firewall, a password, or a',
      'database that is down.',
      '',
      'Use the pooler host instead, which answers on IPv4. In the Supabase dashboard, press',
      'Connect and take:',
      '',
      `  ${which === 'DIRECT_URL'
        ? 'Session pooler, port 5432. Session mode holds a real connection for the whole session,'
          + '\n  so migrations, DDL and CREATE ROLE all behave exactly as they do on a direct connection.'
        : 'Transaction pooler, port 6543, which is the right mode for a serverless runtime.'}`,
      '',
      'Both live on aws-0-REGION.pooler.supabase.com and put the project reference in the',
      'username, as postgres.PROJECTREF.',
      '',
      `Original error: ${message}`,
    ].join('\n');
  }

  if (err?.code === 'ENOTFOUND') {
    return `${which} names a host that does not resolve. Check the hostname.\n\n`
      + `Original error: ${message}`;
  }

  if (/password authentication failed/i.test(message)) {
    return `${which} was rejected: wrong password, or the role does not exist yet.\n\n`
      + `Original error: ${message}`;
  }

  if (/Tenant or user not found/i.test(message)) {
    return `${which} was rejected by the pooler. On a pooler host the username carries the\n`
      + 'project reference, as postgres.PROJECTREF or cairn_app.PROJECTREF. A bare username\n'
      + `fails this way.\n\nOriginal error: ${message}`;
  }

  return message;
}
