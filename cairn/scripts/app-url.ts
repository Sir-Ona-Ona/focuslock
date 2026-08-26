/**
 * Builds the application's connection string from the one Supabase gives you,
 * and checks it.
 *
 * CAIRN_DATABASE_URL is the only secret that cannot be copied from a dashboard.
 * Supabase hands you a pooler string for the `postgres` owner; the app must
 * connect as `cairn_app`, which does not exist until the migrations have run.
 * So this is a transform plus a verification rather than a lookup, and doing it
 * by hand invites exactly the mistake the app is built to refuse: a connection
 * that can bypass row level security.
 *
 *   npx tsx scripts/app-url.ts "<pooler url from Supabase>" "<app password>"
 *
 * Add --verify to connect and confirm the role is real and correctly scoped.
 */
import postgres from 'postgres';
import { explainConnectionError } from './connection-error';

interface Built {
  url: string;
  masked: string;
  user: string;
  host: string;
  port: string;
  notes: string[];
}

export function buildAppUrl(source: string, password: string): Built {
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    throw new Error(
      'That does not parse as a connection string. Copy the whole thing, starting postgresql://',
    );
  }

  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new Error(`Expected a postgres:// or postgresql:// URL, got ${parsed.protocol}`);
  }

  const notes: string[] = [];
  const originalUser = decodeURIComponent(parsed.username);

  // Supabase's pooler puts the project reference in the username, as
  // user.projectref. A custom role keeps that suffix; only the role part
  // changes. A direct connection has no suffix, so there is nothing to keep.
  const dot = originalUser.indexOf('.');
  const projectRef = dot === -1 ? '' : originalUser.slice(dot + 1);
  const user = projectRef ? `cairn_app.${projectRef}` : 'cairn_app';

  if (originalUser === 'cairn_app' || originalUser.startsWith('cairn_app.')) {
    notes.push('The string you gave already names cairn_app, so only the password was replaced.');
  }

  parsed.username = encodeURIComponent(user);
  parsed.password = encodeURIComponent(password);

  const port = parsed.port || '5432';
  if (port === '5432' && parsed.hostname.includes('pooler')) {
    notes.push(
      'Port 5432 on a pooler host is session mode. Transaction mode, on 6543, is the one to '
      + 'use from a serverless runtime, because it does not hold a connection open between '
      + 'requests.',
    );
  }
  if (port === '5432' && !parsed.hostname.includes('pooler')) {
    notes.push(
      'This is the direct connection rather than the pooler. It works, but a serverless '
      + 'runtime will exhaust the connection limit under load. Prefer the transaction pooler '
      + 'on port 6543.',
    );
  }
  if (port === '6543' && !parsed.searchParams.has('pgbouncer')) {
    parsed.searchParams.set('pgbouncer', 'true');
    notes.push('Added pgbouncer=true, which the transaction pooler expects.');
  }

  const url = parsed.toString();
  const masked = url.replace(encodeURIComponent(password), '*'.repeat(8));

  return { url, masked, user, host: parsed.hostname, port, notes };
}

async function verify(url: string): Promise<void> {
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });
  try {
    const [row] = await sql<{ who: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      select current_user as who, rolsuper, rolbypassrls
        from pg_roles where rolname = current_user`;

    if (!row) throw new Error('Connected, but could not read the current role.');
    console.log(`\nConnected as ${row.who}.`);

    if (row.rolsuper || row.rolbypassrls) {
      throw new Error(
        `${row.who} can bypass row level security. Every privacy and authorship policy in `
        + 'Cairn would be ignored, silently. The app refuses to serve over this connection.',
      );
    }
    console.log('It cannot bypass row level security, which is what the app requires.');

    const [seeded] = await sql<{ n: number }[]>`
      select count(*)::int as n from method_setting`;
    console.log(
      seeded.n > 0
        ? `The method is seeded: ${seeded.n} settings readable.`
        : 'Connected, but no method settings are readable. Has the migration run?',
    );
  } finally {
    await sql.end();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--verify');
  const shouldVerify = process.argv.includes('--verify');
  const [source, password] = args;

  if (!source || !password) {
    console.error(
      'Usage: npx tsx scripts/app-url.ts "<pooler url from Supabase>" "<app password>" [--verify]\n\n'
      + 'The pooler url is the one under Connect in the Supabase dashboard, the transaction\n'
      + 'pooler on port 6543. The app password is the one you put in CAIRN_APP_DB_PASSWORD.',
    );
    process.exit(1);
  }

  const built = buildAppUrl(source, password);

  console.log('\nCAIRN_DATABASE_URL');
  console.log(built.url);
  console.log(`\n  role  ${built.user}`);
  console.log(`  host  ${built.host}`);
  console.log(`  port  ${built.port}`);
  for (const note of built.notes) console.log(`\n  note  ${note}`);

  if (shouldVerify) await verify(built.url);
  else console.log('\nAdd --verify to connect and check the role before you paste this anywhere.');
}

if (process.argv[1]?.endsWith('app-url.ts')) {
  main().catch((e) => {
    console.error(`\n${explainConnectionError(e, 'DATABASE_URL')}`);
    process.exit(1);
  });
}
