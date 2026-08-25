import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import {
  assumptionsFor, collisions, constraintsFor, goals, members, milestones,
  pendingFor, privateCounts, risksFor, tracks,
} from '@/lib/plan/read';
import { method } from '@/lib/method/accessor';
import type { Tx } from '@/lib/db/client';

/**
 * Every query a screen runs, against a real database.
 *
 * These are the paths that fail in production rather than in a type check: a
 * cast that only breaks on one row, an aggregate that comes back as a string,
 * an array binding that works for two tracks and not for one.
 */
const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DIRECT_URL;
const suite = appUrl && ownerUrl ? describe : describe.skip;

suite('the queries behind the screens', () => {
  let owner: postgres.Sql;
  let app: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const ids = { household: '', a: '', b: '', trackA: '', trackB: '', joint: '' };

  const withMember = <T>(memberId: string, fn: (tx: Tx) => Promise<T>) =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.member_id', ${memberId}, true)`);
      return fn(tx as Tx);
    });

  beforeAll(async () => {
    owner = postgres(ownerUrl!, { max: 1, onnotice: () => {} });
    app = postgres(appUrl!, { max: 1, onnotice: () => {} });
    db = drizzle(app, { schema });

    // Built through the bootstrap function, which is how a real household starts.
    const [{ member_id }] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        gen_random_uuid(), 'Screens fixture', 'One', 'Two', 'two@example.test') as member_id`;
    ids.a = member_id;

    const [m] = await owner<{ household_id: string }[]>`
      select household_id from member where id = ${member_id}`;
    ids.household = m.household_id;

    const [b] = await owner<{ id: string }[]>`
      select id from member where household_id = ${ids.household} and principal_slot = 2`;
    ids.b = b.id;

    const trackRows = await owner<{ id: string; kind: string; owner_member_id: string | null }[]>`
      select id, kind, owner_member_id from track where household_id = ${ids.household}`;
    ids.trackA = trackRows.find((t) => t.owner_member_id === ids.a)!.id;
    ids.trackB = trackRows.find((t) => t.owner_member_id === ids.b)!.id;
    ids.joint = trackRows.find((t) => t.kind === 'joint')!.id;

    await owner`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date, status)
      values (${ids.trackA}, 'CAR', 'M-1-CAR-01', 'Only milestone', '2027-03-01',
              '2027-01-01', 'at_risk')`;
    const [ms] = await owner<{ id: string }[]>`
      select id from milestone where track_id = ${ids.trackA}`;
    await owner`
      insert into milestone_move (milestone_id, from_date, to_date)
      values (${ms.id}, '2027-01-01', '2027-03-01')`;

    await owner`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date, status, is_private)
      values (${ids.trackB}, 'HLT', 'M-2-HLT-01', 'Theirs alone', '2027-05-01',
              '2027-05-01', 'on_track', true)`;

    await owner`
      insert into goal (track_id, domain_code, text) values (${ids.trackA}, 'CAR', 'A goal')`;
    await owner`
      insert into assumption (track_id, domain_code, ref, statement, confidence, test_by)
      values (${ids.trackA}, 'CAR', 'A-CAR-01', 'An assumption', 'medium', '2027-02-01')`;
    await owner`
      insert into risk (track_id, domain_code, ref, statement, likelihood, impact)
      values (${ids.trackA}, 'CAR', 'R-CAR-01', 'A risk', 'medium', 'high')`;
    await owner`
      insert into constraint_row (track_id, ref, statement, is_hard)
      values (${ids.trackA}, 'C-01', 'A hard constraint', true)`;
    await owner`
      insert into pending_item (track_id, raised_by_member_id, text)
      values (${ids.trackA}, ${ids.b}, 'Something raised for you')`;
    await owner`
      insert into collision (household_id, ref, tension, tracks, domains,
                             contested_from, contested_to)
      values (${ids.household}, 'X-01', 'Two things in the same year',
              array[${ids.trackA}]::uuid[], array['CAR','FIN']::domain_code[],
              '2027-01-01', '2027-12-01')`;
  });

  afterAll(async () => {
    if (!owner) return;
    const h = ids.household;
    for (const t of ['collision', 'pending_item', 'constraint_row', 'risk',
                     'assumption', 'goal']) {
      await owner.unsafe(
        t === 'collision'
          ? `delete from collision where household_id = '${h}'`
          : `delete from ${t} where track_id in (select id from track where household_id = '${h}')`,
      );
    }
    await owner`delete from milestone_move where milestone_id in
      (select id from milestone where track_id in (select id from track where household_id = ${h}))`;
    await owner`delete from milestone where track_id in
      (select id from track where household_id = ${h})`;
    await owner`delete from track where household_id = ${h}`;
    await owner`delete from member where household_id = ${h}`;
    await owner`delete from household where id = ${h}`;
    await owner.end();
    await app.end();
  });

  it('provisions two principals and three tracks', async () => {
    const [people, allTracks] = await withMember(ids.a, async (tx) =>
      [await members(tx), await tracks(tx)] as const);

    expect(people.filter((p) => p.role === 'principal')).toHaveLength(2);
    expect(allTracks).toHaveLength(3);
    expect(allTracks.filter((t) => t.kind === 'joint')).toHaveLength(1);
    // Cairn provisions a track; only its owner puts goals in it.
    expect(allTracks.every((t) => t.claimStatus === 'unclaimed')).toBe(true);
  });

  it('loads a single track, which is where a flattened array binding would break', async () => {
    const rows = await withMember(ids.a, (tx) => milestones(tx, [ids.trackA]));
    expect(rows).toHaveLength(1);
    expect(rows[0].ref).toBe('M-1-CAR-01');
  });

  it('returns move history as dates rather than a raw array literal', async () => {
    const [row] = await withMember(ids.a, (tx) => milestones(tx, [ids.trackA]));
    expect(Array.isArray(row.moveHistory)).toBe(true);
    expect(row.moveHistory).toEqual(['2027-03-01']);
    expect(row.originalTargetDate).toBe('2027-01-01');
  });

  it('shows another member their private item as a count and nothing else', async () => {
    const rows = await withMember(ids.a, (tx) => milestones(tx, [ids.trackB]));
    expect(rows).toHaveLength(0);

    const counts = await withMember(ids.a, async (tx) => {
      const m = await method(tx);
      return privateCounts(tx, ids.trackB, m.domainOrder());
    });
    expect(counts).toEqual({ HLT: 1 });
  });

  it('loads everything the track screen asks for', async () => {
    const loaded = await withMember(ids.a, async (tx) => ({
      goals: await goals(tx, ids.trackA),
      assumptions: await assumptionsFor(tx, ids.trackA),
      risks: await risksFor(tx, ids.trackA),
      constraints: await constraintsFor(tx, ids.trackA),
      pending: await pendingFor(tx, ids.trackA),
    }));

    expect(loaded.goals).toHaveLength(1);
    expect(loaded.assumptions).toHaveLength(1);
    expect(loaded.risks).toHaveLength(1);
    expect(loaded.constraints[0].isHard).toBe(true);
    expect(loaded.pending).toHaveLength(1);
  });

  it('loads collisions with their age and contested span', async () => {
    const rows = await withMember(ids.a, (tx) => collisions(tx));
    expect(rows).toHaveLength(1);
    expect(rows[0].domains).toEqual(['CAR', 'FIN']);
    expect(rows[0].contestedFrom).toBe('2027-01-01');
    expect(typeof rows[0].openDays).toBe('number');
  });

  it('resolves the method through the accessor, in the order it states', async () => {
    const m = await withMember(ids.a, (tx) => method(tx));
    expect(m.domains()).toHaveLength(7);
    expect(m.domains()[0].code).toBe('FTH');
    expect(m.domains()[6].code).toBe('HLT');
    expect(m.num('rules.slippage_moves')).toBe(3);
    expect(m.prompt('review').length).toBeGreaterThan(1000);
    expect(m.protections().length).toBeGreaterThan(0);
  });
});
