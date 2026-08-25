-- Cost instrumentation, from OD-8.
--
-- A flat per-household subscription accepts that cost scales with engagement
-- while price does not. That is a manageable exposure only if it is measured,
-- so every model call is recorded from the first facilitated review rather than
-- instrumented later: cost recorded retrospectively is guesswork, and OD-9 (the
-- price itself, and whether a fair use ceiling is needed) turns on the real
-- distribution rather than on an estimate.

alter table model_call enable row level security;
alter table model_call force row level security;

-- A household sees what it costs. Nobody sees another household's.
create policy model_call_read on model_call for select using (
  household_id = app.household_id()
);
create policy model_call_write on model_call for insert with check (
  household_id = app.household_id()
);

grant select, insert on model_call to cairn_app;

-- Indexed on the raw timestamp rather than a truncated one: date_trunc over a
-- timestamptz depends on the session time zone, so it is not immutable and
-- cannot be indexed. A range scan on created_at serves the monthly rollup.
create index model_call_household_created_idx on model_call (household_id, created_at);
create index model_call_flow_idx on model_call (household_id, flow);

-- What a household has spent, by flow and by month. The three numbers OD-9
-- needs are percentiles over this view rather than a fresh query each time.
create or replace view v_model_cost_month
with (security_invoker = true) as
-- Truncated in UTC explicitly. Timestamps are stored as timestamptz and always
-- mean UTC, and a month boundary that moved with the reader's time zone would
-- put the same call in two different months for two different people.
select household_id,
       date_trunc('month', created_at at time zone 'UTC')::date as month,
       flow,
       count(*)::int as calls,
       sum(input_tokens)::bigint as input_tokens,
       sum(output_tokens)::bigint as output_tokens,
       sum(cache_read_input_tokens)::bigint as cache_read_input_tokens,
       sum(cost_usd) as cost_usd
  from model_call
 group by household_id, date_trunc('month', created_at at time zone 'UTC'), flow;
