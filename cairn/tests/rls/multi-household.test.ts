import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

/**
 * Multi-household, from OD-7.
 *
 * The point of these is that tenancy changed and no invariant did. A person in
 * two households is two member rows, the request acts as one of them, and every
 * policy still resolves through app.member_id(). Nothing crosses.
 */
const ownerUrl = process.env.DIRECT_URL;
const appUrl = process.env.DATABASE_URL;
const suite = ownerUrl && appUrl ? describe : describe.skip;

suite('households as tenants', () => {
  let owner: postgres.Sql;
  let app: postgres.Sql;

  const shared = '11111111-1111-4111-8111-111111111111';   // one person, two households
  const outsider = '22222222-2222-4222-8222-222222222222';
  const ids = { memberA: '', memberB: '', householdA: '', householdB: '', msA: '' };

  async function asMember<T>(memberId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
    return app.begin(async (tx) => {
      await tx`select set_config('app.member_id', ${memberId}, true)`;
      return fn(tx);
    });
  }

  beforeAll(async () => {
    owner = postgres(ownerUrl!, { max: 1, onnotice: () => {} });
    app = postgres(appUrl!, { max: 1, onnotice: () => {} });

    const [a] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        ${shared}::uuid, 'With a partner', 'Me', 'Partner', 'partner@example.test') as member_id`;
    const [b] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        ${shared}::uuid, 'With a parent', 'Me', 'Parent', 'parent@example.test') as member_id`;
    ids.memberA = a.member_id;
    ids.memberB = b.member_id;

    const households = await owner<{ id: string; name: string }[]>`
      select h.id, h.name from household h
        join member m on m.household_id = h.id
       where m.user_id = ${shared}::uuid order by h.created_at`;
    ids.householdA = households[0].id;
    ids.householdB = households[1].id;

    const [track] = await owner<{ id: string }[]>`
      select id from track where household_id = ${ids.householdA}
        and owner_member_id = ${ids.memberA}`;
    const [ms] = await owner<{ id: string }[]>`
      insert into milestone
        (track_id, domain_code, ref, title, target_date, original_target_date, status)
      values (${track.id}, 'FIN', 'M-1-FIN-01', 'Only in household A', '2027-04-01',
              '2027-04-01', 'on_track')
      returning id`;
    ids.msA = ms.id;
  });

  afterAll(async () => {
    if (!owner) return;
    for (const h of [ids.householdA, ids.householdB]) {
      await owner`delete from milestone where track_id in
        (select id from track where household_id = ${h})`;
      await owner`delete from track where household_id = ${h}`;
      await owner`delete from member where household_id = ${h}`;
      await owner`delete from household where id = ${h}`;
    }
    await owner.end();
    await app.end();
  });

  it('lets one person hold two households, as two member rows', async () => {
    const rows = await owner<{ n: number }[]>`
      select count(*)::int as n from member where user_id = ${shared}::uuid`;
    expect(rows[0].n).toBe(2);
    expect(ids.memberA).not.toBe(ids.memberB);
  });

  it('refuses two households of the same name for the same person', async () => {
    await expect(owner`
      select app.bootstrap_household(
        ${shared}::uuid, 'With a parent', 'Me', 'Someone', 'someone@example.test')`)
      .rejects.toThrow();
  });

  it('refuses one person two seats in the same household', async () => {
    await expect(owner`
      insert into member (household_id, user_id, display_name, role, seat_no)
      values (${ids.householdA}, ${shared}::uuid, 'Me again', 'dependent', 3)`)
      .rejects.toThrow();
  });

  it('shows nothing of household A while acting as the member in household B', async () => {
    // The same person, the same session, the other member row. Acting in one
    // household must not carry anything over from the other.
    const seen = await asMember(ids.memberB, (tx) => tx`
      select id from milestone where id = ${ids.msA}`);
    expect(seen).toHaveLength(0);

    const tracks = await asMember(ids.memberB, (tx) => tx`select id from track`);
    expect(tracks).toHaveLength(3);

    const own = await asMember(ids.memberA, (tx) => tx`
      select id from milestone where id = ${ids.msA}`);
    expect(own).toHaveLength(1);
  });

  it('scopes the household row itself', async () => {
    const fromB = await asMember(ids.memberB, (tx) => tx`
      select id from household where id = ${ids.householdA}`);
    expect(fromB).toHaveLength(0);
  });

  it('shows a stranger nothing at all', async () => {
    const [{ member_id }] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        ${outsider}::uuid, 'Someone else entirely', 'Them', 'Theirs',
        'theirs@example.test') as member_id`;

    const seen = await asMember(member_id, (tx) => tx`
      select id from milestone where id = ${ids.msA}`);
    expect(seen).toHaveLength(0);

    const [h] = await owner<{ household_id: string }[]>`
      select household_id from member where id = ${member_id}`;
    await owner`delete from track where household_id = ${h.household_id}`;
    await owner`delete from member where household_id = ${h.household_id}`;
    await owner`delete from household where id = ${h.household_id}`;
  });

  it('claims every invitation waiting on one address', async () => {
    const joiner = '33333333-3333-4333-8333-333333333333';
    const claimed = await owner<{ member_id: string }[]>`
      select member_id from app.claim_invite(${joiner}::uuid, 'partner@example.test') as member_id`;
    expect(claimed).toHaveLength(1);

    // Claiming again finds nothing left to claim, rather than failing.
    const again = await owner<{ member_id: string }[]>`
      select member_id from app.claim_invite(${joiner}::uuid, 'partner@example.test') as member_id`;
    expect(again).toHaveLength(0);
  });
});
