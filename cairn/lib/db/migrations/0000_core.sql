CREATE TYPE "public"."action_status" AS ENUM('proposed', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."agreement" AS ENUM('proposed', 'agreed', 'active');--> statement-breakpoint
CREATE TYPE "public"."asm_state" AS ENUM('open', 'confirmed', 'broken', 'expired_untested');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('unclaimed', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."coll_kind" AS ENUM('information', 'weighting', 'values');--> statement-breakpoint
CREATE TYPE "public"."coll_status" AS ENUM('open', 'resolved', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."collision_event_kind" AS ENUM('opened', 'accepted', 'resolved', 'next_step_set', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."commit_status" AS ENUM('open', 'done', 'rolled', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."decision_scope" AS ENUM('individual', 'joint');--> statement-breakpoint
CREATE TYPE "public"."decision_state" AS ENUM('open', 'decided', 'deferred', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."dep_nature" AS ENUM('hard', 'soft');--> statement-breakpoint
CREATE TYPE "public"."dismiss_reason" AS ENUM('already_known', 'not_true', 'not_now', 'not_relevant');--> statement-breakpoint
CREATE TYPE "public"."domain_code" AS ENUM('FTH', 'FAM', 'FIN', 'CAR', 'REL', 'LRN', 'HLT');--> statement-breakpoint
CREATE TYPE "public"."finding_kind" AS ENUM('pattern', 'critique', 'scenario', 'reference');--> statement-breakpoint
CREATE TYPE "public"."finding_state" AS ENUM('queued', 'surfaced', 'escalated', 'acted', 'dismissed', 'silenced');--> statement-breakpoint
CREATE TYPE "public"."gate_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."horizon" AS ENUM('now', 'next', 'later', 'beyond');--> statement-breakpoint
CREATE TYPE "public"."income_kind" AS ENUM('salary', 'business', 'rental', 'other');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('principal', 'dependent', 'advisor');--> statement-breakpoint
CREATE TYPE "public"."milestone_event_kind" AS ENUM('proposed', 'agreed', 'edit_proposed', 'sent_to_session', 'activated');--> statement-breakpoint
CREATE TYPE "public"."ms_status" AS ENUM('on_track', 'at_risk', 'slipped', 'blocked', 'done', 'parked', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."obligation_kind" AS ENUM('recurring', 'one_off');--> statement-breakpoint
CREATE TYPE "public"."pending_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."session_kind" AS ENUM('review', 'strategy');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('individual', 'joint');--> statement-breakpoint
CREATE TYPE "public"."setting_tier" AS ENUM('solo', 'two_key');--> statement-breakpoint
CREATE TYPE "public"."staleness" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."track_kind" AS ENUM('individual', 'joint');--> statement-breakpoint
CREATE TABLE "advisor_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"domain_code" "domain_code" NOT NULL,
	"granted_by_member_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '90 days' NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "advisory_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"requested_by_member_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"method_version_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"track_id" uuid,
	"inputs_hash" text,
	"sections" jsonb,
	"actions" jsonb,
	"computed_facts" jsonb,
	"artifact_url" text
);
--> statement-breakpoint
CREATE TABLE "advisory_review_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"rank" smallint NOT NULL,
	"action" text NOT NULL,
	"cost" text,
	"forecloses" text,
	"timing" text,
	"status" "action_status" DEFAULT 'proposed' NOT NULL,
	"accepted_milestone_id" uuid
);
--> statement-breakpoint
CREATE TABLE "assumption" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"domain_code" "domain_code" NOT NULL,
	"ref" text NOT NULL,
	"statement" text NOT NULL,
	"confidence" "confidence" NOT NULL,
	"test_by" date NOT NULL,
	"state" "asm_state" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"carried_review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assumption_ref_unique" UNIQUE("track_id","ref")
);
--> statement-breakpoint
CREATE TABLE "assumption_milestone" (
	"assumption_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	CONSTRAINT "assumption_milestone_assumption_id_milestone_id_pk" PRIMARY KEY("assumption_id","milestone_id")
);
--> statement-breakpoint
CREATE TABLE "capacity" (
	"track_id" uuid PRIMARY KEY NOT NULL,
	"ceiling_hours_per_week" numeric(4, 1) NOT NULL,
	"early_signal" text,
	"stated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"ref" text NOT NULL,
	"tension" text NOT NULL,
	"tracks" uuid[] NOT NULL,
	"domains" "domain_code"[] NOT NULL,
	"contested_from" date,
	"contested_to" date,
	"kind" "coll_kind",
	"status" "coll_status" DEFAULT 'open' NOT NULL,
	"resolved_by_decision_id" uuid,
	"accepted_cost" text,
	"cost_carried_by_member_id" uuid,
	"next_step" text,
	"next_step_owner_member_id" uuid,
	"next_step_due" date,
	"derived_from_private" boolean DEFAULT false NOT NULL,
	"visible_to_member_id" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "collision_ref_unique" UNIQUE("household_id","ref")
);
--> statement-breakpoint
CREATE TABLE "collision_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collision_id" uuid NOT NULL,
	"event" "collision_event_kind" NOT NULL,
	"by_member_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_cost" text,
	"cost_carried_by_member_id" uuid,
	"next_step" text,
	"next_step_owner_member_id" uuid,
	"next_step_due" date,
	"decision_id" uuid
);
--> statement-breakpoint
CREATE TABLE "commitment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"household_id" uuid NOT NULL,
	"text" text NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"status" "commit_status" DEFAULT 'open' NOT NULL,
	"rolled_from_commitment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constraint_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"ref" text NOT NULL,
	"statement" text NOT NULL,
	"agreed_at" date,
	"source" text,
	"is_hard" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constraint_ref_unique" UNIQUE("track_id","ref")
);
--> statement-breakpoint
CREATE TABLE "decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"ref" text NOT NULL,
	"scope" "decision_scope" NOT NULL,
	"owner_member_id" uuid,
	"method_version_id" uuid NOT NULL,
	"title" text NOT NULL,
	"question" text NOT NULL,
	"decide_by" date NOT NULL,
	"state" "decision_state" DEFAULT 'open' NOT NULL,
	"outcome" text,
	"cost_accepted" text,
	"revisit_conditions" text,
	"decided_at" timestamp with time zone,
	"decided_in_session_id" uuid,
	"gate_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decision_ref_unique" UNIQUE("household_id","ref")
);
--> statement-breakpoint
CREATE TABLE "decision_criterion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"derived_from" text
);
--> statement-breakpoint
CREATE TABLE "decision_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"key" char(1) NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_status_quo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"chosen_option_id" uuid,
	"because" text NOT NULL,
	"uncertain_at_the_time" text,
	"reconsider_if" text,
	"review_date" date,
	"supersedes_decision_id" uuid,
	"superseded_by_decision_id" uuid,
	"decided_by_member_ids" uuid[] NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"rationale" text,
	CONSTRAINT "decision_score_unique" UNIQUE("option_id","criterion_id")
);
--> statement-breakpoint
CREATE TABLE "decision_stage" (
	"decision_id" uuid PRIMARY KEY NOT NULL,
	"information_bought" text NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"final_decide_by" date NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_weight" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criterion_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"weight" smallint NOT NULL,
	CONSTRAINT "decision_weight_unique" UNIQUE("criterion_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "dependency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"from_milestone_id" uuid NOT NULL,
	"to_milestone_id" uuid NOT NULL,
	"nature" "dep_nature" NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "domain" (
	"code" "domain_code" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"sort_order" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_load" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"domain_code" "domain_code" NOT NULL,
	"hours_per_week" numeric(4, 1) NOT NULL,
	"hours_per_week_bad" numeric(4, 1),
	"stated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_load_unique" UNIQUE("track_id","domain_code")
);
--> statement-breakpoint
CREATE TABLE "finding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"rule_code" text NOT NULL,
	"kind" "finding_kind" NOT NULL,
	"subject_type" text NOT NULL,
	"subject_ids" uuid[] NOT NULL,
	"evidence" jsonb NOT NULL,
	"observation" text,
	"window" text,
	"reading" text,
	"disconfirm" text,
	"severity" numeric(6, 2) NOT NULL,
	"visible_to_member_ids" uuid[] NOT NULL,
	"derived_from_private" boolean DEFAULT false NOT NULL,
	"state" "finding_state" DEFAULT 'queued' NOT NULL,
	"method_version_id" uuid NOT NULL,
	"surfaced_count" integer DEFAULT 0 NOT NULL,
	"first_true_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_reference" (
	"finding_id" uuid PRIMARY KEY NOT NULL,
	"claim" text NOT NULL,
	"is_general_knowledge" boolean DEFAULT true NOT NULL,
	"not_applicable_if" text NOT NULL,
	"confidence" "confidence" NOT NULL,
	"staleness_risk" "staleness" NOT NULL,
	"verified_against" text,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "finding_rule" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" "finding_kind" NOT NULL,
	"title" text NOT NULL,
	"bar" jsonb NOT NULL,
	"window_days" integer NOT NULL,
	"min_history_days" integer DEFAULT 0 NOT NULL,
	"domains_excluded" "domain_code"[] DEFAULT '{}'::domain_code[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_suppression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"rule_code" text NOT NULL,
	"reason" "dismiss_reason" NOT NULL,
	"until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_assumption" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"base" char(3) NOT NULL,
	"quote" char(3) NOT NULL,
	"rate" numeric(14, 6) NOT NULL,
	"assumption_id" uuid,
	"stated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fx_pair_unique" UNIQUE("household_id","base","quote")
);
--> statement-breakpoint
CREATE TABLE "gate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"ref" text NOT NULL,
	"title" text NOT NULL,
	"decide_by" date NOT NULL,
	"trigger" text,
	"tracks" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"domains" "domain_code"[] DEFAULT '{}'::domain_code[] NOT NULL,
	"outcomes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "gate_status" DEFAULT 'open' NOT NULL,
	"closed_by_decision_id" uuid,
	CONSTRAINT "gate_ref_unique" UNIQUE("household_id","ref")
);
--> statement-breakpoint
CREATE TABLE "goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"domain_code" "domain_code" NOT NULL,
	"horizon" "horizon" DEFAULT 'now' NOT NULL,
	"text" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"reporting_currency" char(3) DEFAULT 'NGN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "income" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kind" "income_kind" NOT NULL,
	"amount_monthly" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"confidence" "confidence" NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"is_assumed" boolean DEFAULT false NOT NULL,
	"built_by_milestone_id" uuid,
	"stated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"role" "member_role" NOT NULL,
	"seat_no" smallint NOT NULL,
	"principal_slot" smallint,
	"invite_email" text,
	"private_read_opt_in" boolean DEFAULT false NOT NULL,
	"private_read_opt_in_at" timestamp with time zone,
	"private_disclosure_seen_at" timestamp with time zone,
	"invited_by_member_id" uuid,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "method_change_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"key" text NOT NULL,
	"from_value" jsonb NOT NULL,
	"to_value" jsonb NOT NULL,
	"requested_by_member_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by_member_id" uuid,
	"approved_at" timestamp with time zone,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"decline_reason" text
);
--> statement-breakpoint
CREATE TABLE "method_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method_version_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"default_value" jsonb NOT NULL,
	"tier" "setting_tier" DEFAULT 'solo' NOT NULL,
	"protects" text,
	"rationale" text NOT NULL,
	CONSTRAINT "method_setting_unique" UNIQUE("method_version_id","key")
);
--> statement-breakpoint
CREATE TABLE "method_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid,
	"version" integer NOT NULL,
	"label" text NOT NULL,
	"based_on_version_id" uuid,
	"created_by_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"domain_code" "domain_code" NOT NULL,
	"ref" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"target_date" date NOT NULL,
	"original_target_date" date NOT NULL,
	"status" "ms_status",
	"status_reason" text,
	"agreement" "agreement",
	"proposed_by_member_id" uuid,
	"last_authored_by_member_id" uuid,
	"agreed_by_member_id" uuid,
	"agreed_at" timestamp with time zone,
	"is_private" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_ref_unique" UNIQUE("track_id","ref")
);
--> statement-breakpoint
CREATE TABLE "milestone_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"event" "milestone_event_kind" NOT NULL,
	"by_member_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "milestone_move" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"moved_by_member_id" uuid,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "obligation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"domain_code" "domain_code" NOT NULL,
	"milestone_id" uuid,
	"label" text NOT NULL,
	"kind" "obligation_kind" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"committed" boolean DEFAULT false NOT NULL,
	"stated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"raised_by_member_id" uuid NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"text" text NOT NULL,
	"status" "pending_status" DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "private_read_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" text NOT NULL,
	"item_id" uuid NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purpose" text NOT NULL,
	"run_id" uuid
);
--> statement-breakpoint
CREATE TABLE "reserve" (
	"track_id" uuid PRIMARY KEY NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"target_months" numeric(4, 1) NOT NULL,
	"stated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"domain_code" "domain_code" NOT NULL,
	"ref" text NOT NULL,
	"statement" text NOT NULL,
	"likelihood" "confidence" NOT NULL,
	"impact" "confidence" NOT NULL,
	"mitigation" text,
	"owner_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_ref_unique" UNIQUE("track_id","ref")
);
--> statement-breakpoint
CREATE TABLE "session_change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"reason" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" "session_kind" NOT NULL,
	"mode" "session_mode" NOT NULL,
	"method_version_id" uuid NOT NULL,
	"actor_member_ids" uuid[] NOT NULL,
	"planned_minutes" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"gap_days" integer,
	"block_log" jsonb,
	"summary" jsonb,
	"transcript_ref" text
);
--> statement-breakpoint
CREATE TABLE "track" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" "track_kind" NOT NULL,
	"owner_member_id" uuid,
	"claim_status" "claim_status" DEFAULT 'unclaimed' NOT NULL,
	"claimed_at" timestamp with time zone,
	"north_star" text,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advisor_grant" ADD CONSTRAINT "advisor_grant_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_grant" ADD CONSTRAINT "advisor_grant_granted_by_member_id_member_id_fk" FOREIGN KEY ("granted_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_review" ADD CONSTRAINT "advisory_review_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_review" ADD CONSTRAINT "advisory_review_requested_by_member_id_member_id_fk" FOREIGN KEY ("requested_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_review" ADD CONSTRAINT "advisory_review_method_version_id_method_version_id_fk" FOREIGN KEY ("method_version_id") REFERENCES "public"."method_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_review" ADD CONSTRAINT "advisory_review_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_review_action" ADD CONSTRAINT "advisory_review_action_review_id_advisory_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."advisory_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_review_action" ADD CONSTRAINT "advisory_review_action_accepted_milestone_id_milestone_id_fk" FOREIGN KEY ("accepted_milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumption" ADD CONSTRAINT "assumption_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumption_milestone" ADD CONSTRAINT "assumption_milestone_assumption_id_assumption_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "public"."assumption"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumption_milestone" ADD CONSTRAINT "assumption_milestone_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity" ADD CONSTRAINT "capacity_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision" ADD CONSTRAINT "collision_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision" ADD CONSTRAINT "collision_cost_carried_by_member_id_member_id_fk" FOREIGN KEY ("cost_carried_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision" ADD CONSTRAINT "collision_next_step_owner_member_id_member_id_fk" FOREIGN KEY ("next_step_owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision" ADD CONSTRAINT "collision_visible_to_member_id_member_id_fk" FOREIGN KEY ("visible_to_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision_event" ADD CONSTRAINT "collision_event_collision_id_collision_id_fk" FOREIGN KEY ("collision_id") REFERENCES "public"."collision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision_event" ADD CONSTRAINT "collision_event_by_member_id_member_id_fk" FOREIGN KEY ("by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision_event" ADD CONSTRAINT "collision_event_cost_carried_by_member_id_member_id_fk" FOREIGN KEY ("cost_carried_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collision_event" ADD CONSTRAINT "collision_event_next_step_owner_member_id_member_id_fk" FOREIGN KEY ("next_step_owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment" ADD CONSTRAINT "commitment_session_id_session_row_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session_row"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment" ADD CONSTRAINT "commitment_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment" ADD CONSTRAINT "commitment_owner_member_id_member_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraint_row" ADD CONSTRAINT "constraint_row_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision" ADD CONSTRAINT "decision_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision" ADD CONSTRAINT "decision_owner_member_id_member_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision" ADD CONSTRAINT "decision_method_version_id_method_version_id_fk" FOREIGN KEY ("method_version_id") REFERENCES "public"."method_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision" ADD CONSTRAINT "decision_decided_in_session_id_session_row_id_fk" FOREIGN KEY ("decided_in_session_id") REFERENCES "public"."session_row"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision" ADD CONSTRAINT "decision_gate_id_gate_id_fk" FOREIGN KEY ("gate_id") REFERENCES "public"."gate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_criterion" ADD CONSTRAINT "decision_criterion_decision_id_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_option" ADD CONSTRAINT "decision_option_decision_id_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_decision_id_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_chosen_option_id_decision_option_id_fk" FOREIGN KEY ("chosen_option_id") REFERENCES "public"."decision_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_score" ADD CONSTRAINT "decision_score_option_id_decision_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."decision_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_score" ADD CONSTRAINT "decision_score_criterion_id_decision_criterion_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."decision_criterion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_stage" ADD CONSTRAINT "decision_stage_decision_id_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_stage" ADD CONSTRAINT "decision_stage_owner_member_id_member_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_weight" ADD CONSTRAINT "decision_weight_criterion_id_decision_criterion_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."decision_criterion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_weight" ADD CONSTRAINT "decision_weight_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependency" ADD CONSTRAINT "dependency_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependency" ADD CONSTRAINT "dependency_from_milestone_id_milestone_id_fk" FOREIGN KEY ("from_milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependency" ADD CONSTRAINT "dependency_to_milestone_id_milestone_id_fk" FOREIGN KEY ("to_milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_load" ADD CONSTRAINT "domain_load_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_rule_code_finding_rule_code_fk" FOREIGN KEY ("rule_code") REFERENCES "public"."finding_rule"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_method_version_id_method_version_id_fk" FOREIGN KEY ("method_version_id") REFERENCES "public"."method_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_reference" ADD CONSTRAINT "finding_reference_finding_id_finding_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."finding"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_suppression" ADD CONSTRAINT "finding_suppression_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_suppression" ADD CONSTRAINT "finding_suppression_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_suppression" ADD CONSTRAINT "finding_suppression_rule_code_finding_rule_code_fk" FOREIGN KEY ("rule_code") REFERENCES "public"."finding_rule"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_assumption" ADD CONSTRAINT "fx_assumption_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_assumption" ADD CONSTRAINT "fx_assumption_assumption_id_assumption_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "public"."assumption"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate" ADD CONSTRAINT "gate_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_built_by_milestone_id_milestone_id_fk" FOREIGN KEY ("built_by_milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "method_change_request" ADD CONSTRAINT "method_change_request_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "method_change_request" ADD CONSTRAINT "method_change_request_requested_by_member_id_member_id_fk" FOREIGN KEY ("requested_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "method_change_request" ADD CONSTRAINT "method_change_request_approved_by_member_id_member_id_fk" FOREIGN KEY ("approved_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "method_setting" ADD CONSTRAINT "method_setting_method_version_id_method_version_id_fk" FOREIGN KEY ("method_version_id") REFERENCES "public"."method_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "method_version" ADD CONSTRAINT "method_version_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "method_version" ADD CONSTRAINT "method_version_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_proposed_by_member_id_member_id_fk" FOREIGN KEY ("proposed_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_last_authored_by_member_id_member_id_fk" FOREIGN KEY ("last_authored_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_agreed_by_member_id_member_id_fk" FOREIGN KEY ("agreed_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_event" ADD CONSTRAINT "milestone_event_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_event" ADD CONSTRAINT "milestone_event_by_member_id_member_id_fk" FOREIGN KEY ("by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_move" ADD CONSTRAINT "milestone_move_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_move" ADD CONSTRAINT "milestone_move_moved_by_member_id_member_id_fk" FOREIGN KEY ("moved_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation" ADD CONSTRAINT "obligation_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation" ADD CONSTRAINT "obligation_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_item" ADD CONSTRAINT "pending_item_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_item" ADD CONSTRAINT "pending_item_raised_by_member_id_member_id_fk" FOREIGN KEY ("raised_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_read_log" ADD CONSTRAINT "private_read_log_owner_member_id_member_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserve" ADD CONSTRAINT "reserve_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk" ADD CONSTRAINT "risk_track_id_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk" ADD CONSTRAINT "risk_owner_member_id_member_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_change" ADD CONSTRAINT "session_change_session_id_session_row_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session_row"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_row" ADD CONSTRAINT "session_row_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_row" ADD CONSTRAINT "session_row_method_version_id_method_version_id_fk" FOREIGN KEY ("method_version_id") REFERENCES "public"."method_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track" ADD CONSTRAINT "track_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track" ADD CONSTRAINT "track_owner_member_id_member_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;