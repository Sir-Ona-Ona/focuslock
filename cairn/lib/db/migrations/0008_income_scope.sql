-- Assumed income does not pay for anything.
--
-- app.income_month scheduled every income row, assumed ones included, so a plan
-- that only works on income nobody has committed to producing came out looking
-- affordable. That is precisely the hole the assumed flag exists to expose, and
-- counting it in the schedule hid it behind its own symptom.
--
-- The schedule now runs against income that exists. Assumed income is reported
-- separately, by name, as what the plan is resting on.
create or replace function app.income_month(t uuid, m date) returns numeric
language sql stable security definer as $$
  select coalesce(sum(app.fx(i.amount_monthly, i.currency)), 0)
    from income i
   where i.track_id = t
     and not i.is_assumed
     and date_trunc('month', i.starts_on) <= date_trunc('month', m)
     and (i.ends_on is null or date_trunc('month', i.ends_on) >= date_trunc('month', m))
$$;

-- The same figure including what the plan assumes, so the gap between the two
-- can be shown rather than inferred.
create or replace function app.income_month_assumed(t uuid, m date) returns numeric
language sql stable security definer as $$
  select coalesce(sum(app.fx(i.amount_monthly, i.currency)), 0)
    from income i
   where i.track_id = t
     and i.is_assumed
     and date_trunc('month', i.starts_on) <= date_trunc('month', m)
     and (i.ends_on is null or date_trunc('month', i.ends_on) >= date_trunc('month', m))
$$;

grant execute on function app.income_month_assumed(uuid, date) to cairn_app;
