import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

/**
 * Resolving an auth identity to its members.
 *
 * This is the lookup that produces app.member_id(), so it cannot be scoped by
 * app.member_id(). Reading member directly as the application role returns
 * nothing however many rows exist, which made every signed in person look like
 * a member of no household: their own household was invisible to them, and
 * creating it again raised the duplicate name guard.
 *
 * So the first test here is the one that used to pass while the product was
 * broken. It asserts the direct read still returns nothing, because that is
 * correct and must stay correct, and the rest assert that the lookup works
 * anyway and stays narrow.
 */
const ownerUrl = process.env.DIRECT_URL;
const appUrl = process.env.DATABASE_URL;
const suite = ownerUrl && appUrl ? describe : describe.skip;

interface Row {
  id: string;
  household_id: string;
  display_name: string;
  role: string;
  seat_no: number;
  private_read_opt_in: boolean;
  private_disclosure_seen_at: string | null;
  household_name: string;
  track_id: string | null;
}

suite('an auth identity resolves to its members', () => {
  let owner: postgres.Sql;
  let app: postgres.Sql;

  const ona = '33333333-3333-4333-8333-333333333333';
  const stranger = '44444444-4444-4444-8444-444444444444';
  const ids = { memberOna: '', memberLeroo: '', gone: '' };

  async function removeFixtures(sql: postgres.Sql) {
    const households = await sql<{ id: string }[]>`
      select id from household where name in ('Identity one', 'Identity two')`;
    for (const h of households) {
      await sql`delete from track where household_id = ${h.id}`;
      await sql`delete from member where household_id = ${h.id}`;
      await sql`delete from household where id = ${h.id}`;
    }
  }

  beforeAll(async () => {
    owner = postgres(ownerUrl!, { max: 1, onnotice: () => {} });
    app = postgres(appUrl!, { max: 1, onnotice: () => {} });

    // A run that failed partway leaves rows that make bootstrap raise the
    // duplicate name guard, so the next run fails for a reason of its own.
    await removeFixtures(owner);

    const [first] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        ${ona}::uuid, 'Identity one', 'Ona', 'Leroo', 'leroo@example.test') as member_id`;
    ids.memberOna = first.member_id;

    const [second] = await owner<{ member_id: string }[]>`
      select app.bootstrap_household(
        ${ona}::uuid, 'Identity two', 'Ona', 'Parent', 'parent2@example.test') as member_id`;
    ids.gone = second.member_id;

    // The second principal's row, waiting to be claimed.
    const [leroo] = await owner<{ id: string }[]>`
      select id from member where invite_email = 'leroo@example.test'`;
    ids.memberLeroo = leroo.id;
  });

  afterAll(async () => {
    if (!owner) return;
    await removeFixtures(owner);
    await owner.end();
    await app.end();
  });

  it('cannot be done by reading member directly, which is why the function exists', async () => {
    const rows = await app`select id from member where user_id = ${ona}::uuid`;
    expect(rows).toHaveLength(0);
  });

  it('returns every household the account belongs to, with its track', async () => {
    const rows = await app<Row[]>`select * from app.memberships(${ona}::uuid)`;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.household_name).sort())
      .toEqual(['Identity one', 'Identity two']);

    const one = rows.find((r) => r.household_name === 'Identity one')!;
    expect(one.id).toBe(ids.memberOna);
    expect(one.display_name).toBe('Ona');
    expect(one.role).toBe('principal');
    expect(one.seat_no).toBe(1);
    expect(one.track_id).not.toBeNull();
  });

  it('returns nothing for an account that is a member of nothing', async () => {
    const rows = await app`select * from app.memberships(${stranger}::uuid)`;
    expect(rows).toHaveLength(0);
  });

  it('never returns a member belonging to someone else', async () => {
    const rows = await app<Row[]>`select * from app.memberships(${stranger}::uuid)`;
    expect(rows.map((r) => r.id)).not.toContain(ids.memberOna);
  });

  it('does not return an unclaimed invitation, which has no account yet', async () => {
    const rows = await app<Row[]>`select * from app.memberships(${ona}::uuid)`;
    expect(rows.map((r) => r.id)).not.toContain(ids.memberLeroo);
  });

  it('drops a household once it is deleted', async () => {
    await owner`update household set deleted_at = now() where name = 'Identity two'`;
    const rows = await app<Row[]>`select * from app.memberships(${ona}::uuid)`;
    expect(rows.map((r) => r.household_name)).toEqual(['Identity one']);
    await owner`update household set deleted_at = null where name = 'Identity two'`;
  });

  it('drops a member once they are removed, leaving their other household', async () => {
    await owner`update member set deleted_at = now() where id = ${ids.gone}::uuid`;
    const rows = await app<Row[]>`select * from app.memberships(${ona}::uuid)`;
    expect(rows.map((r) => r.household_name)).toEqual(['Identity one']);
    await owner`update member set deleted_at = null where id = ${ids.gone}::uuid`;
  });

  it('still refuses the tables themselves, so the function widened nothing', async () => {
    const members = await app`select id from member`;
    const households = await app`select id from household`;
    expect(members).toHaveLength(0);
    expect(households).toHaveLength(0);
  });
});
