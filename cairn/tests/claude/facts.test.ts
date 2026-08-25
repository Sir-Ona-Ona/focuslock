import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { forReview } from '@/lib/rules/for-review';
import { renderFacts } from '@/lib/claude/assemble';
import { priceUsd, MODEL } from '@/lib/claude/client';
import type { Tx } from '@/lib/db/client';

/**
 * The facts bundle and the cost record, against a real database.
 *
 * Phase 4 accepts when a facilitated review produces the same numbers as the
 * rules engine, because it was given them. These assert the handoff: what the
 * engine computes is what the prompt carries.
 */
const ownerUrl = process.env.DIRECT_URL;
const appUrl = process.env.DATABASE_URL;
const suite = ownerUrl && appUrl ? describe : describe.skip;

suite('the facts a review is handed', () => {
  let owner: postgres.Sql;
  let app: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const ids = { household: '', member: '', track: '', joint: '', session: '', methodVersion: '' };

  const withMember = <T>(memberId: string, fn: (tx: Tx) => Promise<T>) =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.member_id', ${memberId}, true)`);
      return fn(tx as Tx);
    });

  beforeAll(async () => {
    owner = postgres(ownerUrl!, { max: 1, onnotice: () => {} });
    app = postgres(appUrl!, { max: 1, onnotice: () => {} });
    db = drizzle(app, { schema });

    const [{ member_id }] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        gen_random_uuid(), 'Facts fixture', 'One', 'Two', 'two@example.test') as member_id`;
    ids.member = member_id;

    const [m] = await owner<{ household_id: string }[]>`
      select household_id from member where id = ${member_id}`;
    ids.household = m.household_id;

    const rows = await owner<{ id: string; kind: string; owner_member_id: string | null }[]>`
      select id, kind, owner_member_id from track where household_id = ${ids.household}`;
    ids.track = rows.find((r) => r.owner_member_id === ids.member)!.id;
    ids.joint = rows.find((r) => r.kind === 'joint')!.id;

    const [ms] = await owner<{ id: string }[]>`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date, status)
      values (${ids.track}, 'CAR', 'M-1-CAR-01', 'Ship the thing', '2027-01-01',
              '2026-09-01', 'at_risk')
      returning id`;
    await owner`
      insert into milestone_move (milestone_id, from_date, to_date) values
        (${ms.id}, '2026-09-01', '2026-11-01'),
        (${ms.id}, '2026-11-01', '2027-01-01')`;

    await owner`
      insert into assumption (track_id, domain_code, ref, statement, confidence, test_by,
                              carried_review_count)
      values (${ids.track}, 'REL', 'A-REL-01', 'The route stays open', 'medium',
              current_date - 30, 3)`;

    await owner`insert into capacity (track_id, ceiling_hours_per_week) values (${ids.track}, 40)`;
    await owner`
      insert into domain_load (track_id, domain_code, hours_per_week)
      values (${ids.track}, 'CAR', 46)`;

    const [v] = await owner<{ id: string }[]>`
      select id from method_version where household_id is null and active`;
    ids.methodVersion = v.id;

    const [s] = await owner<{ id: string }[]>`
      insert into session_row
        (household_id, kind, mode, method_version_id, actor_member_ids, planned_minutes)
      values (${ids.household}, 'review', 'individual', ${v.id},
              array[${ids.member}]::uuid[], 30)
      returning id`;
    ids.session = s.id;
  });

  afterAll(async () => {
    if (!owner) return;
    const h = ids.household;
    await owner`delete from model_call where household_id = ${h}`;
    await owner`delete from session_row where household_id = ${h}`;
    await owner`delete from domain_load where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from capacity where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from assumption where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from milestone_move where milestone_id in
      (select id from milestone where track_id in (select id from track where household_id = ${h}))`;
    await owner`delete from milestone where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from track where household_id = ${h}`;
    await owner`delete from member where household_id = ${h}`;
    await owner`delete from household where id = ${h}`;
    await owner.end();
    await app.end();
  });

  it('computes the bundle from the engine, not from the model', async () => {
    const facts = await withMember(ids.member, (tx) =>
      forReview(tx, { mode: 'individual', memberId: ids.member, householdId: ids.household }));

    expect(facts.counts.milestonesInScope).toBe(1);
    expect(facts.counts.atRisk).toBe(1);
    expect(facts.slippage).toHaveLength(1);
    expect(facts.slippage[0].moveCount).toBe(2);
    expect(facts.slippage[0].originalTargetDate).toBe('2026-09-01');
    expect(facts.expiredAssumptions).toHaveLength(1);
    expect(facts.expiredAssumptions[0].isHope).toBe(true);
    expect(facts.load[0].gap).toBe(6);
    expect(facts.load[0].overCeiling).toBe(true);
  });

  it('reads its thresholds and its timebox from the method, not from literals', async () => {
    const facts = await withMember(ids.member, (tx) =>
      forReview(tx, { mode: 'individual', memberId: ids.member, householdId: ids.household }));

    expect(facts.thresholds.slippageMoves).toBe(3);
    expect(facts.thresholds.proposedCycles).toBe(2);
    expect(facts.timeboxMinutes).toBe(30);
    expect(facts.domains.map((d) => d.code)).toEqual(
      ['FTH', 'FAM', 'FIN', 'CAR', 'REL', 'LRN', 'HLT'],
    );
  });

  it('renders every engine number into the block the prompt carries', async () => {
    const facts = await withMember(ids.member, (tx) =>
      forReview(tx, { mode: 'individual', memberId: ids.member, householdId: ids.household }));
    const rendered = renderFacts(facts);

    expect(rendered).toContain('M-1-CAR-01');
    expect(rendered).toContain('moved 2 times');
    expect(rendered).toContain('originally 2026-09-01');
    expect(rendered).toContain('A-REL-01');
    expect(rendered).toContain('hope, not an assumption');
    expect(rendered).toContain('demand 46 h/wk against a ceiling of 40');
  });

  it('excludes another member\'s private items from the bundle by scope', async () => {
    const [other] = await owner<{ id: string }[]>`
      select id from member where household_id = ${ids.household} and principal_slot = 2`;
    const [otherTrack] = await owner<{ id: string }[]>`
      select id from track where owner_member_id = ${other.id}`;
    await owner`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date, status, is_private)
      values (${otherTrack.id}, 'HLT', 'M-2-HLT-01', 'Theirs alone', '2027-02-01',
              '2027-02-01', 'at_risk', true)`;

    const facts = await withMember(ids.member, (tx) =>
      forReview(tx, { mode: 'individual', memberId: ids.member, householdId: ids.household }));
    const rendered = renderFacts(facts);

    // Reviews never load private items, and the exclusion is by scope rather
    // than by any caller remembering to filter.
    expect(rendered).not.toContain('M-2-HLT-01');
    expect(rendered).not.toContain('Theirs alone');
  });

  it('records what a call cost, priced from the stored rate card', async () => {
    const usage = {
      input_tokens: 20_000,
      output_tokens: 2_000,
      cache_read_input_tokens: 100_000,
      cache_creation_input_tokens: 0,
    };
    const cost = priceUsd(MODEL, usage);
    // 20k input at $5, 2k output at $25, 100k cache reads at $0.50 per million.
    expect(cost).toBeCloseTo(0.1 + 0.05 + 0.05, 6);

    await withMember(ids.member, (tx) => tx.execute(sql`
      insert into model_call
        (household_id, member_id, session_id, flow, model, method_version_id,
         input_tokens, output_tokens, cache_read_input_tokens, cost_usd)
      values (${ids.household}, ${ids.member}, ${ids.session}, 'review', ${MODEL},
              ${ids.methodVersion}, ${usage.input_tokens}, ${usage.output_tokens},
              ${usage.cache_read_input_tokens}, ${cost})`));

    const rows = await withMember(ids.member, (tx) => tx.execute(sql`
      select flow, calls, cost_usd from v_model_cost_month`)) as unknown as
      Array<{ flow: string; calls: number; cost_usd: string }>;

    expect(rows).toHaveLength(1);
    expect(rows[0].flow).toBe('review');
    expect(Number(rows[0].cost_usd)).toBeCloseTo(0.2, 6);
  });

  it('shows one household nothing of another household\'s cost', async () => {
    const [{ member_id }] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        gen_random_uuid(), 'Another household', 'Them', 'Theirs',
        'theirs@example.test') as member_id`;

    const rows = await withMember(member_id, (tx) => tx.execute(sql`
      select count(*)::int as n from model_call`)) as unknown as Array<{ n: number }>;
    expect(rows[0].n).toBe(0);

    const [h] = await owner<{ household_id: string }[]>`
      select household_id from member where id = ${member_id}`;
    await owner`delete from track where household_id = ${h.household_id}`;
    await owner`delete from member where household_id = ${h.household_id}`;
    await owner`delete from household where id = ${h.household_id}`;
  });
});
