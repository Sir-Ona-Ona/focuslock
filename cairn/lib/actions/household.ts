'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { supabaseServer } from '@/lib/supabase/server';
import { HOUSEHOLD_COOKIE, currentViewer } from '@/lib/auth/session';

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
 *
 * A person may create more than one: a plan with a partner and a plan with a
 * parent are separate households, and each gets its own tracks, method version
 * and history.
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
    const rows = (await db().execute(sql`
      select h.id as household_id
        from app.bootstrap_household(
          ${user.id}::uuid, ${parsed.data.householdName}, ${parsed.data.displayName},
          ${parsed.data.partnerName}, ${parsed.data.partnerEmail}) as member_id
        join member m on m.id = member_id
        join household h on h.id = m.household_id`)) as unknown as
      Array<{ household_id: string }>;

    // Land in the household just created rather than whichever one sorts first.
    if (rows[0]) await setHouseholdCookie(rows[0].household_id);
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

  // Claims every invitation waiting on this address, so someone invited to two
  // households joins both rather than guessing which one a single claim took.
  const rows = (await db().execute(sql`
    select member_id from app.claim_invite(${user.id}::uuid, ${user.email}) as member_id`)) as
    unknown as Array<{ member_id: string }>;

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'No invitation is waiting for this email address.',
    };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

async function setHouseholdCookie(householdId: string): Promise<void> {
  const store = await cookies();
  store.set(HOUSEHOLD_COOKIE, householdId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // method-literal-ok: a cookie lifetime in seconds, not a method value
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Switches which household this person is acting in.
 *
 * Refuses a household they are not a member of, so the cookie can never widen
 * what they can see: it selects among their own member rows and nothing else.
 * Even if it did, every policy resolves through app.member_id() and would
 * return nothing.
 */
export async function switchHousehold(householdId: string): Promise<Result> {
  const parsed = z.string().uuid().safeParse(householdId);
  if (!parsed.success) return { ok: false, error: 'That is not a household.' };

  const viewer = await currentViewer();
  if (!viewer) return { ok: false, error: 'Sign in first.' };

  const membership = viewer.memberships.find((m) => m.householdId === parsed.data);
  if (!membership) {
    return { ok: false, error: 'You are not a member of that household.' };
  }

  await setHouseholdCookie(membership.householdId);
  revalidatePath('/', 'layout');
  return { ok: true };
}
