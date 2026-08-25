-- The role the application connects as.
--
-- RLS is the enforcement mechanism for I-1, I-2, I-4 and I-5, and a superuser
-- bypasses it silently: every policy still exists, every test of the policies
-- passes when read, and every one of them is ignored at runtime. `force row
-- level security` closes the table owner hole but not the superuser one.
--
-- So the app gets its own role that can do everything it needs and cannot
-- bypass a policy. DATABASE_URL connects as this role. DIRECT_URL, used by the
-- migration runner only, connects as the owner.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cairn_app') then
    create role cairn_app nosuperuser nobypassrls nocreatedb nocreaterole login;
  else
    alter role cairn_app nosuperuser nobypassrls;
  end if;
end $$;

grant usage on schema public to cairn_app;
grant usage on schema app to cairn_app;
grant select, insert, update, delete on all tables in schema public to cairn_app;
grant usage, select on all sequences in schema public to cairn_app;
grant execute on all functions in schema app to cairn_app;

-- Anything a later migration adds is covered without anyone remembering.
alter default privileges in schema public
  grant select, insert, update, delete on tables to cairn_app;
alter default privileges in schema public
  grant usage, select on sequences to cairn_app;
alter default privileges in schema app
  grant execute on functions to cairn_app;

-- Deletion is soft everywhere except household deletion, so the app never needs
-- to remove a log row. Nothing is deleted: dropped items keep their ids and stay
-- queryable, and history accumulates.
revoke delete on milestone_move, milestone_event, collision_event,
                 private_read_log, session_change, decision_record
  from cairn_app;
