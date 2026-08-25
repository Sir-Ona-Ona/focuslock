import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Sql } from 'postgres';
import { CANONICAL_LABEL, CANONICAL_NOTE, PROMPT_KEYS, PROMPT_RATIONALE, SETTINGS } from './settings';
import { FINDING_RULES } from './finding-rules';

/**
 * Writes the canonical method: household_id null, version 1, active.
 * A household forks this rather than editing it, so the canonical values stay
 * available as the default every setting diffs against.
 *
 * Idempotent: re-running updates values and rationales in place, which is how a
 * change to the shipped method reaches households that have not forked it.
 */
export async function seedCanonicalMethod(sql: Sql): Promise<void> {
  const [version] = await sql<{ id: string }[]>`
    insert into method_version (household_id, version, label, note, active)
    values (null, 1, ${CANONICAL_LABEL}, ${CANONICAL_NOTE}, true)
    on conflict do nothing
    returning id`;

  const versionId = version?.id ?? (
    await sql<{ id: string }[]>`
      select id from method_version where household_id is null and version = 1`
  )[0]?.id;

  if (!versionId) throw new Error('Could not resolve the canonical method version.');

  for (const s of SETTINGS) {
    // postgres.js reads the ::jsonb cast and serialises the value itself, so a
    // pre-stringified value would arrive double encoded, as a JSON string
    // holding JSON rather than as the object.
    const value = sql.json(s.value as never);
    await sql`
      insert into method_setting
        (method_version_id, key, value, default_value, tier, protects, rationale)
      values (${versionId}, ${s.key}, ${value}, ${value},
              ${s.tier}, ${s.protects ?? null}, ${s.rationale})
      on conflict (method_version_id, key) do update
        set value = excluded.value,
            default_value = excluded.default_value,
            tier = excluded.tier,
            protects = excluded.protects,
            rationale = excluded.rationale`;
  }

  const dir = join(process.cwd(), 'lib/method/seed/prompts');
  for (const p of PROMPT_KEYS) {
    const body = sql.json(readFileSync(join(dir, p.file), 'utf8') as never);
    await sql`
      insert into method_setting
        (method_version_id, key, value, default_value, tier, protects, rationale)
      values (${versionId}, ${p.key}, ${body}, ${body},
              'solo', null, ${`${PROMPT_RATIONALE} Source: ${p.source}.`})
      on conflict (method_version_id, key) do update
        set value = excluded.value,
            default_value = excluded.default_value,
            rationale = excluded.rationale`;
  }

  for (const r of FINDING_RULES) {
    // An empty JS array does not serialise to an empty Postgres array, so the
    // literal is built here rather than left to the driver.
    const excluded = `{${r.domainsExcluded.join(',')}}`;
    await sql`
      insert into finding_rule
        (code, kind, title, bar, window_days, min_history_days, domains_excluded, enabled)
      values (${r.code}, ${r.kind}, ${r.title}, ${sql.json(r.bar as never)},
              ${r.windowDays}, ${r.minHistoryDays},
              ${excluded}::domain_code[], ${r.enabled})
      on conflict (code) do update
        set kind = excluded.kind,
            title = excluded.title,
            bar = excluded.bar,
            window_days = excluded.window_days,
            min_history_days = excluded.min_history_days,
            domains_excluded = excluded.domains_excluded,
            enabled = excluded.enabled`;
  }
}
