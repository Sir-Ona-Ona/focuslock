-- Row level security. This is the enforcement mechanism, not a second line of
-- defence behind application checks. A request path that forgets to filter
-- still cannot read what it should not read.

-- ------------------------------------------------------- the private count
-- What another member sees where private items exist: an integer, nothing else.
create or replace function app.private_count(t uuid, d domain_code)
returns integer language sql security definer stable as $$
  select count(*)::int from milestone
   where track_id = t and domain_code = d and is_private
     and (status is null or status <> 'dropped')
$$;
revoke all on function app.private_count(uuid, domain_code) from public;

-- ------------------------------------------------------------ enable RLS
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
     where schemaname = 'public'
       and tablename not in ('domain', 'finding_rule')
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('alter table public.%I force row level security', r.tablename);
  end loop;
end $$;

-- Seed reference tables are readable by everyone and written by migrations only.
alter table domain enable row level security;
alter table finding_rule enable row level security;
create policy domain_read on domain for select using (true);
create policy finding_rule_read on finding_rule for select using (true);

-- ------------------------------------------------------ household, members
create policy household_read on household for select using (id = app.household_id());
create policy household_write on household for update using (
  id = app.household_id() and app.is_principal()
);

create policy member_read on member for select using (household_id = app.household_id());
-- A member edits their own row. Nobody edits anyone else's.
create policy member_self_write on member for update using (id = app.member_id());

create policy advisor_grant_read on advisor_grant for select using (
  member_id = app.member_id() or app.track_household(track_id) = app.household_id()
);
create policy advisor_grant_write on advisor_grant for insert with check (
  app.owns_track(track_id) and granted_by_member_id = app.member_id()
);
create policy advisor_grant_revoke on advisor_grant for update using (
  app.owns_track(track_id)
);

-- ------------------------------------------------------------------ tracks
create policy track_read on track for select using (
  household_id = app.household_id()
);
create policy track_write on track for update using (
  owner_member_id = app.member_id()
  or (kind = 'joint' and app.is_principal() and household_id = app.household_id())
);

-- --------------------------------------------------------------- milestone
-- I-1 at the read layer plus I-4: a private milestone is invisible to everyone
-- but its owner, in every query the app runs, without any caller remembering.
create policy ms_read on milestone for select using (
  app.track_household(track_id) = app.household_id()
  and (not is_private or app.owns_track(track_id))
);
create policy ms_insert on milestone for insert with check (
  app.owns_track(track_id)
  or (app.is_principal() and app.is_joint_track(track_id))
);
create policy ms_update on milestone for update using (
  app.owns_track(track_id)
  or (app.is_principal() and app.is_joint_track(track_id))
);

-- Advisors read only what a live grant covers, and never a private item.
create policy ms_advisor_read on milestone for select using (
  exists (
    select 1 from advisor_grant g
     where g.member_id = app.member_id()
       and g.track_id = milestone.track_id
       and g.domain_code = milestone.domain_code
       and g.revoked_at is null
       and g.expires_at > now()
  ) and not is_private
);

-- The same shape for everything that hangs off a track.
do $$
declare t text;
begin
  foreach t in array array['goal','assumption','risk','constraint_row',
                           'domain_load','capacity','income','obligation','reserve']
  loop
    execute format($f$
      create policy %1$s_read on %1$I for select using (
        app.track_household(track_id) = app.household_id()
      )$f$, t);
    execute format($f$
      create policy %1$s_insert on %1$I for insert with check (
        app.owns_track(track_id)
        or (app.is_principal() and app.is_joint_track(track_id))
      )$f$, t);
    execute format($f$
      create policy %1$s_update on %1$I for update using (
        app.owns_track(track_id)
        or (app.is_principal() and app.is_joint_track(track_id))
      )$f$, t);
  end loop;
end $$;

-- Move rows and agreement events follow their milestone.
create policy ms_move_read on milestone_move for select using (
  exists (select 1 from milestone m where m.id = milestone_id)
);
create policy ms_move_insert on milestone_move for insert with check (
  exists (select 1 from milestone m where m.id = milestone_id
           and (app.owns_track(m.track_id)
                or (app.is_principal() and app.is_joint_track(m.track_id))))
);
create policy ms_event_read on milestone_event for select using (
  exists (select 1 from milestone m where m.id = milestone_id)
);
create policy ms_event_insert on milestone_event for insert with check (
  by_member_id = app.member_id()
  and exists (select 1 from milestone m where m.id = milestone_id)
);

create policy asm_ms_read on assumption_milestone for select using (
  exists (select 1 from milestone m where m.id = milestone_id)
);
create policy asm_ms_write on assumption_milestone for insert with check (
  exists (select 1 from assumption a where a.id = assumption_id
           and app.owns_track(a.track_id))
);

-- The queue for someone else's track: the raiser writes, the owner actions.
create policy pending_read on pending_item for select using (
  app.owns_track(track_id) or raised_by_member_id = app.member_id()
);
create policy pending_insert on pending_item for insert with check (
  raised_by_member_id = app.member_id()
  and app.track_household(track_id) = app.household_id()
);
create policy pending_update on pending_item for update using (
  app.owns_track(track_id)
);

-- ------------------------------------------------------------- cross track
create policy dependency_read on dependency for select using (
  household_id = app.household_id()
);
create policy dependency_write on dependency for insert with check (
  household_id = app.household_id()
);

-- I-5 at the database. A collision derived from a private item is invisible to
-- the other member here, not in the notification layer.
create policy collision_read on collision for select using (
  household_id = app.household_id()
  and (not derived_from_private or visible_to_member_id = app.member_id())
);
create policy collision_insert on collision for insert with check (
  household_id = app.household_id()
);
create policy collision_update on collision for update using (
  household_id = app.household_id()
  and (not derived_from_private or visible_to_member_id = app.member_id())
);
create policy collision_event_read on collision_event for select using (
  exists (select 1 from collision c where c.id = collision_id)
);
create policy collision_event_insert on collision_event for insert with check (
  exists (select 1 from collision c where c.id = collision_id)
);

create policy gate_read on gate for select using (household_id = app.household_id());
create policy gate_write on gate for insert with check (household_id = app.household_id());
create policy gate_update on gate for update using (household_id = app.household_id());

-- ------------------------------------------------------------------ method
create policy method_setting_read on method_setting for select using (
  exists (select 1 from method_version v where v.id = method_version_id
          and (v.household_id is null or v.household_id = app.household_id()))
);
create policy mv_read on method_version for select using (
  household_id is null or household_id = app.household_id()
);
create policy mv_write on method_version for insert with check (
  household_id = app.household_id() and app.is_principal()
);
create policy mv_activate on method_version for update using (
  household_id = app.household_id() and app.is_principal()
);

-- I-12f: a two_key setting cannot be written without an approved request, and
-- an approval authorises one change rather than standing permission.
create policy method_setting_write on method_setting for insert with check (
  exists (select 1 from method_version v where v.id = method_version_id
           and v.household_id = app.household_id())
  and app.is_principal()
  and (tier = 'solo' or exists (
    select 1 from method_change_request r
     where r.household_id = app.household_id()
       and r.key = method_setting.key
       and r.status = 'approved'
       and r.approved_at > now() - interval '1 hour'
  ))
);

create policy mcr_read on method_change_request for select using (
  household_id = app.household_id()
);
create policy mcr_insert on method_change_request for insert with check (
  household_id = app.household_id()
  and requested_by_member_id = app.member_id()
  and app.is_principal()
);
create policy mcr_respond on method_change_request for update using (
  household_id = app.household_id()
  and app.is_principal()
  and requested_by_member_id <> app.member_id()
);

-- ------------------------------------------------- sessions and decisions
create policy session_read on session_row for select using (
  household_id = app.household_id()
  and (mode = 'joint' or app.member_id() = any(actor_member_ids))
);
create policy session_write on session_row for insert with check (
  household_id = app.household_id() and app.member_id() = any(actor_member_ids)
);
create policy session_update on session_row for update using (
  household_id = app.household_id() and app.member_id() = any(actor_member_ids)
);
create policy session_change_read on session_change for select using (
  exists (select 1 from session_row s where s.id = session_id)
);
create policy session_change_write on session_change for insert with check (
  exists (select 1 from session_row s where s.id = session_id)
);

create policy commitment_read on commitment for select using (
  household_id = app.household_id()
);
create policy commitment_write on commitment for insert with check (
  household_id = app.household_id()
);
create policy commitment_update on commitment for update using (
  household_id = app.household_id()
);

create policy decision_read on decision for select using (
  household_id = app.household_id()
  and (scope = 'joint' or owner_member_id = app.member_id())
);
create policy decision_write on decision for insert with check (
  household_id = app.household_id()
);
create policy decision_update on decision for update using (
  household_id = app.household_id()
  and (scope = 'joint' or owner_member_id = app.member_id())
);

do $$
declare t text;
begin
  foreach t in array array['decision_option','decision_criterion'] loop
    execute format($f$
      create policy %1$s_read on %1$I for select using (
        exists (select 1 from decision d where d.id = decision_id))$f$, t);
    execute format($f$
      create policy %1$s_write on %1$I for insert with check (
        exists (select 1 from decision d where d.id = decision_id))$f$, t);
    execute format($f$
      create policy %1$s_update on %1$I for update using (
        exists (select 1 from decision d where d.id = decision_id))$f$, t);
  end loop;
end $$;

-- I-3: a weight is a person's own act. You set yours, never theirs.
create policy weight_read on decision_weight for select using (
  exists (select 1 from decision_criterion c where c.id = criterion_id)
);
create policy weight_write on decision_weight for insert with check (
  member_id = app.member_id()
  and exists (select 1 from decision_criterion c where c.id = criterion_id)
);
create policy weight_update on decision_weight for update using (
  member_id = app.member_id()
);

create policy score_read on decision_score for select using (
  exists (select 1 from decision_option o where o.id = option_id)
);
create policy score_write on decision_score for insert with check (
  exists (select 1 from decision_option o where o.id = option_id)
);
create policy score_update on decision_score for update using (
  exists (select 1 from decision_option o where o.id = option_id)
);

do $$
declare t text;
begin
  foreach t in array array['decision_stage','decision_record'] loop
    execute format($f$
      create policy %1$s_read on %1$I for select using (
        exists (select 1 from decision d where d.id = decision_id))$f$, t);
    execute format($f$
      create policy %1$s_write on %1$I for insert with check (
        exists (select 1 from decision d where d.id = decision_id))$f$, t);
  end loop;
end $$;

-- --------------------------------------------------- privacy and advisory
-- Only the owner reads the log of machine reads of their own private items.
create policy prl_read on private_read_log for select using (
  owner_member_id = app.member_id()
);
create policy prl_write on private_read_log for insert with check (
  app.household_id() is not null
);

-- I-5 again, and I-10 and I-11 live in the surfacing query on top of this.
create policy finding_read on finding for select using (
  household_id = app.household_id()
  and app.member_id() = any(visible_to_member_ids)
);
create policy finding_write on finding for insert with check (
  household_id = app.household_id()
);
create policy finding_update on finding for update using (
  household_id = app.household_id()
  and app.member_id() = any(visible_to_member_ids)
);
create policy finding_ref_read on finding_reference for select using (
  exists (select 1 from finding f where f.id = finding_id)
);
create policy finding_ref_write on finding_reference for insert with check (
  exists (select 1 from finding f where f.id = finding_id)
);
create policy suppression_read on finding_suppression for select using (
  household_id = app.household_id()
);
create policy suppression_write on finding_suppression for insert with check (
  household_id = app.household_id() and member_id = app.member_id()
);

create policy advisory_read on advisory_review for select using (
  household_id = app.household_id()
);
create policy advisory_write on advisory_review for insert with check (
  household_id = app.household_id() and requested_by_member_id = app.member_id()
);
create policy advisory_update on advisory_review for update using (
  household_id = app.household_id()
);
create policy advisory_action_read on advisory_review_action for select using (
  exists (select 1 from advisory_review r where r.id = review_id)
);
create policy advisory_action_write on advisory_review_action for insert with check (
  exists (select 1 from advisory_review r where r.id = review_id)
);
create policy advisory_action_update on advisory_review_action for update using (
  exists (select 1 from advisory_review r where r.id = review_id)
);
