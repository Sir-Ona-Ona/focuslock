import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

/**
 * The RLS suite. Mandatory before phase 0 is accepted.
 *
 * Every policy is tested from both sides, as two real member scopes against a
 * real database rather than against mocks. Set DIRECT_URL (or DATABASE_URL) to
 * a database the migrations have been applied to and this runs; without one it
 * skips, because a mocked policy test proves nothing.
 *
 * Case 9 matters most: a query in a request path with no member scope set must
 * return nothing. That proves the session GUC is the gate rather than a
 * convention someone remembered to follow.
 */

// Two connections, because that is how the app runs. The fixture is written as
// the owner; every policy assertion runs as the role the app actually connects
// as, which cannot bypass a policy. Running the whole suite as the owner would
// pass on constraints and prove nothing about RLS.
const ownerUrl = process.env.DIRECT_URL;
const appUrl = process.env.DATABASE_URL;
const suite = ownerUrl && appUrl ? describe : describe.skip;

suite('row level security', () => {
  let sql: postgres.Sql;
  let app: postgres.Sql;
  const ids = {
    household: '', a: '', b: '', trackA: '', trackB: '', joint: '',
    privateMs: '', jointMs: '', collision: '',
  };

  /** Runs one statement inside a transaction scoped to a member, as the app does. */
  async function asMember<T>(memberId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
    return app.begin(async (tx) => {
      await tx`select set_config('app.member_id', ${memberId}, true)`;
      return fn(tx);
    });
  }

  beforeAll(async () => {
    sql = postgres(ownerUrl!, { max: 1, onnotice: () => {} });
    app = postgres(appUrl!, { max: 1, onnotice: () => {} });

    const [role] = await app<{ rolsuper: boolean; rolbypassrls: boolean }[]>`
      select rolsuper, rolbypassrls from pg_roles where rolname = current_user`;
    if (role?.rolsuper || role?.rolbypassrls) {
      throw new Error(
        'DATABASE_URL connects as a role that bypasses row level security, so this suite '
        + 'would pass without testing anything. Point it at the cairn_app role.',
      );
    }

    const [h] = await sql<{ id: string }[]>`
      insert into household (name) values ('RLS fixture') returning id`;
    ids.household = h.id;

    const [a] = await sql<{ id: string }[]>`
      insert into member (household_id, display_name, role, seat_no, principal_slot)
      values (${h.id}, 'Principal one', 'principal', 1, 1) returning id`;
    const [b] = await sql<{ id: string }[]>`
      insert into member (household_id, display_name, role, seat_no, principal_slot)
      values (${h.id}, 'Principal two', 'principal', 2, 2) returning id`;
    ids.a = a.id;
    ids.b = b.id;

    const [ta] = await sql<{ id: string }[]>`
      insert into track (household_id, kind, owner_member_id)
      values (${h.id}, 'individual', ${a.id}) returning id`;
    const [tb] = await sql<{ id: string }[]>`
      insert into track (household_id, kind, owner_member_id)
      values (${h.id}, 'individual', ${b.id}) returning id`;
    const [tj] = await sql<{ id: string }[]>`
      insert into track (household_id, kind) values (${h.id}, 'joint') returning id`;
    ids.trackA = ta.id;
    ids.trackB = tb.id;
    ids.joint = tj.id;

    const [priv] = await sql<{ id: string }[]>`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date, status, is_private)
      values (${tb.id}, 'CAR', 'M-2-CAR-01', 'Something private', '2027-06-01', '2027-06-01',
              'on_track', true)
      returning id`;
    ids.privateMs = priv.id;

    const [joint] = await sql<{ id: string }[]>`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date,
         agreement, proposed_by_member_id, last_authored_by_member_id)
      values (${tj.id}, 'FAM', 'M-J-FAM-01', 'A proposal', '2027-01-01', '2027-01-01',
              'proposed', ${a.id}, ${a.id})
      returning id`;
    ids.jointMs = joint.id;

    const [coll] = await sql<{ id: string }[]>`
      insert into collision
        (household_id, ref, tension, tracks, domains, derived_from_private, visible_to_member_id)
      values (${h.id}, 'X-01', 'Derived from a private item', array[${tb.id}]::uuid[],
              array['CAR']::domain_code[], true, ${b.id})
      returning id`;
    ids.collision = coll.id;
  });

  afterAll(async () => {
    if (!sql) return;
    await sql`delete from collision where household_id = ${ids.household}`;
    await sql`delete from milestone where track_id in
      (select id from track where household_id = ${ids.household})`;
    await sql`delete from track where household_id = ${ids.household}`;
    await sql`delete from member where household_id = ${ids.household}`;
    await sql`delete from household where id = ${ids.household}`;
    await sql.end();
    await app.end();
  });

  it('1. refuses an insert into another member\'s individual track', async () => {
    await expect(asMember(ids.a, (tx) => tx`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date, status)
      values (${ids.trackB}, 'CAR', 'M-2-CAR-99', 'Written for them', '2028-01-01',
              '2028-01-01', 'on_track')`)).rejects.toThrow();
  });

  it('2. refuses an update to a milestone on another member\'s track', async () => {
    const rows = await asMember(ids.a, (tx) => tx`
      update milestone set title = 'Edited by the wrong person'
       where track_id = ${ids.trackB} returning id`);
    expect(rows).toHaveLength(0);
  });

  it('3. hides a private milestone on another member\'s track', async () => {
    const rows = await asMember(ids.a, (tx) => tx`
      select id from milestone where id = ${ids.privateMs}`);
    expect(rows).toHaveLength(0);

    const own = await asMember(ids.b, (tx) => tx`
      select id from milestone where id = ${ids.privateMs}`);
    expect(own).toHaveLength(1);
  });

  it('4. refuses agreement of an item the actor proposed', async () => {
    await expect(asMember(ids.a, (tx) => tx`
      update milestone
         set agreement = 'agreed', agreed_by_member_id = ${ids.a},
             agreed_at = now(), status = 'on_track'
       where id = ${ids.jointMs}`)).rejects.toThrow();
  });

  it('4b. allows the other principal to agree it', async () => {
    const rows = await asMember(ids.b, (tx) => tx`
      update milestone
         set agreement = 'agreed', agreed_by_member_id = ${ids.b},
             agreed_at = now(), status = 'on_track'
       where id = ${ids.jointMs} returning id`);
    expect(rows).toHaveLength(1);

    // Put it back, so the ordering of the other cases does not matter.
    await sql`update milestone set agreement = 'proposed', agreed_by_member_id = null,
                    agreed_at = null, status = null where id = ${ids.jointMs}`;
  });

  it('8. hides a private-derived collision from the other member', async () => {
    const hidden = await asMember(ids.a, (tx) => tx`
      select id from collision where id = ${ids.collision}`);
    expect(hidden).toHaveLength(0);

    const owner = await asMember(ids.b, (tx) => tx`
      select id from collision where id = ${ids.collision}`);
    expect(owner).toHaveLength(1);
  });

  it('9. returns nothing from any table when no member scope is set', async () => {
    // The case that matters most: the GUC is the gate, not a convention.
    const tables = ['milestone', 'track', 'collision', 'member', 'household'];
    for (const t of tables) {
      const rows = await app.unsafe(`select 1 from ${t} limit 1`);
      expect(rows, t).toHaveLength(0);
    }
  });

  it('10. returns an integer and nothing else from the private count', async () => {
    const rows = await asMember(ids.a, (tx) => tx`
      select app.private_count(${ids.trackB}::uuid, 'CAR'::domain_code) as n`);
    expect(rows[0].n).toBe(1);
    expect(Object.keys(rows[0])).toEqual(['n']);
  });

  it('refuses a proposed item that carries an execution status', async () => {
    await expect(sql`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date,
         agreement, status, proposed_by_member_id)
      values (${ids.joint}, 'FIN', 'M-J-FIN-99', 'Behind before it exists',
              '2027-05-01', '2027-05-01', 'proposed', 'at_risk', ${ids.a})`)
      .rejects.toThrow();
  });

  it('refuses a park or a drop with no reason', async () => {
    await expect(sql`
      update milestone set status = 'parked', status_reason = null
       where id = ${ids.privateMs}`).rejects.toThrow();
  });
});
