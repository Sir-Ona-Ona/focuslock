import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';
import { withMember, type Tx } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';
import { forReview } from '@/lib/rules/for-review';
import { assembleReview } from './assemble';
import { MODEL, anthropic, priceUsd, type Usage } from './client';
import { REVIEW_TOOLS, runTool, type ToolContext } from './tools';

/**
 * One turn of a facilitated review.
 *
 * A manual loop rather than the SDK's tool runner, for three reasons the runner
 * does not expose cleanly: the transcript is persisted block by block so a
 * review can be resumed and audited, every tool call is written to
 * session_change inside the same member-scoped transaction, and the timebox is
 * checked between iterations by the application rather than by the model. A
 * model asked to watch a clock will not.
 */

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: Anthropic.ContentBlockParam[] | string;
}

/** How many tool rounds one user turn may take before the loop stops. */
// method-literal-ok: a runaway guard on one turn, not a method value
const MAX_ITERATIONS = 8;

export interface TurnEvent {
  type: 'text' | 'tool' | 'done' | 'error';
  text?: string;
  tool?: string;
  result?: string;
}

export async function* runReviewTurn(args: {
  memberId: string;
  householdId: string;
  sessionId: string;
  userMessage: string;
}): AsyncGenerator<TurnEvent> {
  const prepared = await withMember(args.memberId, async (tx) => {
    const m = await method(tx);
    const [session] = (await tx.execute(sql`
      select id, mode, planned_minutes, started_at, ended_at, transcript_ref
        from session_row where id = ${args.sessionId}`)) as unknown as Array<{
        id: string; mode: 'individual' | 'joint'; planned_minutes: number;
        started_at: string; ended_at: string | null; transcript_ref: string | null;
      }>;

    if (!session) throw new Error('That session is not readable from this account.');
    if (session.ended_at) throw new Error('That review has already been closed.');

    const facts = await forReview(tx, {
      mode: session.mode, memberId: args.memberId, householdId: args.householdId,
    });
    const prompt = assembleReview(m, facts);
    const history: TranscriptEntry[] = session.transcript_ref
      ? JSON.parse(session.transcript_ref)
      : [];

    return { session, prompt, history, methodVersionId: m.versionId };
  });

  // The timebox is the application's to enforce, and it is derived from one
  // number: elapsed minutes. Nothing stores the current block alongside it.
  const elapsedMinutes = Math.floor(
    (Date.now() - new Date(prepared.session.started_at).getTime()) / 60_000,
  );
  const remaining = prepared.session.planned_minutes - elapsedMinutes;

  const messages: Anthropic.MessageParam[] = [
    ...prepared.history.map((h) => ({
      role: h.role,
      content: h.content,
    })) as Anthropic.MessageParam[],
  ];

  // The facts go in front of the first user message of the turn, after the
  // cached system prefix, because they change whenever the plan changes.
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: prepared.prompt.facts },
      {
        type: 'text',
        text: remaining <= 0
          ? `The timebox has run out. Close the review: summarise and call `
            + `write_session_record.\n\n${args.userMessage}`
          : args.userMessage,
      },
    ],
  });

  const client = anthropic();
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: prepared.prompt.system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: REVIEW_TOOLS,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', text: event.delta.text };
      }
    }

    const message = await stream.finalMessage();
    await recordCall(args, prepared.methodVersionId, message.usage);

    messages.push({ role: 'assistant', content: message.content });

    if (message.stop_reason !== 'tool_use') {
      await persist(args, messages);
      yield { type: 'done' };
      return;
    }

    const calls = message.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    // All results go back in one user message. Splitting them across several
    // teaches the model to stop making parallel calls.
    const results: Anthropic.ToolResultBlockParam[] = [];

    await withMember(args.memberId, async (tx) => {
      const ctx: ToolContext = {
        tx,
        memberId: args.memberId,
        householdId: args.householdId,
        sessionId: args.sessionId,
        resolveRef: (ref) => resolveRef(tx, ref),
      };

      for (const call of calls) {
        const { result, isError } = await runTool(call.name, call.input, ctx);
        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: result,
          is_error: isError,
        });
      }
    });

    for (let i = 0; i < calls.length; i += 1) {
      yield {
        type: 'tool',
        tool: calls[i].name,
        result: typeof results[i].content === 'string'
          ? (results[i].content as string)
          : '',
      };
    }

    messages.push({ role: 'user', content: results });
  }

  await persist(args, messages);
  yield {
    type: 'error',
    text: 'The review made too many tool calls in one turn and was stopped. '
      + 'Everything it changed before that point is saved.',
  };
}

async function resolveRef(tx: Tx, ref: string) {
  const rows = (await tx.execute(sql`
    select id, track_id from milestone where ref = ${ref}`)) as unknown as
    Array<{ id: string; track_id: string }>;
  return rows[0] ? { id: rows[0].id, trackId: rows[0].track_id } : null;
}

/**
 * The transcript is stored per session, so a review can be resumed and audited.
 * The facts block is stripped before storing: it is regenerated from the engine
 * on every turn, and keeping stale copies would let an old number reappear.
 */
async function persist(
  args: { memberId: string; sessionId: string },
  messages: Anthropic.MessageParam[],
): Promise<void> {
  const cleaned = messages.map((msg) => {
    if (msg.role !== 'user' || typeof msg.content === 'string') return msg;
    const content = (msg.content as Anthropic.ContentBlockParam[]).filter(
      (b) => !(b.type === 'text' && b.text.startsWith('<computed_facts>')),
    );
    return { ...msg, content };
  });

  await withMember(args.memberId, async (tx) => {
    await tx.execute(sql`
      update session_row set transcript_ref = ${JSON.stringify(cleaned)}
       where id = ${args.sessionId}`);
  });
}

async function recordCall(
  args: { memberId: string; householdId: string; sessionId: string },
  methodVersionId: string,
  usage: Usage,
): Promise<void> {
  const cost = priceUsd(MODEL, usage);
  await withMember(args.memberId, async (tx) => {
    await tx.execute(sql`
      insert into model_call
        (household_id, member_id, session_id, flow, model, method_version_id,
         input_tokens, output_tokens, cache_read_input_tokens,
         cache_creation_input_tokens, cost_usd)
      values (${args.householdId}, ${args.memberId}, ${args.sessionId}, 'review', ${MODEL},
              ${methodVersionId}, ${usage.input_tokens}, ${usage.output_tokens},
              ${usage.cache_read_input_tokens ?? 0}, ${usage.cache_creation_input_tokens ?? 0},
              ${cost})`);
  });
}
