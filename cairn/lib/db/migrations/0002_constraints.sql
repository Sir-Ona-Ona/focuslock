-- Cairn: the invariants that are structure rather than convention.
-- Every constraint here maps to a numbered invariant in CAIRN-BUILD.md section 2.

-- ---------------------------------------------------------------- household

-- at most 6 live members, at most 2 principals
create unique index member_seat_idx on member (household_id, seat_no)
  where deleted_at is null;
alter table member add constraint seat_in_range check (seat_no between 1 and 6);

create unique index member_principal_idx on member (household_id, principal_slot)
  where role = 'principal' and deleted_at is null;
alter table member add constraint principal_slot_range check (principal_slot in (1, 2));
alter table member add constraint principal_slot_iff_principal
  check ((role = 'principal') = (principal_slot is not null));

-- one joint track per household, one individual track per member
create unique index track_joint_idx on track (household_id) where kind = 'joint';
create unique index track_owner_idx on track (owner_member_id) where kind = 'individual';
alter table track add constraint joint_has_no_owner
  check ((kind = 'joint') = (owner_member_id is null));

-- ---------------------------------------------------------------- milestone

-- I-6: a parked or dropped item says why. Nothing disappears silently.
alter table milestone add constraint parked_needs_reason
  check (status is null or status not in ('parked', 'dropped') or status_reason is not null);

-- I-2: nobody agrees their own proposal
alter table milestone add constraint no_self_agree
  check (agreed_by_member_id is null
         or agreed_by_member_id <> proposed_by_member_id);

-- I-2b: a proposed item has no execution status, an agreed one must have one
alter table milestone add constraint status_follows_agreement
  check (agreement is null
         or (agreement = 'proposed' and status is null)
         or (agreement in ('agreed', 'active') and status is not null));

-- privacy is an individual track affair, agreement is a joint track affair
create or replace function app.track_kind(t uuid) returns track_kind
language sql stable as $$ select kind from track where id = t $$;

alter table milestone add constraint private_only_individual
  check (not is_private or app.track_kind(track_id) = 'individual');
alter table milestone add constraint agreement_only_joint
  check ((agreement is not null) = (app.track_kind(track_id) = 'joint'));

-- I-6: an individual milestone always carries a status
alter table milestone add constraint individual_has_status
  check (app.track_kind(track_id) <> 'individual' or status is not null);

-- ------------------------------------------------------------------- money

alter table obligation add constraint one_off_has_date
  check (kind <> 'one_off' or starts_on is not null);
alter table obligation add constraint recurring_has_span
  check (kind <> 'recurring' or starts_on is not null);
alter table obligation add constraint amount_positive check (amount > 0);
alter table income add constraint income_positive check (amount_monthly > 0);

-- --------------------------------------------------------------- collision

alter table collision add constraint accepted_needs_cost
  check (status <> 'accepted' or (accepted_cost is not null
         and cost_carried_by_member_id is not null));
alter table collision add constraint open_needs_next_step
  check (status <> 'open' or next_step is null or
         (next_step_owner_member_id is not null and next_step_due is not null));
-- I-5: a private derived collision is scoped to exactly one member
alter table collision add constraint private_derived_is_scoped
  check (not derived_from_private or visible_to_member_id is not null);

-- ------------------------------------------------------------------ method

alter table method_setting add constraint two_key_names_who
  check (tier <> 'two_key' or (protects is not null and length(btrim(protects)) > 0));
alter table method_setting add constraint rationale_required
  check (length(btrim(rationale)) > 0);

-- I-12f: the requester is never the approver
alter table method_change_request add constraint no_self_approve
  check (approved_by_member_id is null
         or approved_by_member_id <> requested_by_member_id);

alter table method_version add constraint change_needs_reason
  check (length(btrim(note)) > 0);
create unique index method_version_active_idx on method_version (household_id)
  where active and household_id is not null;
create unique index method_version_canonical_idx on method_version ((household_id is null))
  where active and household_id is null;
create unique index method_version_seq_idx on method_version (household_id, version);

-- ---------------------------------------------------------------- decision

alter table decision_score add constraint score_in_band check (score between 1 and 5);
alter table decision_weight add constraint weight_in_band check (weight between 0 and 100);

-- ---------------------------------------------------------------- advisory

-- I-9: no finding class without a numeric bar
alter table finding_rule add constraint bar_required check (jsonb_typeof(bar) = 'object');

-- reference findings never touch faith, family or health
alter table finding_rule add constraint reference_domain_gate
  check (kind <> 'reference'
         or domains_excluded @> array['FTH','FAM','HLT']::domain_code[]);

alter table finding_reference add constraint not_applicable_required
  check (length(btrim(not_applicable_if)) > 0);

-- I-5: a private derived finding is visible to exactly one member
alter table finding add constraint private_finding_scoped
  check (not derived_from_private or array_length(visible_to_member_ids, 1) = 1);
