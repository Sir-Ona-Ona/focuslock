-- Multi-household, from OD-7.
--
-- The scoping model already supported this: every policy resolves through
-- app.member_id(), and a member belongs to exactly one household. A person in
-- two households is two member rows, and the request acts as one of them. So
-- nothing here relaxes a policy. It removes a guard that assumed one household
-- per person, which was true of a private tool and is not true of a product.

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
  -- A person may hold a plan with a partner and another with a parent. What is
  -- still refused is two households of the same name for the same person, which
  -- is a double submission rather than an intention.
  if exists (
    select 1 from member m
      join household h on h.id = m.household_id
     where m.user_id = p_user_id
       and m.deleted_at is null
       and h.deleted_at is null
       and lower(btrim(h.name)) = lower(btrim(p_household_name))
  ) then
    raise exception 'You already have a household called %.', p_household_name;
  end if;

  insert into household (name) values (p_household_name) returning id into v_household;

  insert into member (household_id, user_id, display_name, role, seat_no, principal_slot, joined_at)
  values (v_household, p_user_id, p_display_name, 'principal', 1, 1, now())
  returning id into v_member;

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

-- Claiming an invitation claims every invitation waiting on that address, so
-- someone invited to two households joins both rather than having to guess
-- which one a single claim resolved.
--
-- Dropped rather than replaced: the return type widens from one id to a set,
-- and create or replace cannot change a return type.
drop function if exists app.claim_invite(uuid, text);

create function app.claim_invite(p_user_id uuid, p_email text)
returns setof uuid
language sql security definer as $$
  update member
     set user_id = p_user_id, joined_at = coalesce(joined_at, now())
   where user_id is null
     and deleted_at is null
     and invite_email = lower(btrim(p_email))
  returning id
$$;

revoke all on function app.claim_invite(uuid, text) from public;
grant execute on function app.bootstrap_household(uuid, text, text, text, text) to cairn_app;
grant execute on function app.claim_invite(uuid, text) to cairn_app;

-- One person cannot hold two seats in the same household.
create unique index if not exists member_user_household_idx
  on member (household_id, user_id) where user_id is not null and deleted_at is null;
