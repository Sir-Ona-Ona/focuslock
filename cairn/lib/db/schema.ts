import {
  boolean, char, date, integer, jsonb, numeric, pgEnum, pgTable, primaryKey,
  smallint, text, timestamp, unique, uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* ------------------------------------------------------------------ enums */

export const memberRole    = pgEnum('member_role', ['principal', 'dependent', 'advisor']);
export const trackKind     = pgEnum('track_kind', ['individual', 'joint']);
export const claimStatus   = pgEnum('claim_status', ['unclaimed', 'claimed']);
export const domainCode    = pgEnum('domain_code', ['FTH', 'FAM', 'FIN', 'CAR', 'REL', 'LRN', 'HLT']);
export const horizon       = pgEnum('horizon', ['now', 'next', 'later', 'beyond']);
export const msStatus      = pgEnum('ms_status',
  ['on_track', 'at_risk', 'slipped', 'blocked', 'done', 'parked', 'dropped']);
export const agreement     = pgEnum('agreement', ['proposed', 'agreed', 'active']);
export const confidence    = pgEnum('confidence', ['high', 'medium', 'low']);
export const asmState      = pgEnum('asm_state', ['open', 'confirmed', 'broken', 'expired_untested']);
export const depNature     = pgEnum('dep_nature', ['hard', 'soft']);
export const collKind      = pgEnum('coll_kind', ['information', 'weighting', 'values']);
export const collStatus    = pgEnum('coll_status', ['open', 'resolved', 'accepted']);
export const sessionMode   = pgEnum('session_mode', ['individual', 'joint']);
export const sessionKind   = pgEnum('session_kind', ['review', 'strategy']);
export const commitStatus  = pgEnum('commit_status', ['open', 'done', 'rolled', 'dropped']);
export const decisionScope = pgEnum('decision_scope', ['individual', 'joint']);
export const decisionState = pgEnum('decision_state', ['open', 'decided', 'deferred', 'dropped']);
export const settingTier   = pgEnum('setting_tier', ['solo', 'two_key']);
export const findingKind   = pgEnum('finding_kind', ['pattern', 'critique', 'scenario', 'reference']);
export const findingState  = pgEnum('finding_state',
  ['queued', 'surfaced', 'escalated', 'acted', 'dismissed', 'silenced']);
export const dismissReason = pgEnum('dismiss_reason',
  ['already_known', 'not_true', 'not_now', 'not_relevant']);
export const milestoneEventKind = pgEnum('milestone_event_kind',
  ['proposed', 'agreed', 'edit_proposed', 'sent_to_session', 'activated']);
export const collisionEventKind = pgEnum('collision_event_kind',
  ['opened', 'accepted', 'resolved', 'next_step_set', 'reopened']);
export const pendingStatus = pgEnum('pending_status', ['open', 'actioned', 'dismissed']);
export const obligationKind = pgEnum('obligation_kind', ['recurring', 'one_off']);
export const incomeKind    = pgEnum('income_kind', ['salary', 'business', 'rental', 'other']);
export const requestStatus = pgEnum('request_status', ['pending', 'approved', 'declined', 'withdrawn']);
export const gateStatus    = pgEnum('gate_status', ['open', 'closed']);
export const actionStatus  = pgEnum('action_status', ['proposed', 'accepted', 'declined']);
export const staleness     = pgEnum('staleness', ['low', 'medium', 'high']);

const now = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/* -------------------------------------------------------- household layer */

export const household = pgTable('household', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  reportingCurrency: char('reporting_currency', { length: 3 }).notNull().default('NGN'),
  // Cadences and timeboxes are not columns here. They are method settings, so
  // that changing one is a versioned record with a reason rather than an update,
  // and so a session run in March is rendered under the timeboxes it actually ran
  // under. A column here would be a second, unversioned copy of the same numbers.
  createdAt: now(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const member = pgTable('member', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  userId: uuid('user_id'),
  displayName: text('display_name').notNull(),
  role: memberRole('role').notNull(),
  seatNo: smallint('seat_no').notNull(),
  principalSlot: smallint('principal_slot'),
  inviteEmail: text('invite_email'),
  privateReadOptIn: boolean('private_read_opt_in').notNull().default(false),
  privateReadOptInAt: timestamp('private_read_opt_in_at', { withTimezone: true }),
  privateDisclosureSeenAt: timestamp('private_disclosure_seen_at', { withTimezone: true }),
  invitedByMemberId: uuid('invited_by_member_id'),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: now(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const advisorGrant = pgTable('advisor_grant', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => member.id),
  trackId: uuid('track_id').notNull(),
  domainCode: domainCode('domain_code').notNull(),
  grantedByMemberId: uuid('granted_by_member_id').notNull().references(() => member.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
    .default(sql`now() + interval '90 days'`),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

/* ---------------------------------------------------------- tracks, plan */

export const track = pgTable('track', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  kind: trackKind('kind').notNull(),
  ownerMemberId: uuid('owner_member_id').references(() => member.id),
  claimStatus: claimStatus('claim_status').notNull().default('unclaimed'),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  northStar: text('north_star'),
  version: integer('version').notNull().default(1),
});

export const domain = pgTable('domain', {
  code: domainCode('code').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  sortOrder: smallint('sort_order').notNull(),
});

export const goal = pgTable('goal', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  domainCode: domainCode('domain_code').notNull(),
  horizon: horizon('horizon').notNull().default('now'),
  text: text('text').notNull(),
  sortOrder: smallint('sort_order').notNull().default(0),
  createdAt: now(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const milestone = pgTable('milestone', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  domainCode: domainCode('domain_code').notNull(),
  ref: text('ref').notNull(),
  title: text('title').notNull(),
  note: text('note'),
  targetDate: date('target_date').notNull(),
  originalTargetDate: date('original_target_date').notNull(),
  status: msStatus('status'),
  statusReason: text('status_reason'),
  agreement: agreement('agreement'),
  proposedByMemberId: uuid('proposed_by_member_id').references(() => member.id),
  lastAuthoredByMemberId: uuid('last_authored_by_member_id').references(() => member.id),
  agreedByMemberId: uuid('agreed_by_member_id').references(() => member.id),
  agreedAt: timestamp('agreed_at', { withTimezone: true }),
  isPrivate: boolean('is_private').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: now(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('milestone_ref_unique').on(t.trackId, t.ref)]);

export const milestoneMove = pgTable('milestone_move', {
  id: uuid('id').primaryKey().defaultRandom(),
  milestoneId: uuid('milestone_id').notNull().references(() => milestone.id),
  fromDate: date('from_date').notNull(),
  toDate: date('to_date').notNull(),
  movedAt: timestamp('moved_at', { withTimezone: true }).notNull().defaultNow(),
  movedByMemberId: uuid('moved_by_member_id').references(() => member.id),
  reason: text('reason'),
});

export const milestoneEvent = pgTable('milestone_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  milestoneId: uuid('milestone_id').notNull().references(() => milestone.id),
  event: milestoneEventKind('event').notNull(),
  byMemberId: uuid('by_member_id').notNull().references(() => member.id),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  note: text('note'),
});

export const assumption = pgTable('assumption', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  domainCode: domainCode('domain_code').notNull(),
  ref: text('ref').notNull(),
  statement: text('statement').notNull(),
  confidence: confidence('confidence').notNull(),
  testBy: date('test_by').notNull(),
  state: asmState('state').notNull().default('open'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  carriedReviewCount: integer('carried_review_count').notNull().default(0),
  createdAt: now(),
}, (t) => [unique('assumption_ref_unique').on(t.trackId, t.ref)]);

export const assumptionMilestone = pgTable('assumption_milestone', {
  assumptionId: uuid('assumption_id').notNull().references(() => assumption.id),
  milestoneId: uuid('milestone_id').notNull().references(() => milestone.id),
}, (t) => [primaryKey({ columns: [t.assumptionId, t.milestoneId] })]);

export const risk = pgTable('risk', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  domainCode: domainCode('domain_code').notNull(),
  ref: text('ref').notNull(),
  statement: text('statement').notNull(),
  likelihood: confidence('likelihood').notNull(),
  impact: confidence('impact').notNull(),
  mitigation: text('mitigation'),
  ownerMemberId: uuid('owner_member_id').references(() => member.id),
  createdAt: now(),
}, (t) => [unique('risk_ref_unique').on(t.trackId, t.ref)]);

export const constraintRow = pgTable('constraint_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  ref: text('ref').notNull(),
  statement: text('statement').notNull(),
  agreedAt: date('agreed_at'),
  source: text('source'),
  isHard: boolean('is_hard').notNull().default(false),
  createdAt: now(),
}, (t) => [unique('constraint_ref_unique').on(t.trackId, t.ref)]);

/* ------------------------------------------------ the two capacity models */

export const domainLoad = pgTable('domain_load', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  domainCode: domainCode('domain_code').notNull(),
  hoursPerWeek: numeric('hours_per_week', { precision: 4, scale: 1 }).notNull(),
  hoursPerWeekBad: numeric('hours_per_week_bad', { precision: 4, scale: 1 }),
  statedAt: timestamp('stated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('domain_load_unique').on(t.trackId, t.domainCode)]);

export const capacity = pgTable('capacity', {
  trackId: uuid('track_id').primaryKey().references(() => track.id),
  ceilingHoursPerWeek: numeric('ceiling_hours_per_week', { precision: 4, scale: 1 }).notNull(),
  earlySignal: text('early_signal'),
  statedAt: timestamp('stated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const income = pgTable('income', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  label: text('label').notNull(),
  kind: incomeKind('kind').notNull(),
  amountMonthly: numeric('amount_monthly', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  confidence: confidence('confidence').notNull(),
  startsOn: date('starts_on').notNull(),
  endsOn: date('ends_on'),
  isAssumed: boolean('is_assumed').notNull().default(false),
  builtByMilestoneId: uuid('built_by_milestone_id').references(() => milestone.id),
  statedAt: timestamp('stated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const obligation = pgTable('obligation', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  domainCode: domainCode('domain_code').notNull(),
  milestoneId: uuid('milestone_id').references(() => milestone.id),
  label: text('label').notNull(),
  kind: obligationKind('kind').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  startsOn: date('starts_on').notNull(),
  endsOn: date('ends_on'),
  committed: boolean('committed').notNull().default(false),
  statedAt: timestamp('stated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reserve = pgTable('reserve', {
  trackId: uuid('track_id').primaryKey().references(() => track.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  targetMonths: numeric('target_months', { precision: 4, scale: 1 }).notNull(),
  statedAt: timestamp('stated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fxAssumption = pgTable('fx_assumption', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  base: char('base', { length: 3 }).notNull(),
  quote: char('quote', { length: 3 }).notNull(),
  rate: numeric('rate', { precision: 14, scale: 6 }).notNull(),
  assumptionId: uuid('assumption_id').references(() => assumption.id),
  statedAt: timestamp('stated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('fx_pair_unique').on(t.householdId, t.base, t.quote)]);

export const pendingItem = pgTable('pending_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id').notNull().references(() => track.id),
  raisedByMemberId: uuid('raised_by_member_id').notNull().references(() => member.id),
  raisedAt: timestamp('raised_at', { withTimezone: true }).notNull().defaultNow(),
  text: text('text').notNull(),
  status: pendingStatus('status').notNull().default('open'),
});

/* ----------------------------------------------------------- cross track */

export const dependency = pgTable('dependency', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  fromMilestoneId: uuid('from_milestone_id').notNull().references(() => milestone.id),
  toMilestoneId: uuid('to_milestone_id').notNull().references(() => milestone.id),
  nature: depNature('nature').notNull(),
  note: text('note'),
});

export const collision = pgTable('collision', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  ref: text('ref').notNull(),
  tension: text('tension').notNull(),
  tracks: uuid('tracks').array().notNull(),
  domains: domainCode('domains').array().notNull(),
  contestedFrom: date('contested_from'),
  contestedTo: date('contested_to'),
  kind: collKind('kind'),
  status: collStatus('status').notNull().default('open'),
  resolvedByDecisionId: uuid('resolved_by_decision_id'),
  acceptedCost: text('accepted_cost'),
  costCarriedByMemberId: uuid('cost_carried_by_member_id').references(() => member.id),
  nextStep: text('next_step'),
  nextStepOwnerMemberId: uuid('next_step_owner_member_id').references(() => member.id),
  nextStepDue: date('next_step_due'),
  derivedFromPrivate: boolean('derived_from_private').notNull().default(false),
  visibleToMemberId: uuid('visible_to_member_id').references(() => member.id),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => [unique('collision_ref_unique').on(t.householdId, t.ref)]);

export const collisionEvent = pgTable('collision_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  collisionId: uuid('collision_id').notNull().references(() => collision.id),
  event: collisionEventKind('event').notNull(),
  byMemberId: uuid('by_member_id').references(() => member.id),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  acceptedCost: text('accepted_cost'),
  costCarriedByMemberId: uuid('cost_carried_by_member_id').references(() => member.id),
  nextStep: text('next_step'),
  nextStepOwnerMemberId: uuid('next_step_owner_member_id').references(() => member.id),
  nextStepDue: date('next_step_due'),
  decisionId: uuid('decision_id'),
});

export const gate = pgTable('gate', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  ref: text('ref').notNull(),
  title: text('title').notNull(),
  decideBy: date('decide_by').notNull(),
  trigger: text('trigger'),
  tracks: uuid('tracks').array().notNull().default(sql`'{}'::uuid[]`),
  domains: domainCode('domains').array().notNull().default(sql`'{}'::domain_code[]`),
  outcomes: text('outcomes').array().notNull().default(sql`'{}'::text[]`),
  status: gateStatus('status').notNull().default('open'),
  closedByDecisionId: uuid('closed_by_decision_id'),
}, (t) => [unique('gate_ref_unique').on(t.householdId, t.ref)]);

/* ------------------------------------------- sessions, commitments, logs */

export const methodVersion = pgTable('method_version', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').references(() => household.id),
  version: integer('version').notNull(),
  label: text('label').notNull(),
  basedOnVersionId: uuid('based_on_version_id'),
  createdByMemberId: uuid('created_by_member_id').references(() => member.id),
  createdAt: now(),
  note: text('note').notNull(),
  active: boolean('active').notNull().default(false),
});

export const methodSetting = pgTable('method_setting', {
  id: uuid('id').primaryKey().defaultRandom(),
  methodVersionId: uuid('method_version_id').notNull().references(() => methodVersion.id),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  defaultValue: jsonb('default_value').notNull(),
  tier: settingTier('tier').notNull().default('solo'),
  protects: text('protects'),
  rationale: text('rationale').notNull(),
}, (t) => [unique('method_setting_unique').on(t.methodVersionId, t.key)]);

export const methodChangeRequest = pgTable('method_change_request', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  key: text('key').notNull(),
  fromValue: jsonb('from_value').notNull(),
  toValue: jsonb('to_value').notNull(),
  requestedByMemberId: uuid('requested_by_member_id').notNull().references(() => member.id),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  approvedByMemberId: uuid('approved_by_member_id').references(() => member.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  status: requestStatus('status').notNull().default('pending'),
  reason: text('reason').notNull(),
  declineReason: text('decline_reason'),
});

export const sessionRow = pgTable('session_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  kind: sessionKind('kind').notNull(),
  mode: sessionMode('mode').notNull(),
  methodVersionId: uuid('method_version_id').notNull().references(() => methodVersion.id),
  actorMemberIds: uuid('actor_member_ids').array().notNull(),
  plannedMinutes: integer('planned_minutes').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  gapDays: integer('gap_days'),
  blockLog: jsonb('block_log'),
  summary: jsonb('summary'),
  transcriptRef: text('transcript_ref'),
});

export const sessionChange = pgTable('session_change', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessionRow.id),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  field: text('field').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  reason: text('reason'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});

export const commitment = pgTable('commitment', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessionRow.id),
  householdId: uuid('household_id').notNull().references(() => household.id),
  text: text('text').notNull(),
  ownerMemberId: uuid('owner_member_id').notNull().references(() => member.id),
  dueDate: date('due_date').notNull(),
  status: commitStatus('status').notNull().default('open'),
  rolledFromCommitmentId: uuid('rolled_from_commitment_id'),
  createdAt: now(),
});

/* ------------------------------------------------------------- decisions */

export const decision = pgTable('decision', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  ref: text('ref').notNull(),
  scope: decisionScope('scope').notNull(),
  ownerMemberId: uuid('owner_member_id').references(() => member.id),
  methodVersionId: uuid('method_version_id').notNull().references(() => methodVersion.id),
  title: text('title').notNull(),
  question: text('question').notNull(),
  decideBy: date('decide_by').notNull(),
  state: decisionState('state').notNull().default('open'),
  outcome: text('outcome'),
  costAccepted: text('cost_accepted'),
  revisitConditions: text('revisit_conditions'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decidedInSessionId: uuid('decided_in_session_id').references(() => sessionRow.id),
  gateId: uuid('gate_id').references(() => gate.id),
  createdAt: now(),
}, (t) => [unique('decision_ref_unique').on(t.householdId, t.ref)]);

export const decisionOption = pgTable('decision_option', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').notNull().references(() => decision.id),
  key: char('key', { length: 1 }).notNull(),
  label: text('label').notNull(),
  description: text('description'),
  isStatusQuo: boolean('is_status_quo').notNull().default(false),
});

export const decisionCriterion = pgTable('decision_criterion', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').notNull().references(() => decision.id),
  key: text('key').notNull(),
  label: text('label').notNull(),
  derivedFrom: text('derived_from'),
});

export const decisionWeight = pgTable('decision_weight', {
  id: uuid('id').primaryKey().defaultRandom(),
  criterionId: uuid('criterion_id').notNull().references(() => decisionCriterion.id),
  memberId: uuid('member_id').notNull().references(() => member.id),
  weight: smallint('weight').notNull(),
}, (t) => [unique('decision_weight_unique').on(t.criterionId, t.memberId)]);

export const decisionScore = pgTable('decision_score', {
  id: uuid('id').primaryKey().defaultRandom(),
  optionId: uuid('option_id').notNull().references(() => decisionOption.id),
  criterionId: uuid('criterion_id').notNull().references(() => decisionCriterion.id),
  score: smallint('score').notNull(),
  rationale: text('rationale'),
}, (t) => [unique('decision_score_unique').on(t.optionId, t.criterionId)]);

export const decisionStage = pgTable('decision_stage', {
  decisionId: uuid('decision_id').primaryKey().references(() => decision.id),
  informationBought: text('information_bought').notNull(),
  ownerMemberId: uuid('owner_member_id').notNull().references(() => member.id),
  finalDecideBy: date('final_decide_by').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }).notNull().defaultNow(),
});

export const decisionRecord = pgTable('decision_record', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').notNull().references(() => decision.id),
  chosenOptionId: uuid('chosen_option_id').references(() => decisionOption.id),
  because: text('because').notNull(),
  uncertainAtTheTime: text('uncertain_at_the_time'),
  reconsiderIf: text('reconsider_if'),
  reviewDate: date('review_date'),
  supersedesDecisionId: uuid('supersedes_decision_id'),
  supersededByDecisionId: uuid('superseded_by_decision_id'),
  decidedByMemberIds: uuid('decided_by_member_ids').array().notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ----------------------------------------------------- privacy, advisory */

export const privateReadLog = pgTable('private_read_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemType: text('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  ownerMemberId: uuid('owner_member_id').notNull().references(() => member.id),
  readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  purpose: text('purpose').notNull(),
  runId: uuid('run_id'),
});

export const findingRule = pgTable('finding_rule', {
  code: text('code').primaryKey(),
  kind: findingKind('kind').notNull(),
  title: text('title').notNull(),
  bar: jsonb('bar').notNull(),
  windowDays: integer('window_days').notNull(),
  minHistoryDays: integer('min_history_days').notNull().default(0),
  domainsExcluded: domainCode('domains_excluded').array().notNull()
    .default(sql`'{}'::domain_code[]`),
  enabled: boolean('enabled').notNull().default(true),
});

export const finding = pgTable('finding', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  ruleCode: text('rule_code').notNull().references(() => findingRule.code),
  kind: findingKind('kind').notNull(),
  subjectType: text('subject_type').notNull(),
  subjectIds: uuid('subject_ids').array().notNull(),
  evidence: jsonb('evidence').notNull(),
  observation: text('observation'),
  window: text('window'),
  reading: text('reading'),
  disconfirm: text('disconfirm'),
  severity: numeric('severity', { precision: 6, scale: 2 }).notNull(),
  visibleToMemberIds: uuid('visible_to_member_ids').array().notNull(),
  derivedFromPrivate: boolean('derived_from_private').notNull().default(false),
  state: findingState('state').notNull().default('queued'),
  methodVersionId: uuid('method_version_id').notNull().references(() => methodVersion.id),
  surfacedCount: integer('surfaced_count').notNull().default(0),
  firstTrueAt: timestamp('first_true_at', { withTimezone: true }),
  createdAt: now(),
  evidenceHash: text('evidence_hash').notNull(),
});

export const findingReference = pgTable('finding_reference', {
  findingId: uuid('finding_id').primaryKey().references(() => finding.id),
  claim: text('claim').notNull(),
  isGeneralKnowledge: boolean('is_general_knowledge').notNull().default(true),
  notApplicableIf: text('not_applicable_if').notNull(),
  confidence: confidence('confidence').notNull(),
  stalenessRisk: staleness('staleness_risk').notNull(),
  verifiedAgainst: text('verified_against'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
});

export const findingSuppression = pgTable('finding_suppression', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  memberId: uuid('member_id').notNull().references(() => member.id),
  ruleCode: text('rule_code').notNull().references(() => findingRule.code),
  reason: dismissReason('reason').notNull(),
  until: timestamp('until', { withTimezone: true }),
  createdAt: now(),
});

export const advisoryReview = pgTable('advisory_review', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => household.id),
  requestedByMemberId: uuid('requested_by_member_id').notNull().references(() => member.id),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  methodVersionId: uuid('method_version_id').notNull().references(() => methodVersion.id),
  scope: text('scope').notNull(),
  trackId: uuid('track_id').references(() => track.id),
  inputsHash: text('inputs_hash'),
  sections: jsonb('sections'),
  actions: jsonb('actions'),
  computedFacts: jsonb('computed_facts'),
  artifactUrl: text('artifact_url'),
});

export const advisoryReviewAction = pgTable('advisory_review_action', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').notNull().references(() => advisoryReview.id),
  rank: smallint('rank').notNull(),
  action: text('action').notNull(),
  cost: text('cost'),
  forecloses: text('forecloses'),
  timing: text('timing'),
  status: actionStatus('status').notNull().default('proposed'),
  acceptedMilestoneId: uuid('accepted_milestone_id').references(() => milestone.id),
});
