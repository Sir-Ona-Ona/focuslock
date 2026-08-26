/**
 * Applies every SQL file in lib/db/migrations in name order, then seeds the
 * canonical method. Runs against DIRECT_URL with the service role, which is one
 * of exactly two places that connection is allowed to appear.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { seedCanonicalMethod } from '../lib/method/seed';
import { explainConnectionError } from './connection-error';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DIRECT_URL (or DATABASE_URL) before running migrations.');
  process.exit(1);
}

const dir = join(process.cwd(), 'lib/db/migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  await sql`create table if not exists _cairn_migration (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const done = new Set(
    (await sql<{ name: string }[]>`select name from _cairn_migration`).map((r) => r.name),
  );

  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip  ${file}`);
      continue;
    }
    const body = readFileSync(join(dir, file), 'utf8');
    process.stdout.write(`apply ${file} ... `);
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into _cairn_migration (name) values (${file})`;
    });
    console.log('ok');
  }

  await seedCanonicalMethod(sql);
  console.log('method seeded');
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(`\n${explainConnectionError(err, 'DIRECT_URL')}`);
    await sql.end().catch(() => {});
    process.exit(1);
  });
