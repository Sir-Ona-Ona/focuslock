import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';

/**
 * The only way to read a method setting.
 *
 * Resolves the household's active version, falling back to the canonical method
 * Cairn ships for any key the household has not overridden. Cached per request,
 * because a single review reads a dozen settings and they must all come from the
 * same version.
 *
 * Every record written in a request stamps `versionId`. A review run in March
 * under one method is never reinterpreted under a method written in September.
 */

export interface DomainRow { code: string; short: string; name: string }
export interface SessionBlock {
  n: number; label: string; minutes: number; isBreak?: boolean;
}
export interface SettingRow {
  key: string;
  value: unknown;
  defaultValue: unknown;
  tier: 'solo' | 'two_key';
  protects: string | null;
  rationale: string;
  fromCanonical: boolean;
}

export class Method {
  constructor(
    readonly versionId: string,
    readonly version: number,
    readonly label: string,
    private readonly rows: Map<string, SettingRow>,
  ) {}

  /** Raw value for a key. Throws rather than guessing: a missing setting is a seed bug. */
  get<T>(key: string): T {
    const row = this.rows.get(key);
    if (!row) throw new Error(`Method setting ${key} is not seeded. Run the migration.`);
    return row.value as T;
  }

  num(key: string): number {
    const v = this.get<number>(key);
    if (typeof v !== 'number') throw new Error(`Method setting ${key} is not a number.`);
    return v;
  }

  bool(key: string): boolean {
    return this.get<boolean>(key) === true;
  }

  setting(key: string): SettingRow | undefined {
    return this.rows.get(key);
  }

  all(): SettingRow[] {
    return [...this.rows.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  /** Domains in the order the method states, which is an argument and not a convention. */
  domains(): DomainRow[] {
    const defs = this.get<DomainRow[]>('structure.domains');
    const order = this.get<string[]>('structure.domain_order');
    const byCode = new Map(defs.map((d) => [d.code, d]));
    return order.flatMap((code) => {
      const d = byCode.get(code);
      return d ? [d] : [];
    });
  }

  domainOrder(): string[] {
    return this.get<string[]>('structure.domain_order');
  }

  blocks(): SessionBlock[] {
    return this.get<SessionBlock[]>('session.joint.blocks');
  }

  prompt(name: 'interview' | 'review' | 'session' | 'brief' | 'advisor' | 'timeline'): string {
    return this.get<string>(`prompts.${name}`);
  }

  /** Settings whose change takes two keys, with what each protects. */
  protections(): SettingRow[] {
    return this.all().filter((s) => s.tier === 'two_key');
  }
}

interface RawRow {
  key: string;
  value: unknown;
  default_value: unknown;
  tier: 'solo' | 'two_key';
  protects: string | null;
  rationale: string;
  household_id: string | null;
  version: number;
  version_id: string;
  label: string;
}

const cache = new WeakMap<object, Promise<Method>>();

export function method(tx: Tx): Promise<Method> {
  const hit = cache.get(tx as unknown as object);
  if (hit) return hit;
  const p = load(tx);
  cache.set(tx as unknown as object, p);
  return p;
}

async function load(tx: Tx): Promise<Method> {
  const result = await tx.execute(sql`
    select s.key, s.value, s.default_value, s.tier, s.protects, s.rationale,
           v.household_id, v.version, v.id as version_id, v.label
      from method_setting s
      join method_version v on v.id = s.method_version_id
     where v.active
       and (v.household_id is null or v.household_id = app.household_id())
     order by (v.household_id is null)`);

  const rows = result as unknown as RawRow[];
  if (rows.length === 0) {
    throw new Error('No active method found. Run the migration to seed the canonical method.');
  }

  // Household rows sort first, so the first write of a key wins and canonical
  // values only fill the gaps a household has not overridden.
  const map = new Map<string, SettingRow>();
  let versionId = rows[0].version_id;
  let version = rows[0].version;
  let label = rows[0].label;

  for (const r of rows) {
    if (r.household_id !== null) {
      versionId = r.version_id;
      version = r.version;
      label = r.label;
    }
    if (map.has(r.key)) continue;
    map.set(r.key, {
      key: r.key,
      value: r.value,
      defaultValue: r.default_value,
      tier: r.tier,
      protects: r.protects,
      rationale: r.rationale,
      fromCanonical: r.household_id === null,
    });
  }

  return new Method(versionId, version, label, map);
}
