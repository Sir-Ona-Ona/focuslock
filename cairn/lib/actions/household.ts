'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { supabaseServer } from '@/lib/supabase/server';

export type Result = { ok: true } | { ok: false; error: string };

const input = z.object({
  householdName: z.string().min(1, 'Give the household a name.'),
  displayName: z.string().min(1, 'What should the plan call you.'),
  partnerName: z.string().min(1, 'Name the other principal.'),
  partnerEmail: z.string().email('Their email, so they can claim their own track.'),
});

/**
 * Creates a household with two principals, three tracks and the method Cairn
 * ships. The second principal's track exists from this moment and stays
 * unclaimed until they author in it themselves.
 */
export async function createHousehold(raw: z.input<typeof input>): Promise<Result> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false, error: 'Sign in first.' };

  if (parsed.data.partnerEmail.toLowerCase() === (user.email ?? '').toLowerCase()) {
    return {
      ok: false,
      error: 'The other principal needs their own email. Two people, two accounts, two tracks.',
    };
  }

  try {
    await db().execute(sql`
      select app.bootstrap_household(
        ${user.id}::uuid, ${parsed.data.householdName}, ${parsed.data.displayName},
        ${parsed.data.partnerName}, ${parsed.data.partnerEmail})`);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'The household was not created.',
    };
  }
}

/** Matches a signed in account to the member row they were invited as. */
export async function claimInvite(): Promise<Result> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return { ok: false, error: 'Sign in first.' };

  const rows = (await db().execute(sql`
    select app.claim_invite(${user.id}::uuid, ${user.email}) as member_id`)) as unknown as
    Array<{ member_id: string | null }>;

  if (!rows[0]?.member_id) {
    return {
      ok: false,
      error: 'No invitation is waiting for this email address.',
    };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
