-- Creating a household, and joining one you were invited to.
--
-- Both run before any member scope exists, which is the one moment RLS cannot
-- help: there is no member id to set yet. They are security definer functions
-- rather than a service role call, so the request path never holds a key that
-- bypasses row level security. Each does exactly one thing and checks its own
-- preconditions.

create or replace function app.bootstrap_household(
  p_user_id uuid,
  p_household_name text,
  p_display_name text,
  p_partner_name text,
  p_partner_email text
) returns uuid
language plpgsql security definer as $$
declare
  v_household uuid;
  v_member uuid;
  v_partner uuid;
begin
  if exists (select 1 from member where user_id = p_user_id and deleted_at is null) then
    raise exception 'This account is already a member of a household.';
  end if;

  insert into household (name) values (p_household_name) returning id into v_household;

  insert into member (household_id, user_id, display_name, role, seat_no, principal_slot, joined_at)
  values (v_household, p_user_id, p_display_name, 'principal', 1, 1, now())
  returning id into v_member;

  -- The second principal is created now and claimed when they sign in. Their
  -- track exists from the start and stays unclaimed until they author in it:
  -- Cairn provisions tracks, and only their owner puts goals in them.
  insert into member (household_id, display_name, role, seat_no, principal_slot,
                      invite_email, invited_by_member_id)
  values (v_household, p_partner_name, 'principal', 2, 2, lower(btrim(p_partner_email)), v_member)
  returning id into v_partner;

  insert into track (household_id, kind, owner_member_id) values
    (v_household, 'individual', v_member),
    (v_household, 'individual', v_partner),
    (v_household, 'joint', null);

  return v_member;
end $$;

revoke all on function app.bootstrap_household(uuid, text, text, text, text) from public;

create or replace function app.claim_invite(p_user_id uuid, p_email text)
returns uuid
language plpgsql security definer as $$
declare v_member uuid;
begin
  update member
     set user_id = p_user_id, joined_at = coalesce(joined_at, now())
   where user_id is null
     and deleted_at is null
     and invite_email = lower(btrim(p_email))
  returning id into v_member;

  return v_member;
end $$;

revoke all on function app.claim_invite(uuid, text) from public;
