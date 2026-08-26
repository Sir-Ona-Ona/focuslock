import { cache } from 'react';
import { cookies } from 'next/headers';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { supabaseServer } from '@/lib/supabase/server';

/** Which household a request is acting in, when a person belongs to several. */
export const HOUSEHOLD_COOKIE = 'cairn.household';

export interface Membership {
  memberId: string;
  householdId: string;
  householdName: string;
  displayName: string;
  role: 'principal' | 'dependent' | 'advisor';
}

export interface Viewer {
  memberId: string;
  householdId: string;
  householdName: string;
  displayName: string;
  role: 'principal' | 'dependent' | 'advisor';
  seatNo: number;
  privateReadOptIn: boolean;
  privateDisclosureSeen: boolean;
  trackId: string | null;
  /** Every household this person belongs to. One entry is the ordinary case. */
  memberships: Membership[];
}

/**
 * Resolves the authenticated user to the member they are acting as.
 *
 * A person may belong to more than one household: a plan with a partner and a
 * plan with a parent are separate households, and each is a separate member
 * row. The request acts as exactly one of them, so nothing downstream changes:
 * app.member_id() still resolves one household, and every policy still scopes
 * through it. Which member is chosen is the only new question, and the answer
 * is a cookie the person sets by switching.
 *
 * This is the only place an auth identity becomes a member id, and it is the
 * one read that cannot go through row level security. Every policy resolves
 * through app.member_id(), and this query is what produces app.member_id(), so
 * reading member directly returns nothing however many rows exist. It goes
 * through app.memberships instead, which filters on user_id and nothing else.
 */
export const currentViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return null;

  const rows = (await db().execute(sql`
    select id, household_id, display_name, role, seat_no,
           private_read_opt_in, private_disclosure_seen_at, household_name, track_id
      from app.memberships(${userId}::uuid)`)) as unknown as Array<{
      id: string; household_id: string; display_name: string;
      role: 'principal' | 'dependent' | 'advisor'; seat_no: number;
      private_read_opt_in: boolean; private_disclosure_seen_at: string | null;
      household_name: string; track_id: string | null;
    }>;

  if (rows.length === 0) return null;

  const memberships: Membership[] = rows.map((r) => ({
    memberId: r.id,
    householdId: r.household_id,
    householdName: r.household_name,
    displayName: r.display_name,
    role: r.role,
  }));

  const store = await cookies();
  const chosen = store.get(HOUSEHOLD_COOKIE)?.value;
  // A cookie naming a household this person left is not an error, it is stale.
  const row = rows.find((r) => r.household_id === chosen) ?? rows[0];

  return {
    memberId: row.id,
    householdId: row.household_id,
    householdName: row.household_name,
    displayName: row.display_name,
    role: row.role,
    seatNo: row.seat_no,
    privateReadOptIn: row.private_read_opt_in,
    privateDisclosureSeen: row.private_disclosure_seen_at !== null,
    trackId: row.track_id,
    memberships,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await currentViewer();
  if (!viewer) {
    throw new Error('Not signed in, or this account is not a member of a household yet.');
  }
  return viewer;
}
