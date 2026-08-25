import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Tx } from '@/lib/db/client';

/**
 * The tools a facilitated review may use.
 *
 * Every one wraps the same operation the interface calls, executing inside the
 * caller's member scope. A tool cannot do anything the signed in member could
 * not do by clicking, and a prompt asking it to fill in the partner's track
 * does not fail because the prompt says not to: the row level policy rejects
 * the write.
 *
 * Notice what is absent. There is no set_weight, because a weight is a person's
 * own act. There is no decide, because the model does not decide. There is no
 * write_to_track, because a member never writes into another member's track.
 * There is no create_finding and no set_severity, because the engine decides
 * that a finding exists and how it ranks.
 */

export interface ToolContext {
  tx: Tx;
  memberId: string;
  householdId: string;
  sessionId: string;
  /** Refs are how the model addresses items. It never sees an id. */
  resolveRef: (ref: string) => Promise<{ id: string; trackId: string } | null>;
}

const msStatus = z.enum([
  'on_track', 'at_risk', 'slipped', 'blocked', 'done', 'parked', 'dropped',
]);

interface ToolSpec {
  definition: Anthropic.Tool;
  handler: (input: unknown, ctx: ToolContext) => Promise<string>;
}

const setMilestoneStatus: ToolSpec = {
  definition: {
    name: 'set_milestone_status',
    description:
      'Record how a milestone is going. Parking or dropping requires a reason, which stays '
      + 'visible: nothing disappears. A joint item that is still proposed has no execution '
      + 'status and this will refuse it.',
    input_schema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'The milestone reference, for example M-1-CAR-01.' },
        status: { type: 'string', enum: msStatus.options },
        reason: { type: 'string', description: 'Required when parking or dropping.' },
      },
      required: ['ref', 'status'],
      additionalProperties: false,
    },
    strict: true,
  },
  handler: async (raw, ctx) => {
    const input = z.object({
      ref: z.string(), status: msStatus, reason: z.string().optional(),
    }).parse(raw);

    if ((input.status === 'parked' || input.status === 'dropped') && !input.reason?.trim()) {
      return `Refused: ${input.status} needs a reason. It stays visible with that reason.`;
    }

    const target = await ctx.resolveRef(input.ref);
    if (!target) return `No milestone with the reference ${input.ref} is readable here.`;

    const updated = (await ctx.tx.execute(sql`
      update milestone
         set status = ${input.status}, status_reason = ${input.reason ?? null},
             completed_at = case when ${input.status} = 'done' then now() else null end,
             updated_at = now(), last_authored_by_member_id = ${ctx.memberId}
       where id = ${target.id} and agreement is distinct from 'proposed'
      returning ref`)) as unknown as Array<{ ref: string }>;

    if (updated.length === 0) {
      return 'Refused: either this is not the actor\'s track to change, or the item is still '
        + 'proposed and has no execution status yet.';
    }

    await recordChange(ctx, 'milestone', target.id, 'status', input.status, input.reason);
    return `${input.ref} is now ${input.status}.`;
  },
};

const moveMilestoneTarget: ToolSpec = {
  definition: {
    name: 'move_milestone_target',
    description:
      'Change a milestone target date. The reason is required and the move is written to the '
      + 'slippage history in the same transaction, so the change is never invisible.',
    input_schema: {
      type: 'object',
      properties: {
        ref: { type: 'string' },
        new_target: { type: 'string', description: 'A date, for example 2027-03-01.' },
        reason: { type: 'string' },
      },
      required: ['ref', 'new_target', 'reason'],
      additionalProperties: false,
    },
    strict: true,
  },
  handler: async (raw, ctx) => {
    const input = z.object({
      ref: z.string(),
      new_target: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().min(1),
    }).parse(raw);

    const target = await ctx.resolveRef(input.ref);
    if (!target) return `No milestone with the reference ${input.ref} is readable here.`;

    const [current] = (await ctx.tx.execute(sql`
      select target_date from milestone where id = ${target.id}`)) as unknown as
      Array<{ target_date: string }>;
    if (!current) return `No milestone with the reference ${input.ref} is readable here.`;
    if (current.target_date === input.new_target) {
      return `${input.ref} already targets ${input.new_target}.`;
    }

    const updated = (await ctx.tx.execute(sql`
      update milestone set target_date = ${input.new_target}, updated_at = now(),
             last_authored_by_member_id = ${ctx.memberId}
       where id = ${target.id} returning ref`)) as unknown as Array<{ ref: string }>;
    if (updated.length === 0) return 'Refused: this is not the actor\'s track to change.';

    await ctx.tx.execute(sql`
      insert into milestone_move (milestone_id, from_date, to_date, moved_by_member_id, reason)
      values (${target.id}, ${current.target_date}, ${input.new_target},
              ${ctx.memberId}, ${input.reason})`);

    await recordChange(
      ctx, 'milestone', target.id, 'target_date', input.new_target, input.reason,
      current.target_date,
    );
    return `${input.ref} moved from ${current.target_date} to ${input.new_target}, `
      + 'and the move is recorded in its history.';
  },
};

const resolveAssumption: ToolSpec = {
  definition: {
    name: 'resolve_assumption',
    description:
      'Close an assumption once it has been tested, or record that it expired without a test.',
    input_schema: {
      type: 'object',
      properties: {
        ref: { type: 'string' },
        outcome: { type: 'string', enum: ['confirmed', 'broken', 'expired_untested'] },
        note: { type: 'string' },
      },
      required: ['ref', 'outcome'],
      additionalProperties: false,
    },
    strict: true,
  },
  handler: async (raw, ctx) => {
    const input = z.object({
      ref: z.string(),
      outcome: z.enum(['confirmed', 'broken', 'expired_untested']),
      note: z.string().optional(),
    }).parse(raw);

    const updated = (await ctx.tx.execute(sql`
      update assumption set state = ${input.outcome}, resolved_at = now()
       where ref = ${input.ref} returning id`)) as unknown as Array<{ id: string }>;
    if (updated.length === 0) {
      return `No assumption with the reference ${input.ref} is writable here.`;
    }

    await recordChange(ctx, 'assumption', updated[0].id, 'state', input.outcome, input.note);
    return `${input.ref} is ${input.outcome.replace('_', ' ')}.`;
  },
};

const addCommitment: ToolSpec = {
  definition: {
    name: 'add_commitment',
    description:
      'Record something the actor commits to doing before the next review, with a date. '
      + 'A commitment without an owner and a date is a wish.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        due: { type: 'string', description: 'A date, for example 2027-03-01.' },
      },
      required: ['text', 'due'],
      additionalProperties: false,
    },
    strict: true,
  },
  handler: async (raw, ctx) => {
    const input = z.object({
      text: z.string().min(1),
      due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(raw);

    await ctx.tx.execute(sql`
      insert into commitment (session_id, household_id, text, owner_member_id, due_date)
      values (${ctx.sessionId}, ${ctx.householdId}, ${input.text}, ${ctx.memberId}, ${input.due})`);
    return `Recorded: "${input.text}", due ${input.due}.`;
  },
};

const raisePendingItem: ToolSpec = {
  definition: {
    name: 'raise_pending_item',
    description:
      'Raise something on another member\'s track. It lands in their queue for them to work '
      + 'through, and never in their plan. This is the only way anything reaches another '
      + 'member\'s track.',
    input_schema: {
      type: 'object',
      properties: {
        member_name: { type: 'string', description: 'The member whose queue this goes to.' },
        text: { type: 'string' },
      },
      required: ['member_name', 'text'],
      additionalProperties: false,
    },
    strict: true,
  },
  handler: async (raw, ctx) => {
    const input = z.object({
      member_name: z.string(), text: z.string().min(1),
    }).parse(raw);

    const [track] = (await ctx.tx.execute(sql`
      select t.id from track t
        join member m on m.id = t.owner_member_id
       where t.kind = 'individual' and lower(m.display_name) = lower(${input.member_name})
         and m.deleted_at is null`)) as unknown as Array<{ id: string }>;
    if (!track) return `No member called ${input.member_name} has a track in this household.`;

    await ctx.tx.execute(sql`
      insert into pending_item (track_id, raised_by_member_id, text)
      values (${track.id}, ${ctx.memberId}, ${input.text})`);
    return `Raised for ${input.member_name}. They decide what, if anything, changes in their plan.`;
  },
};

const recordPositionOnJointItem: ToolSpec = {
  definition: {
    name: 'record_position_on_joint_item',
    description:
      'Record where the actor stands on a joint item without agreeing it. Agreement is the '
      + 'other principal\'s to give, in their own session. This never changes agreement state.',
    input_schema: {
      type: 'object',
      properties: {
        ref: { type: 'string' },
        position: { type: 'string' },
      },
      required: ['ref', 'position'],
      additionalProperties: false,
    },
    strict: true,
  },
  handler: async (raw, ctx) => {
    const input = z.object({ ref: z.string(), position: z.string().min(1) }).parse(raw);
    const target = await ctx.resolveRef(input.ref);
    if (!target) return `No milestone with the reference ${input.ref} is readable here.`;

    await ctx.tx.execute(sql`
      insert into milestone_event (milestone_id, event, by_member_id, note)
      values (${target.id}, 'edit_proposed', ${ctx.memberId}, ${input.position})`);
    return `Recorded against ${input.ref}. It stays proposed until both principals settle it.`;
  },
};

const writeSessionSummary: ToolSpec = {
  definition: {
    name: 'write_session_record',
    description:
      'Write the closing summary of the review: what changed, what is now at risk, and what '
      + 'was routed onward for a decision. Call this once, at the end.',
    input_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: 'One sentence on the state of the plan.' },
        changed: { type: 'array', items: { type: 'string' } },
        needs_attention: { type: 'array', items: { type: 'string' } },
        routed_onward: { type: 'array', items: { type: 'string' } },
      },
      required: ['headline', 'changed', 'needs_attention', 'routed_onward'],
      additionalProperties: false,
    },
    strict: true,
  },
  handler: async (raw, ctx) => {
    const input = z.object({
      headline: z.string(),
      changed: z.array(z.string()),
      needs_attention: z.array(z.string()),
      routed_onward: z.array(z.string()),
    }).parse(raw);

    await ctx.tx.execute(sql`
      update session_row set summary = ${JSON.stringify(input)}::jsonb
       where id = ${ctx.sessionId}`);
    return 'Summary recorded.';
  },
};

const SPECS: ToolSpec[] = [
  setMilestoneStatus,
  moveMilestoneTarget,
  resolveAssumption,
  addCommitment,
  raisePendingItem,
  recordPositionOnJointItem,
  writeSessionSummary,
];

/** Deterministic order, because the tool list is part of the cached prefix. */
export const REVIEW_TOOLS: Anthropic.Tool[] = SPECS.map((s) => s.definition);

const BY_NAME = new Map(SPECS.map((s) => [s.definition.name, s]));

export async function runTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<{ result: string; isError: boolean }> {
  const spec = BY_NAME.get(name);
  if (!spec) return { result: `There is no tool called ${name}.`, isError: true };

  try {
    return { result: await spec.handler(input, ctx), isError: false };
  } catch (e) {
    if (e instanceof Error && e.message.includes('violates row-level security')) {
      return { result: 'Refused: this is not the actor\'s track to write into.', isError: true };
    }
    return {
      result: e instanceof Error ? `Refused: ${e.message}` : 'That did not work.',
      isError: true,
    };
  }
}

/** Every change a session makes is recorded against the session that made it. */
async function recordChange(
  ctx: ToolContext,
  entityType: string,
  entityId: string,
  field: string,
  toValue: string,
  reason?: string,
  fromValue?: string,
): Promise<void> {
  await ctx.tx.execute(sql`
    insert into session_change
      (session_id, entity_type, entity_id, field, from_value, to_value, reason)
    values (${ctx.sessionId}, ${entityType}, ${entityId}, ${field},
            ${fromValue ?? null}, ${toValue}, ${reason ?? null})`);
}
