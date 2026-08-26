'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { HOUSEHOLD_COOKIE } from '@/lib/auth/session';

/**
 * Ends the session, and clears which household it was acting in.
 *
 * The household cookie goes with it. It is not a permission and never was:
 * switchHousehold refuses a household you do not belong to, and every policy
 * resolves through app.member_id() whatever the cookie says. But leaving it
 * behind means the next person to sign in on this browser lands in a household
 * named by the last one, which reads as a leak whether or not it is one.
 *
 * A server action rather than a browser call, because the session lives in
 * cookies the server sets and only a server action can clear them in one step.
 */
export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  (await cookies()).delete(HOUSEHOLD_COOKIE);
  redirect('/sign-in');
}
