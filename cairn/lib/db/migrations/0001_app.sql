-- The request scope. Every policy in 0003_rls.sql reads from these.
-- app.member_id is set by lib/db/client.ts withMember() and by nothing else.

create schema if not exists app;

create or replace function app.member_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.member_id', true), '')::uuid
$$;

create or replace function app.household_id() returns uuid
language sql stable security definer as $$
  select household_id from member
   where id = app.member_id() and deleted_at is null
$$;

create or replace function app.is_principal() returns boolean
language sql stable security definer as $$
  select coalesce((select role = 'principal' from member
                    where id = app.member_id() and deleted_at is null), false)
$$;

create or replace function app.owns_track(t uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from track
                  where id = t and owner_member_id = app.member_id())
$$;

create or replace function app.is_joint_track(t uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from track
                  where id = t and kind = 'joint' and household_id = app.household_id())
$$;

create or replace function app.track_household(t uuid) returns uuid
language sql stable security definer as $$
  select household_id from track where id = t
$$;

-- The reporting currency and the household's own FX assumptions.
-- Money is converted at a rate the household stated and can point at, never at
-- a rate the application picked.
create or replace function app.reporting_currency() returns char(3)
language sql stable security definer as $$
  select reporting_currency from household where id = app.household_id()
$$;

create or replace function app.fx(amount numeric, cur char(3)) returns numeric
language sql stable security definer as $$
  select case
    when cur = app.reporting_currency() then amount
    else amount * coalesce(
      (select rate from fx_assumption
        where household_id = app.household_id()
          and base = cur and quote = app.reporting_currency()
        order by stated_at desc limit 1), 1)
  end
$$;

-- Monthly income for a track in a given month, in the reporting currency.
create or replace function app.income_month(t uuid, m date) returns numeric
language sql stable security definer as $$
  select coalesce(sum(app.fx(i.amount_monthly, i.currency)), 0)
    from income i
   where i.track_id = t
     and date_trunc('month', i.starts_on) <= date_trunc('month', m)
     and (i.ends_on is null or date_trunc('month', i.ends_on) >= date_trunc('month', m))
$$;

grant usage on schema app to public;
