-- The money audit, per month over a 24 month horizon, in the reporting
-- currency. Hours and money are the two capacities a plan can exceed, and a
-- plan audited on only one of them is half audited.

create or replace view v_outflow_month
with (security_invoker = true) as
with months as (
  select generate_series(date_trunc('month', current_date),
                         date_trunc('month', current_date) + interval '23 months',
                         interval '1 month')::date as m
)
select o.track_id,
       months.m,
       sum(case when o.kind = 'recurring'
                 and months.m >= date_trunc('month', o.starts_on)
                 and (o.ends_on is null or months.m <= date_trunc('month', o.ends_on))
                then app.fx(o.amount, o.currency) else 0 end) as recurring,
       sum(case when o.kind = 'one_off'
                 and date_trunc('month', o.starts_on) = months.m
                then app.fx(o.amount, o.currency) else 0 end) as one_off,
       -- committed and intended behave differently and must not be flattened.
       sum(case when o.committed and o.kind = 'recurring'
                 and months.m >= date_trunc('month', o.starts_on)
                 and (o.ends_on is null or months.m <= date_trunc('month', o.ends_on))
                then app.fx(o.amount, o.currency) else 0 end)
     + sum(case when o.committed and o.kind = 'one_off'
                 and date_trunc('month', o.starts_on) = months.m
                then app.fx(o.amount, o.currency) else 0 end) as committed_outflow,
       bool_or(o.committed) as any_committed
  from obligation o
  cross join months
 group by o.track_id, months.m;

-- Hour demand against a stated ceiling. A positive gap is the finding.
create or replace view v_load_audit
with (security_invoker = true) as
select t.id as track_id,
       coalesce(sum(dl.hours_per_week), 0) as demand,
       coalesce(sum(coalesce(dl.hours_per_week_bad, dl.hours_per_week)), 0) as demand_bad,
       c.ceiling_hours_per_week as ceiling,
       coalesce(sum(dl.hours_per_week), 0) - c.ceiling_hours_per_week as gap
  from track t
  join capacity c on c.track_id = t.id
  left join domain_load dl on dl.track_id = t.id
 group by t.id, c.ceiling_hours_per_week;
