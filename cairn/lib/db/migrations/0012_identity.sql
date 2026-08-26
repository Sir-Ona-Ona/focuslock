-- Resolving an auth identity to the members it owns.
--
-- This is the one read that cannot be scoped by row level security, because
-- every policy resolves through app.member_id() and this query is what produces
-- app.member_id(). Reading member directly as the application role returns
-- nothing, always: the policy asks for a scope that has not been established
-- yet, and the query establishing it is the one being filtered. So a signed in
-- person resolved to no member, was treated as belonging to no household, and
-- was sent back to set one up. The household they had already created was
-- invisible to them, and creating it again raised the duplicate name guard,
-- which is the error that surfaced.
--
-- Security definer, like bootstrap_household and claim_invite, and for the same
-- reason: the request path must never hold a key that bypasses row level
-- security. This is not a general read. It filters on user_id and nothing else,
-- so it can only ever return rows belonging to the account asking, and the
-- caller takes that id from a verified session rather than from anything a
-- browser sent. search_path is pinned, so the tables it names cannot be
-- shadowed by a caller's search_path.

create or replace function app.memberships(p_user_id uuid)
returns table (
  id uuid,
  household_id uuid,
  display_name text,
  role member_role,
  seat_no smallint,
  private_read_opt_in boolean,
  private_disclosure_seen_at timestamptz,
  household_name text,
  track_id uuid
)
language sql stable security definer
set search_path = public, app, pg_temp
as $$
  select m.id, m.household_id, m.display_name, m.role, m.seat_no,
         m.private_read_opt_in, m.private_disclosure_seen_at,
         h.name,
         (select t.id from track t
           where t.owner_member_id = m.id and t.kind = 'individual')
    from member m
    join household h on h.id = m.household_id
   where m.user_id = p_user_id
     and m.deleted_at is null
     and h.deleted_at is null
   order by m.joined_at nulls last, h.created_at
$$;

revoke all on function app.memberships(uuid) from public;
grant execute on function app.memberships(uuid) to cairn_app;
