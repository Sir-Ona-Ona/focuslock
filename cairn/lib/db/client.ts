import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __cairnSql: ReturnType<typeof postgres> | undefined;
}

function connection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add the Supabase pooled connection string to the environment.',
    );
  }
  globalThis.__cairnSql ??= postgres(url, { prepare: false, max: 5 });
  return globalThis.__cairnSql;
}

/**
 * Reports whether this connection can ignore row level security.
 *
 * A superuser, or a role with BYPASSRLS, makes every policy in this schema
 * decorative, and it fails silently: the policies still exist, they are simply
 * never consulted. The result is a deployment that looks healthy, serves signed
 * out pages perfectly, and hands one member another member's private items the
 * moment somebody signs in.
 *
 * So it is checked in two places. The shell calls this before rendering, so a
 * misconfigured DATABASE_URL is reported on screen rather than discovered later.
 * withMember() throws on the same condition, so no request path can slip past
 * by not going through the shell.
 */
let scopeCheck: Promise<string | null> | undefined;

export function scopeProblem(): Promise<string | null> {
  scopeCheck ??= (async () => {
    try {
      const rows = (await db().execute(sql`
        select current_user as role, rolsuper, rolbypassrls
          from pg_roles where rolname = current_user`)) as unknown as
        Array<{ role: string; rolsuper: boolean; rolbypassrls: boolean }>;

      const row = rows[0];
      if (!row) return null;
      if (row.rolsuper || row.rolbypassrls) {
        return `DATABASE_URL connects as ${row.role}, which bypasses row level security. `
          + 'Every privacy and authorship policy in Cairn would be ignored, silently. '
          + 'Connect as the cairn_app role instead, and keep the owner connection for '
          + 'DIRECT_URL, which is used by migrations only.';
      }
      return null;
    } catch (e) {
      // A database that cannot be reached is a different problem, reported by
      // whatever tries to use it. This check does not invent a diagnosis.
      return e instanceof Error && e.message.includes('DATABASE_URL')
        ? e.message
        : null;
    }
  })();
  return scopeCheck;
}

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

let cached: Db | undefined;
export function db(): Db {
  cached ??= drizzle(connection(), { schema });
  return cached;
}

/**
 * The only database entry point in a request path.
 *
 * Sets app.member_id for the life of one transaction, which is what every RLS
 * policy reads. Work done outside this helper runs with no scope set, and every
 * policy evaluates to false, which is the intended failure: the GUC is the
 * gate rather than a convention someone remembered to follow.
 */
export async function withMember<T>(
  memberId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const problem = await scopeProblem();
  if (problem) throw new Error(problem);
  return db().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.member_id', ${memberId}, true)`);
    return fn(tx);
  });
}

/**
 * A uuid array literal for `= any(...)`.
 *
 * Drizzle flattens a JS array bound as one parameter into separate parameters,
 * so `any(${ids}::uuid[])` silently becomes a scalar cast the moment the list
 * holds exactly one id, which is the ordinary case for one track. Building the
 * literal makes the shape explicit.
 */
export function uuidList(ids: readonly string[]) {
  return typedList(ids, 'uuid');
}

/** The same shape for text, used for domain codes. */
export function textList(values: readonly string[]) {
  return typedList(values, 'text');
}

function typedList(values: readonly string[], type: 'uuid' | 'text') {
  const cast = sql.raw(`::${type}[]`);
  if (values.length === 0) return sql`array[]${cast}`;
  return sql`array[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]${cast}`;
}

export { schema };
