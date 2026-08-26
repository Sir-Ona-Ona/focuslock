/**
 * Builds either connection string from the one Supabase gives you, and checks it.
 *
 * Supabase hands out a string with [YOUR-PASSWORD] in it. Substituting that by
 * hand is where two silent mistakes live: a password containing @, #, / or ?
 * breaks the URL without any error, and the application string additionally has
 * to name `cairn_app` rather than the owner, which invites exactly the mistake
 * the app refuses to serve over.
 *
 *   # CAIRN_DIRECT_URL, from the session pooler, keeping the owner role
 *   npx tsx scripts/db-url.ts "<session pooler url>" "<database password>" --direct
 *
 *   # CAIRN_DATABASE_URL, from the transaction pooler, as cairn_app
 *   npx tsx scripts/db-url.ts "<transaction pooler url>" "<app password>"
 *
 * Add --verify to connect and check what the string actually reaches.
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

export function buildUrl(
  source: string,
  password: string,
  opts: { keepRole?: boolean } = {},
): Built {
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
  const user = opts.keepRole
    ? originalUser
    : (projectRef ? `cairn_app.${projectRef}` : 'cairn_app');

  if (!opts.keepRole && (originalUser === 'cairn_app' || originalUser.startsWith('cairn_app.'))) {
    notes.push('The string you gave already names cairn_app, so only the password was replaced.');
  }
  if (opts.keepRole && (originalUser === 'cairn_app' || originalUser.startsWith('cairn_app.'))) {
    notes.push(
      'This names cairn_app, which cannot run migrations: it has no rights to create tables '
      + 'or roles. CAIRN_DIRECT_URL should be the owner, usually postgres.',
    );
  }

  parsed.username = encodeURIComponent(user);
  parsed.password = encodeURIComponent(password);

  const port = parsed.port || '5432';
  const onPooler = parsed.hostname.includes('pooler');

  if (!onPooler) {
    notes.push(
      'This is the direct host, db.PROJECT.supabase.co, which answers only over IPv6. '
      + 'GitHub runners and most CI have no IPv6 route and cannot reach it at all. Use the '
      + 'pooler host instead.',
    );
  }
  if (opts.keepRole && onPooler && port === '6543') {
    notes.push(
      'Transaction mode returns the connection at every commit, so it cannot run migrations. '
      + 'CAIRN_DIRECT_URL wants the session pooler, on port 5432.',
    );
  }
  if (!opts.keepRole && onPooler && port === '5432') {
    notes.push(
      'Session mode holds a connection open between requests, which a serverless runtime will '
      + 'exhaust. CAIRN_DATABASE_URL wants the transaction pooler, on port 6543.',
    );
  }
  if (!opts.keepRole && port === '6543' && !parsed.searchParams.has('pgbouncer')) {
    parsed.searchParams.set('pgbouncer', 'true');
    notes.push('Added pgbouncer=true, which the transaction pooler expects.');
  }

  const url = parsed.toString();
  const masked = url.replace(encodeURIComponent(password), '*'.repeat(8));

  return { url, masked, user, host: parsed.hostname, port, notes };
}

async function verify(url: string, keepRole: boolean): Promise<void> {
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });
  try {
    const [row] = await sql<{ who: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      select current_user as who, rolsuper, rolbypassrls
        from pg_roles where rolname = current_user`;

    if (!row) throw new Error('Connected, but could not read the current role.');
    console.log(`\nConnected as ${row.who}.`);

    if (!keepRole && (row.rolsuper || row.rolbypassrls)) {
      throw new Error(
        `${row.who} can bypass row level security. Every privacy and authorship policy in `
        + 'Cairn would be ignored, silently. The app refuses to serve over this connection.',
      );
    }
    console.log(
      keepRole
        ? 'This is the owner connection, so bypassing row level security is expected and correct '
          + 'here. It must never be the value of CAIRN_DATABASE_URL.'
        : 'It cannot bypass row level security, which is what the app requires.',
    );

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
  const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const shouldVerify = flags.has('--verify');
  const keepRole = flags.has('--direct');
  const [source, password] = args;

  if (!source || !password) {
    console.error(
      'Usage:\n'
      + '  npx tsx scripts/db-url.ts "<session pooler url>" "<database password>" --direct\n'
      + '      builds CAIRN_DIRECT_URL, keeping the owner role, for migrations\n\n'
      + '  npx tsx scripts/db-url.ts "<transaction pooler url>" "<app password>"\n'
      + '      builds CAIRN_DATABASE_URL, as cairn_app, for the running app\n\n'
      + 'Both urls come from Connect in the Supabase dashboard, with [YOUR-PASSWORD] left\n'
      + 'exactly as it is. Add --verify to connect and check what the string reaches.',
    );
    process.exit(1);
  }

  const built = buildUrl(source, password, { keepRole });

  console.log(`\n${keepRole ? 'CAIRN_DIRECT_URL' : 'CAIRN_DATABASE_URL'}`);
  console.log(built.url);
  console.log(`\n  role  ${built.user}`);
  console.log(`  host  ${built.host}`);
  console.log(`  port  ${built.port}`);
  for (const note of built.notes) console.log(`\n  note  ${note}`);

  if (shouldVerify) await verify(built.url, keepRole);
  else console.log('\nAdd --verify to connect and check the role before you paste this anywhere.');
}

if (process.argv[1]?.endsWith('db-url.ts')) {
  main().catch((e) => {
    const which = process.argv.includes('--direct') ? 'DIRECT_URL' : 'DATABASE_URL';
    console.error(`\n${explainConnectionError(e, which)}`);
    process.exit(1);
  });
}
