import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { slippage } from '@/lib/rules/slippage';
import { rollovers } from '@/lib/rules/rollover';
import { proposedCycles } from '@/lib/rules/agreement';
import { openAssumptions } from '@/lib/rules/assumptions';
import { loadAudit } from '@/lib/rules/load';
import { moneyAudit } from '@/lib/rules/money';
import type { Tx } from '@/lib/db/client';

/**
 * The rules suite, with fixtures at the boundary of each bar: two moves and
 * three, two rollovers and three, one proposed cycle and two, an assumption
 * either side of its test date, a load gap of zero and of one hour.
 *
 * These run against a real database because the rules are SQL. A mocked rules
 * test asserts that the fixture matches the fixture.
 */
const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DIRECT_URL;
const suite = appUrl && ownerUrl ? describe : describe.skip;

suite('the rules engine', () => {
  let owner: postgres.Sql;
  let app: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  const ids = {
    household: '', a: '', b: '', trackA: '', trackB: '', joint: '',
    movedTwice: '', movedThrice: '', proposedOne: '', proposedTwo: '',
  };

  const withMember = <T>(memberId: string, fn: (tx: Tx) => Promise<T>) =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.member_id', ${memberId}, true)`);
      return fn(tx as Tx);
    });

  async function milestone(
    trackId: string, ref: string, domain: string, target: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const [row] = await owner<{ id: string }[]>`
      insert into milestone ${owner({
        track_id: trackId, domain_code: domain, ref, title: ref,
        target_date: target, original_target_date: target,
        status: 'on_track', ...extra,
      })} returning id`;
    return row.id;
  }

  /** Moves a target the way the app does: the move row and the new date together. */
  async function move(milestoneId: string, from: string, to: string) {
    await owner`
      insert into milestone_move (milestone_id, from_date, to_date)
      values (${milestoneId}, ${from}, ${to})`;
    await owner`update milestone set target_date = ${to} where id = ${milestoneId}`;
  }

  beforeAll(async () => {
    owner = postgres(ownerUrl!, { max: 1, onnotice: () => {} });
    app = postgres(appUrl!, { max: 1, onnotice: () => {} });
    db = drizzle(app, { schema });

    const [h] = await owner<{ id: string }[]>`
      insert into household (name, reporting_currency) values ('Rules fixture', 'NGN')
      returning id`;
    ids.household = h.id;

    const [a] = await owner<{ id: string }[]>`
      insert into member (household_id, display_name, role, seat_no, principal_slot)
      values (${h.id}, 'One', 'principal', 1, 1) returning id`;
    const [b] = await owner<{ id: string }[]>`
      insert into member (household_id, display_name, role, seat_no, principal_slot)
      values (${h.id}, 'Two', 'principal', 2, 2) returning id`;
    ids.a = a.id;
    ids.b = b.id;

    const [ta] = await owner<{ id: string }[]>`
      insert into track (household_id, kind, owner_member_id)
      values (${h.id}, 'individual', ${a.id}) returning id`;
    const [tb] = await owner<{ id: string }[]>`
      insert into track (household_id, kind, owner_member_id)
      values (${h.id}, 'individual', ${b.id}) returning id`;
    const [tj] = await owner<{ id: string }[]>`
      insert into track (household_id, kind) values (${h.id}, 'joint') returning id`;
    ids.trackA = ta.id;
    ids.trackB = tb.id;
    ids.joint = tj.id;

    // Slippage: one at two moves, one at three.
    ids.movedTwice = await milestone(ta.id, 'M-1-CAR-01', 'CAR', '2027-01-01');
    await move(ids.movedTwice, '2027-01-01', '2027-02-01');
    await move(ids.movedTwice, '2027-02-01', '2027-03-01');

    ids.movedThrice = await milestone(ta.id, 'M-1-CAR-02', 'CAR', '2027-01-01');
    await move(ids.movedThrice, '2027-01-01', '2027-03-01');
    await move(ids.movedThrice, '2027-03-01', '2027-05-01');
    await move(ids.movedThrice, '2027-05-01', '2027-06-01');

    // One that never moved, which must not appear.
    await milestone(ta.id, 'M-1-FIN-01', 'FIN', '2027-09-01');

    // Joint proposals, one that has survived a single joint review and one two.
    ids.proposedOne = await milestone(tj.id, 'M-J-FAM-01', 'FAM', '2027-04-01', {
      status: null, agreement: 'proposed', proposed_by_member_id: a.id,
    });
    ids.proposedTwo = await milestone(tj.id, 'M-J-REL-01', 'REL', '2027-08-01', {
      status: null, agreement: 'proposed', proposed_by_member_id: a.id,
    });

    const [method] = await owner<{ id: string }[]>`
      select id from method_version where household_id is null and active`;

    await owner`update milestone set updated_at = now() - interval '60 days'
                 where id = ${ids.proposedTwo}`;
    await owner`update milestone set updated_at = now() - interval '60 days'
                 where id = ${ids.proposedOne}`;

    // Two joint reviews since proposedTwo was last touched, one since proposedOne.
    await owner`
      insert into session_row
        (household_id, kind, mode, method_version_id, actor_member_ids, planned_minutes, started_at)
      values
        (${h.id}, 'review', 'joint', ${method.id}, array[${a.id}, ${b.id}]::uuid[], 45,
         now() - interval '30 days'),
        (${h.id}, 'review', 'joint', ${method.id}, array[${a.id}, ${b.id}]::uuid[], 45,
         now() - interval '10 days')`;
    await owner`update milestone set updated_at = now() - interval '20 days'
                 where id = ${ids.proposedOne}`;

    // Rollovers: a chain of three, and a chain of two.
    const chain = async (depth: number, label: string) => {
      let prev: string | null = null;
      for (let i = 0; i < depth; i += 1) {
        const [row]: { id: string }[] = await owner<{ id: string }[]>`
          insert into commitment
            (household_id, text, owner_member_id, due_date, status, rolled_from_commitment_id)
          values (${h.id}, ${`${label} ${i}`}, ${a.id}, '2027-01-01',
                  ${i === depth - 1 ? 'open' : 'rolled'}, ${prev})
          returning id`;
        prev = row.id;
      }
    };
    await chain(3, 'carried three');
    await chain(2, 'carried two');

    // Assumptions: one a day past its test date, one a day short of it.
    await owner`
      insert into assumption (track_id, domain_code, ref, statement, confidence, test_by)
      values
        (${ta.id}, 'REL', 'A-REL-01', 'Expired yesterday', 'medium', current_date - 1),
        (${ta.id}, 'REL', 'A-REL-02', 'Not due until tomorrow', 'medium', current_date + 1)`;

    // Hours: a ceiling of 40 against a demand of 41, so the gap is exactly one.
    await owner`
      insert into capacity (track_id, ceiling_hours_per_week) values (${ta.id}, 40)`;
    await owner`
      insert into domain_load (track_id, domain_code, hours_per_week) values
        (${ta.id}, 'CAR', 21), (${ta.id}, 'LRN', 20)`;
    // And a ceiling met exactly, which must not be a finding.
    await owner`
      insert into capacity (track_id, ceiling_hours_per_week) values (${tb.id}, 10)`;
    await owner`
      insert into domain_load (track_id, domain_code, hours_per_week) values (${tb.id}, 'HLT', 10)`;

    // Money: a month where a one off lands on top of the recurring load.
    await owner`
      insert into income (track_id, label, kind, amount_monthly, currency, confidence, starts_on)
      values (${ta.id}, 'Salary', 'salary', 1000, 'NGN', 'high', current_date)`;
    await owner`
      insert into obligation
        (track_id, domain_code, label, kind, amount, currency, starts_on, committed)
      values
        (${ta.id}, 'FIN', 'Rent', 'recurring', 400, 'NGN', current_date, true),
        (${ta.id}, 'FIN', 'Deposit', 'one_off', 5000, 'NGN',
         date_trunc('month', current_date) + interval '3 months', true)`;
    await owner`
      insert into income (track_id, label, kind, amount_monthly, currency, confidence,
                          starts_on, is_assumed)
      values (${ta.id}, 'A role nobody is building', 'salary', 900, 'NGN', 'low',
              current_date, true)`;
  });

  afterAll(async () => {
    if (!owner) return;
    const h = ids.household;
    await owner`delete from milestone_move where milestone_id in
      (select id from milestone where track_id in (select id from track where household_id = ${h}))`;
    await owner`delete from obligation where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from income where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from domain_load where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from capacity where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from assumption where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from commitment where household_id = ${h}`;
    await owner`delete from session_row where household_id = ${h}`;
    await owner`delete from milestone where track_id in (select id from track where household_id = ${h})`;
    await owner`delete from track where household_id = ${h}`;
    await owner`delete from member where household_id = ${h}`;
    await owner`delete from household where id = ${h}`;
    await owner.end();
    await app.end();
  });

  it('surfaces a milestone at two moves and marks the goal question at three', async () => {
    const rows = await withMember(ids.a, (tx) => slippage(tx));
    const two = rows.find((r) => r.id === ids.movedTwice);
    const three = rows.find((r) => r.id === ids.movedThrice);

    expect(two?.moveCount).toBe(2);
    expect(two?.needsGoalReexamined).toBe(false);
    expect(three?.moveCount).toBe(3);
    expect(three?.needsGoalReexamined).toBe(true);

    // A milestone that never moved is not slippage.
    expect(rows.some((r) => r.ref === 'M-1-FIN-01')).toBe(false);
  });

  it('keeps the original date and the whole history, not just the current date', async () => {
    const rows = await withMember(ids.a, (tx) => slippage(tx));
    const three = rows.find((r) => r.id === ids.movedThrice);
    expect(three?.originalTargetDate).toBe('2027-01-01');
    expect(three?.moveHistory).toEqual(['2027-03-01', '2027-05-01', '2027-06-01']);
  });

  it('walks the rollover chain and fires at three, not at two', async () => {
    const rows = await withMember(ids.a, (tx) => rollovers(tx));
    expect(rows).toHaveLength(1);
    expect(rows[0].rolloverCount).toBe(3);
    expect(rows[0].atLimit).toBe(true);
  });

  it('forces a joint item at two cycles and not at one', async () => {
    const rows = await withMember(ids.a, (tx) => proposedCycles(tx, ids.household));
    const one = rows.find((r) => r.id === ids.proposedOne);
    const two = rows.find((r) => r.id === ids.proposedTwo);

    expect(one?.cyclesProposed).toBe(1);
    expect(one?.forced).toBe(false);
    expect(two?.cyclesProposed).toBe(2);
    expect(two?.forced).toBe(true);
  });

  it('surfaces an assumption a day past its test date and not one a day short', async () => {
    const rows = await withMember(ids.a, (tx) => openAssumptions(tx, { trackIds: [ids.trackA] }));
    expect(rows.map((r) => r.ref)).toContain('A-REL-01');
    expect(rows.map((r) => r.ref)).not.toContain('A-REL-02');
  });

  it('reports a load gap of one hour and no gap when the ceiling is met exactly', async () => {
    const rows = await withMember(ids.a, (tx) => loadAudit(tx));
    const over = rows.find((r) => r.trackId === ids.trackA);
    const exact = rows.find((r) => r.trackId === ids.trackB);

    expect(over?.gap).toBe(1);
    expect(over?.overCeiling).toBe(true);
    expect(exact?.gap).toBe(0);
    expect(exact?.overCeiling).toBe(false);
  });

  it('names the shortfall month with what lands, what comes in, and the gap', async () => {
    const audit = await withMember(ids.a, (tx) => moneyAudit(tx, { trackIds: [ids.trackA] }));
    expect(audit.peak).not.toBeNull();

    // 400 recurring plus a 5000 one off against 1000 of income.
    expect(audit.peak?.outflow).toBe(5400);
    expect(audit.peak?.income).toBe(1000);
    expect(audit.peak?.shortfall).toBe(4400);
    expect(audit.peak?.committedShortfall).toBe(true);

    // The months that do cover are not reported as shortfalls.
    const ordinary = audit.months.find((m) => m.month !== audit.peak?.month);
    expect(ordinary?.shortfall).toBeLessThan(0);
  });

  it('never counts assumed income as cover', async () => {
    // The fixture assumes a 900 a month role nobody is building. Counting it
    // would hide the shortfall behind the very thing causing it.
    const audit = await withMember(ids.a, (tx) => moneyAudit(tx, { trackIds: [ids.trackA] }));
    const month = audit.months[0];
    expect(month.income).toBe(1000);
    expect(month.assumedIncome).toBe(900);
    expect(audit.peak?.shortfall).toBe(4400);
  });

  it('finds income the plan needs that no milestone is building', async () => {
    const audit = await withMember(ids.a, (tx) => moneyAudit(tx, { trackIds: [ids.trackA] }));
    expect(audit.assumedIncomeWithoutBuilder).toHaveLength(1);
    expect(audit.assumedIncomeWithoutBuilder[0].label).toBe('A role nobody is building');
  });
});
