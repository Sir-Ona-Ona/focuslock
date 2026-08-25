import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import { method } from './accessor';

/**
 * Changing the method. Two tiers, and nothing locked.
 *
 * A solo setting is yours: write a new version based on the active one, change
 * the value, activate. A reason is required, and reverting is a forward step
 * with its own entry rather than a rollback that erases what happened.
 *
 * A two-key setting is not a preference. It is something the other principal
 * relies on, so changing it goes through a request they approve. The point is
 * not strictness, it is that the person a rule constrains should not be able to
 * switch it off alone at the moment it inconveniences them.
 */

/** Forks the household's method from whatever is active, returning the new version id. */
async function forkVersion(
  tx: Tx,
  householdId: string,
  memberId: string,
  label: string,
  note: string,
): Promise<string> {
  const m = await method(tx);

  const [{ next }] = (await tx.execute(sql`
    select coalesce(max(version), 0) + 1 as next
      from method_version where household_id = ${householdId}`)) as unknown as
    { next: number }[];

  const [{ id }] = (await tx.execute(sql`
    insert into method_version
      (household_id, version, label, based_on_version_id, created_by_member_id, note, active)
    values (${householdId}, ${next}, ${label}, ${m.versionId}, ${memberId}, ${note}, false)
    returning id`)) as unknown as { id: string }[];

  // Carry every setting forward, so a version is a complete method rather than a
  // diff that has to be replayed to be read.
  await tx.execute(sql`
    insert into method_setting
      (method_version_id, key, value, default_value, tier, protects, rationale)
    select ${id}, s.key, s.value, s.default_value, s.tier, s.protects, s.rationale
      from method_setting s
      join method_version v on v.id = s.method_version_id
     where v.id = ${m.versionId}`);

  return id;
}

async function activate(tx: Tx, householdId: string, versionId: string): Promise<void> {
  await tx.execute(sql`
    update method_version set active = false
     where household_id = ${householdId} and active`);
  await tx.execute(sql`
    update method_version set active = true where id = ${versionId}`);
}

export async function updateSoloSetting(
  tx: Tx,
  args: { householdId: string; memberId: string; key: string; value: unknown; reason: string },
): Promise<{ versionId: string }> {
  const m = await method(tx);
  const current = m.setting(args.key);
  if (!current) throw new Error(`No method setting named ${args.key}.`);
  if (current.tier === 'two_key') {
    throw new Error(
      `${args.key} protects ${current.protects}. Changing it needs the other principal to approve, `
      + 'so open a request rather than an edit.',
    );
  }

  const versionId = await forkVersion(
    tx, args.householdId, args.memberId, `${args.key} changed`, args.reason,
  );
  await tx.execute(sql`
    update method_setting set value = ${JSON.stringify(args.value)}::jsonb
     where method_version_id = ${versionId} and key = ${args.key}`);
  await activate(tx, args.householdId, versionId);
  return { versionId };
}

export async function requestMethodChange(
  tx: Tx,
  args: { householdId: string; memberId: string; key: string; value: unknown; reason: string },
): Promise<{ requestId: string }> {
  const m = await method(tx);
  const current = m.setting(args.key);
  if (!current) throw new Error(`No method setting named ${args.key}.`);

  const [{ id }] = (await tx.execute(sql`
    insert into method_change_request
      (household_id, key, from_value, to_value, requested_by_member_id, reason)
    values (${args.householdId}, ${args.key}, ${JSON.stringify(current.value)}::jsonb,
            ${JSON.stringify(args.value)}::jsonb, ${args.memberId}, ${args.reason})
    returning id`)) as unknown as { id: string }[];

  return { requestId: id };
}

export async function respondToMethodChange(
  tx: Tx,
  args: {
    householdId: string; memberId: string; requestId: string;
    approve: boolean; declineReason?: string;
  },
): Promise<void> {
  const [req] = (await tx.execute(sql`
    select id, key, to_value, requested_by_member_id, status
      from method_change_request
     where id = ${args.requestId} and household_id = ${args.householdId}`)) as unknown as
    { id: string; key: string; to_value: unknown; requested_by_member_id: string; status: string }[];

  if (!req) throw new Error('That change request is not in this household.');
  if (req.status !== 'pending') throw new Error('That request has already been answered.');
  if (req.requested_by_member_id === args.memberId) {
    throw new Error('A change request is approved by the other principal, not by the person who opened it.');
  }

  if (!args.approve) {
    await tx.execute(sql`
      update method_change_request
         set status = 'declined', decline_reason = ${args.declineReason ?? null},
             approved_by_member_id = null
       where id = ${req.id}`);
    return;
  }

  await tx.execute(sql`
    update method_change_request
       set status = 'approved', approved_by_member_id = ${args.memberId}, approved_at = now()
     where id = ${req.id}`);

  const versionId = await forkVersion(
    tx, args.householdId, args.memberId, `${req.key} changed`,
    `Approved change to ${req.key}.`,
  );
  await tx.execute(sql`
    update method_setting set value = ${JSON.stringify(req.to_value)}::jsonb
     where method_version_id = ${versionId} and key = ${req.key}`);
  await activate(tx, args.householdId, versionId);
}

/** Activating an older version is itself a new version, never a rollback that loses history. */
export async function revertToVersion(
  tx: Tx,
  args: { householdId: string; memberId: string; targetVersionId: string; reason: string },
): Promise<{ versionId: string }> {
  const versionId = await forkVersion(
    tx, args.householdId, args.memberId, 'Reverted', args.reason,
  );
  await tx.execute(sql`
    delete from method_setting where method_version_id = ${versionId}`);
  await tx.execute(sql`
    insert into method_setting
      (method_version_id, key, value, default_value, tier, protects, rationale)
    select ${versionId}, key, value, default_value, tier, protects, rationale
      from method_setting where method_version_id = ${args.targetVersionId}`);
  await activate(tx, args.householdId, versionId);
  return { versionId };
}
