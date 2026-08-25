import { cache } from 'react';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { supabaseServer } from '@/lib/supabase/server';

export interface Viewer {
  memberId: string;
  householdId: string;
  displayName: string;
  role: 'principal' | 'dependent' | 'advisor';
  seatNo: number;
  privateReadOptIn: boolean;
  privateDisclosureSeen: boolean;
  trackId: string | null;
}

/**
 * Resolves the authenticated user to a member.
 *
 * This is the only place an auth identity becomes a member id, and every
 * request path then does its work inside withMember(). Reading the member row
 * happens outside RLS scope by necessity, so it is a single lookup keyed on the
 * auth user id and returns nothing else.
 */
export const currentViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return null;

  const rows = (await db().execute(sql`
    select m.id, m.household_id, m.display_name, m.role, m.seat_no,
           m.private_read_opt_in, m.private_disclosure_seen_at,
           (select t.id from track t
             where t.owner_member_id = m.id and t.kind = 'individual') as track_id
      from member m
     where m.user_id = ${userId}::uuid and m.deleted_at is null
     limit 1`)) as unknown as Array<{
      id: string; household_id: string; display_name: string;
      role: 'principal' | 'dependent' | 'advisor'; seat_no: number;
      private_read_opt_in: boolean; private_disclosure_seen_at: string | null;
      track_id: string | null;
    }>;

  const row = rows[0];
  if (!row) return null;

  return {
    memberId: row.id,
    householdId: row.household_id,
    displayName: row.display_name,
    role: row.role,
    seatNo: row.seat_no,
    privateReadOptIn: row.private_read_opt_in,
    privateDisclosureSeen: row.private_disclosure_seen_at !== null,
    trackId: row.track_id,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await currentViewer();
  if (!viewer) {
    throw new Error('Not signed in, or this account is not a member of a household yet.');
  }
  return viewer;
}
