'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { withMember, type Tx } from '@/lib/db/client';
import { requireViewer } from '@/lib/auth/session';
import { method } from '@/lib/method/accessor';
import { nextMilestoneRef, nextRef } from './refs';

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in the form 2027-03-01.');
const uuid = z.string().uuid();

// Both of these are code lengths rather than method thresholds: a domain code
// is three letters and an ISO currency is three letters, whatever the method says.
// method-literal-ok: ISO code lengths, not a threshold
const domainCodeInput = z.string().length(3);
// method-literal-ok: ISO code lengths, not a threshold
const currencyInput = z.string().length(3);

const msStatus = z.enum([
  'on_track', 'at_risk', 'slipped', 'blocked', 'done', 'parked', 'dropped',
]);

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; needsDisclosure?: boolean };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

/** Every action resolves the member once, then does all its work inside one scoped transaction. */
async function run<T>(fn: (tx: Tx, viewer: Awaited<ReturnType<typeof requireViewer>>) => Promise<T>) {
  const viewer = await requireViewer();
  return withMember(viewer.memberId, (tx) => fn(tx, viewer));
}

async function assertDomain(tx: Tx, code: string): Promise<void> {
  const m = await method(tx);
  if (!m.domainOrder().includes(code)) {
    throw new Error(`${code} is not a domain in this household's method.`);
  }
}

/** Claiming happens on the first thing a track's owner authors, and never reverses. */
async function claimOnFirstWrite(tx: Tx, trackId: string): Promise<void> {
  await tx.execute(sql`
    update track set claim_status = 'claimed', claimed_at = now()
     where id = ${trackId} and claim_status = 'unclaimed'`);
}

/* ------------------------------------------------------------- milestones */

const createMilestoneInput = z.object({
  trackId: uuid,
  domainCode: domainCodeInput,
  title: z.string().min(1, 'A milestone needs a title.'),
  targetDate: iso,
  note: z.string().optional(),
  status: msStatus.optional(),
  isPrivate: z.boolean().optional(),
});

export async function createMilestone(
  raw: z.input<typeof createMilestoneInput>,
): Promise<ActionResult<{ id: string; ref: string }>> {
  const parsed = createMilestoneInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;

  try {
    const result = await run(async (tx, viewer) => {
      await assertDomain(tx, input.domainCode);

      const [track] = (await tx.execute(sql`
        select kind from track where id = ${input.trackId}`)) as unknown as
        Array<{ kind: 'individual' | 'joint' }>;
      if (!track) throw new Error('That track is not in this household.');

      const isJoint = track.kind === 'joint';
      const ref = await nextMilestoneRef(tx, input.trackId, input.domainCode);

      // I-2b. A joint item enters as proposed, and a proposed item has no
      // execution status: it is not part of the plan yet, so it cannot be
      // behind on anything.
      const agreement = isJoint ? 'proposed' : null;
      const status = isJoint ? null : (input.status ?? 'on_track');

      const [row] = (await tx.execute(sql`
        insert into milestone
          (track_id, domain_code, ref, title, note, target_date, original_target_date,
           status, agreement, proposed_by_member_id, last_authored_by_member_id, is_private)
        values (${input.trackId}, ${input.domainCode}, ${ref}, ${input.title},
                ${input.note ?? null}, ${input.targetDate}, ${input.targetDate},
                ${status}, ${agreement},
                ${isJoint ? viewer.memberId : null}, ${viewer.memberId},
                ${!isJoint && (input.isPrivate ?? false)})
        returning id`)) as unknown as Array<{ id: string }>;

      if (isJoint) {
        await tx.execute(sql`
          insert into milestone_event (milestone_id, event, by_member_id)
          values (${row.id}, 'proposed', ${viewer.memberId})`);
      }
      await claimOnFirstWrite(tx, input.trackId);
      return { id: row.id, ref };
    });

    revalidatePath('/', 'layout');
    return { ok: true, data: result };
  } catch (e) {
    return fail(message(e));
  }
}

const moveInput = z.object({
  milestoneId: uuid,
  newTarget: iso,
  reason: z.string().min(1, 'A date change needs a reason. Invisible slippage is the failure this prevents.'),
});

/**
 * Moving a target writes the move row in the same transaction, always.
 *
 * A date change without a move row is invisible slippage, and invisible
 * slippage is the failure this product exists to prevent.
 */
export async function updateMilestoneTarget(
  raw: z.input<typeof moveInput>,
): Promise<ActionResult> {
  const parsed = moveInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;

  try {
    await run(async (tx, viewer) => {
      const [current] = (await tx.execute(sql`
        select target_date from milestone where id = ${input.milestoneId}`)) as unknown as
        Array<{ target_date: string }>;
      if (!current) throw new Error('That milestone is not readable from this account.');
      if (current.target_date === input.newTarget) {
        throw new Error('That is already the target date.');
      }

      const updated = (await tx.execute(sql`
        update milestone set target_date = ${input.newTarget}, updated_at = now(),
               last_authored_by_member_id = ${viewer.memberId}
         where id = ${input.milestoneId}
        returning id`)) as unknown as Array<{ id: string }>;
      if (updated.length === 0) {
        throw new Error('This is not your track to change.');
      }

      await tx.execute(sql`
        insert into milestone_move (milestone_id, from_date, to_date, moved_by_member_id, reason)
        values (${input.milestoneId}, ${current.target_date}, ${input.newTarget},
                ${viewer.memberId}, ${input.reason})`);
    });

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const statusInput = z.object({
  milestoneId: uuid,
  status: msStatus,
  reason: z.string().optional(),
});

export async function updateMilestoneStatus(
  raw: z.input<typeof statusInput>,
): Promise<ActionResult> {
  const parsed = statusInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;

  if ((input.status === 'parked' || input.status === 'dropped') && !input.reason?.trim()) {
    return fail(
      `Say why this is ${input.status}. It stays visible with its reason rather than disappearing.`,
    );
  }

  try {
    await run(async (tx, viewer) => {
      const updated = (await tx.execute(sql`
        update milestone
           set status = ${input.status},
               status_reason = ${input.reason ?? null},
               completed_at = case when ${input.status} = 'done' then now() else null end,
               updated_at = now(),
               last_authored_by_member_id = ${viewer.memberId}
         where id = ${input.milestoneId}
           and agreement is distinct from 'proposed'
        returning id`)) as unknown as Array<{ id: string }>;
      if (updated.length === 0) {
        throw new Error(
          'A proposed joint item has no execution status yet. Agree it first, then say how it is going.',
        );
      }
    });

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const privateInput = z.object({
  milestoneId: uuid,
  isPrivate: z.boolean(),
  disclosureAcknowledged: z.boolean().optional(),
});

/**
 * The first time someone marks an item private, the UI must show what private
 * means here: read by collision detection and never shown to other members.
 * Once, clearly, at the point of the decision.
 */
export async function setPrivate(
  raw: z.input<typeof privateInput>,
): Promise<ActionResult> {
  const parsed = privateInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;

  try {
    const viewer = await requireViewer();
    if (input.isPrivate && !viewer.privateDisclosureSeen && !input.disclosureAcknowledged) {
      return {
        ok: false,
        needsDisclosure: true,
        error:
          'Private items are never shown to other members. Collision detection is the one thing '
          + 'that reads them, and only if both principals opted in. Every one of those reads is '
          + 'logged and visible to you.',
      };
    }

    await withMember(viewer.memberId, async (tx) => {
      const updated = (await tx.execute(sql`
        update milestone set is_private = ${input.isPrivate}, updated_at = now()
         where id = ${input.milestoneId}
        returning id`)) as unknown as Array<{ id: string }>;
      if (updated.length === 0) throw new Error('This is not your item to change.');

      if (input.disclosureAcknowledged) {
        await tx.execute(sql`
          update member set private_disclosure_seen_at = coalesce(private_disclosure_seen_at, now())
           where id = ${viewer.memberId}`);
      }
    });

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

/* -------------------------------------------------------- the joint plan */

const jointResponse = z.object({
  milestoneId: uuid,
  note: z.string().optional(),
});

/**
 * Agreement, the first of three responses.
 *
 * The database refuses a self agreement outright. This checks first so the
 * message says what happened rather than surfacing a constraint name.
 */
export async function agreeJointItem(
  raw: z.input<typeof jointResponse>,
): Promise<ActionResult> {
  const parsed = jointResponse.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;

  try {
    await run(async (tx, viewer) => {
      const [item] = (await tx.execute(sql`
        select proposed_by_member_id, agreement
          from milestone where id = ${input.milestoneId}`)) as unknown as
        Array<{ proposed_by_member_id: string | null; agreement: string | null }>;

      if (!item) throw new Error('That item is not readable from this account.');
      if (item.agreement !== 'proposed') throw new Error('That item is already agreed.');
      if (item.proposed_by_member_id === viewer.memberId) {
        throw new Error(
          'Agreement is the other principal\'s to give. Take it to the session, or propose an edit.',
        );
      }
      if (viewer.role !== 'principal') {
        throw new Error('The joint plan belongs to the principals. You can propose, and they agree.');
      }

      // I-2b: agreement and execution are separate questions, so the status
      // starts only once the item is actually part of the plan.
      await tx.execute(sql`
        update milestone
           set agreement = 'agreed', agreed_by_member_id = ${viewer.memberId},
               agreed_at = now(), status = 'on_track', updated_at = now()
         where id = ${input.milestoneId}`);

      // I-12d: agreeing appends an event. It never overwrites the note.
      await tx.execute(sql`
        insert into milestone_event (milestone_id, event, by_member_id, note)
        values (${input.milestoneId}, 'agreed', ${viewer.memberId}, ${input.note ?? null})`);
    });

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

/** The second response. Disagreement is not rejection, so this changes no state. */
export async function proposeEditToJointItem(
  raw: z.input<typeof jointResponse>,
): Promise<ActionResult> {
  return appendJointEvent(raw, 'edit_proposed', 'Say what you would change.');
}

/** The third response. Some things need the room, not a notification tap. */
export async function sendJointItemToSession(
  raw: z.input<typeof jointResponse>,
): Promise<ActionResult> {
  return appendJointEvent(raw, 'sent_to_session', 'Say what you want to discuss.');
}

async function appendJointEvent(
  raw: z.input<typeof jointResponse>,
  event: 'edit_proposed' | 'sent_to_session',
  requireNote: string,
): Promise<ActionResult> {
  const parsed = jointResponse.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (!parsed.data.note?.trim()) return fail(requireNote);

  try {
    await run(async (tx, viewer) => {
      await tx.execute(sql`
        insert into milestone_event (milestone_id, event, by_member_id, note)
        values (${parsed.data.milestoneId}, ${event}, ${viewer.memberId}, ${parsed.data.note})`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

/* ---------------------------------------------- goals, assumptions, risks */

const goalInput = z.object({
  trackId: uuid,
  domainCode: domainCodeInput,
  text: z.string().min(1, 'A goal needs words.'),
  horizon: z.enum(['now', 'next', 'later', 'beyond']).default('now'),
});

export async function createGoal(raw: z.input<typeof goalInput>): Promise<ActionResult> {
  const parsed = goalInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;

  try {
    await run(async (tx) => {
      await assertDomain(tx, input.domainCode);
      await tx.execute(sql`
        insert into goal (track_id, domain_code, text, horizon)
        values (${input.trackId}, ${input.domainCode}, ${input.text}, ${input.horizon})`);
      await claimOnFirstWrite(tx, input.trackId);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const assumptionInput = z.object({
  trackId: uuid,
  domainCode: domainCodeInput,
  statement: z.string().min(1, 'An assumption needs a statement that can turn out false.'),
  confidence: z.enum(['high', 'medium', 'low']),
  testBy: iso,
});

export async function createAssumption(
  raw: z.input<typeof assumptionInput>,
): Promise<ActionResult> {
  const parsed = assumptionInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;

  try {
    await run(async (tx) => {
      await assertDomain(tx, input.domainCode);
      const ref = await nextRef(tx, 'assumption', input.trackId, `A-${input.domainCode}`);
      await tx.execute(sql`
        insert into assumption (track_id, domain_code, ref, statement, confidence, test_by)
        values (${input.trackId}, ${input.domainCode}, ${ref}, ${input.statement},
                ${input.confidence}, ${input.testBy})`);
      await claimOnFirstWrite(tx, input.trackId);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const resolveInput = z.object({
  assumptionId: uuid,
  outcome: z.enum(['confirmed', 'broken', 'expired_untested']),
});

export async function resolveAssumption(
  raw: z.input<typeof resolveInput>,
): Promise<ActionResult> {
  const parsed = resolveInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await run(async (tx) => {
      await tx.execute(sql`
        update assumption set state = ${parsed.data.outcome}, resolved_at = now()
         where id = ${parsed.data.assumptionId}`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const riskInput = z.object({
  trackId: uuid,
  domainCode: domainCodeInput,
  statement: z.string().min(1, 'A risk needs a statement.'),
  likelihood: z.enum(['high', 'medium', 'low']),
  impact: z.enum(['high', 'medium', 'low']),
  mitigation: z.string().optional(),
});

export async function createRisk(raw: z.input<typeof riskInput>): Promise<ActionResult> {
  const parsed = riskInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;
  try {
    await run(async (tx) => {
      await assertDomain(tx, input.domainCode);
      const ref = await nextRef(tx, 'risk', input.trackId, `R-${input.domainCode}`);
      await tx.execute(sql`
        insert into risk (track_id, domain_code, ref, statement, likelihood, impact, mitigation)
        values (${input.trackId}, ${input.domainCode}, ${ref}, ${input.statement},
                ${input.likelihood}, ${input.impact}, ${input.mitigation ?? null})`);
      await claimOnFirstWrite(tx, input.trackId);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const constraintInput = z.object({
  trackId: uuid,
  statement: z.string().min(1, 'A constraint needs a statement.'),
  isHard: z.boolean().default(false),
  source: z.string().optional(),
});

export async function createConstraint(
  raw: z.input<typeof constraintInput>,
): Promise<ActionResult> {
  const parsed = constraintInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;
  try {
    await run(async (tx) => {
      const ref = await nextRef(tx, 'constraint_row', input.trackId, 'C');
      await tx.execute(sql`
        insert into constraint_row (track_id, ref, statement, is_hard, source)
        values (${input.trackId}, ${ref}, ${input.statement}, ${input.isHard},
                ${input.source ?? null})`);
      await claimOnFirstWrite(tx, input.trackId);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

/* --------------------------------------------------- the two capacities */

const loadInput = z.object({
  trackId: uuid,
  domainCode: domainCodeInput,
  hoursPerWeek: z.coerce.number().min(0).max(168),
  hoursPerWeekBad: z.coerce.number().min(0).max(168).optional(),
});

export async function setDomainLoad(raw: z.input<typeof loadInput>): Promise<ActionResult> {
  const parsed = loadInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;
  try {
    await run(async (tx) => {
      await assertDomain(tx, input.domainCode);
      await tx.execute(sql`
        insert into domain_load (track_id, domain_code, hours_per_week, hours_per_week_bad)
        values (${input.trackId}, ${input.domainCode}, ${input.hoursPerWeek},
                ${input.hoursPerWeekBad ?? null})
        on conflict (track_id, domain_code) do update
          set hours_per_week = excluded.hours_per_week,
              hours_per_week_bad = excluded.hours_per_week_bad,
              stated_at = now()`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const capacityInput = z.object({
  trackId: uuid,
  ceilingHoursPerWeek: z.coerce.number().min(1).max(168),
  earlySignal: z.string().optional(),
});

export async function setCapacity(raw: z.input<typeof capacityInput>): Promise<ActionResult> {
  const parsed = capacityInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;
  try {
    await run(async (tx) => {
      await tx.execute(sql`
        insert into capacity (track_id, ceiling_hours_per_week, early_signal)
        values (${input.trackId}, ${input.ceilingHoursPerWeek}, ${input.earlySignal ?? null})
        on conflict (track_id) do update
          set ceiling_hours_per_week = excluded.ceiling_hours_per_week,
              early_signal = excluded.early_signal,
              stated_at = now()`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const obligationInput = z.object({
  trackId: uuid,
  domainCode: domainCodeInput,
  label: z.string().min(1, 'Say what this pays for.'),
  kind: z.enum(['recurring', 'one_off']),
  amount: z.coerce.number().positive('An amount has to be more than zero.'),
  currency: currencyInput,
  startsOn: iso,
  endsOn: iso.optional(),
  committed: z.boolean().default(false),
  milestoneId: uuid.optional(),
});

export async function setObligation(
  raw: z.input<typeof obligationInput>,
): Promise<ActionResult> {
  const parsed = obligationInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;
  try {
    await run(async (tx) => {
      await assertDomain(tx, input.domainCode);
      await tx.execute(sql`
        insert into obligation
          (track_id, domain_code, milestone_id, label, kind, amount, currency,
           starts_on, ends_on, committed)
        values (${input.trackId}, ${input.domainCode}, ${input.milestoneId ?? null},
                ${input.label}, ${input.kind}, ${input.amount}, ${input.currency.toUpperCase()},
                ${input.startsOn}, ${input.endsOn ?? null}, ${input.committed})`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const incomeInput = z.object({
  trackId: uuid,
  label: z.string().min(1, 'Say where this comes from.'),
  kind: z.enum(['salary', 'business', 'rental', 'other']),
  amountMonthly: z.coerce.number().positive('An amount has to be more than zero.'),
  currency: currencyInput,
  confidence: z.enum(['high', 'medium', 'low']),
  startsOn: iso,
  endsOn: iso.optional(),
  isAssumed: z.boolean().default(false),
  builtByMilestoneId: uuid.optional(),
});

export async function setIncome(raw: z.input<typeof incomeInput>): Promise<ActionResult> {
  const parsed = incomeInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;
  try {
    await run(async (tx) => {
      await tx.execute(sql`
        insert into income
          (track_id, label, kind, amount_monthly, currency, confidence,
           starts_on, ends_on, is_assumed, built_by_milestone_id)
        values (${input.trackId}, ${input.label}, ${input.kind}, ${input.amountMonthly},
                ${input.currency.toUpperCase()}, ${input.confidence}, ${input.startsOn},
                ${input.endsOn ?? null}, ${input.isAssumed},
                ${input.builtByMilestoneId ?? null})`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const reserveInput = z.object({
  trackId: uuid,
  amount: z.coerce.number().min(0),
  currency: currencyInput,
  // method-literal-ok: an upper sanity bound on the input, not a method value
  targetMonths: z.coerce.number().min(0).max(60),
});

export async function setReserve(raw: z.input<typeof reserveInput>): Promise<ActionResult> {
  const parsed = reserveInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const input = parsed.data;
  try {
    await run(async (tx) => {
      await tx.execute(sql`
        insert into reserve (track_id, amount, currency, target_months)
        values (${input.trackId}, ${input.amount}, ${input.currency.toUpperCase()},
                ${input.targetMonths})
        on conflict (track_id) do update
          set amount = excluded.amount, currency = excluded.currency,
              target_months = excluded.target_months, stated_at = now()`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

/* --------------------------------------------------------- pending queue */

const pendingInput = z.object({
  trackId: uuid,
  text: z.string().min(1, 'Say what you are raising.'),
});

/**
 * Raising something on someone else's track.
 *
 * It lands in their queue for them to work through. It never lands in their
 * domains, by any route: a track written on someone's behalf looks like
 * agreement without being agreement.
 */
export async function raisePendingItem(
  raw: z.input<typeof pendingInput>,
): Promise<ActionResult> {
  const parsed = pendingInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await run(async (tx, viewer) => {
      await tx.execute(sql`
        insert into pending_item (track_id, raised_by_member_id, text)
        values (${parsed.data.trackId}, ${viewer.memberId}, ${parsed.data.text})`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

export async function actionPendingItem(
  raw: { pendingId: string; status: 'actioned' | 'dismissed' },
): Promise<ActionResult> {
  const parsed = z.object({
    pendingId: uuid,
    status: z.enum(['actioned', 'dismissed']),
  }).safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await run(async (tx) => {
      await tx.execute(sql`
        update pending_item set status = ${parsed.data.status}
         where id = ${parsed.data.pendingId}`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

const northStarInput = z.object({ trackId: uuid, northStar: z.string() });

export async function setNorthStar(raw: z.input<typeof northStarInput>): Promise<ActionResult> {
  const parsed = northStarInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await run(async (tx) => {
      await tx.execute(sql`
        update track set north_star = ${parsed.data.northStar}
         where id = ${parsed.data.trackId}`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

export async function setPrivateReadOptIn(optIn: boolean): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await withMember(viewer.memberId, async (tx) => {
      await tx.execute(sql`
        update member
           set private_read_opt_in = ${optIn},
               private_read_opt_in_at = ${optIn ? sql`now()` : sql`null`}
         where id = ${viewer.memberId}`);
    });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(message(e));
  }
}

function message(e: unknown): string {
  if (e instanceof Error) {
    // Constraint names are not something a reader should have to decode.
    if (e.message.includes('no_self_agree')) {
      return 'Agreement is the other principal\'s to give, not yours on your own proposal.';
    }
    if (e.message.includes('status_follows_agreement')) {
      return 'A proposed item has no execution status. Agree it first, then say how it is going.';
    }
    if (e.message.includes('parked_needs_reason')) {
      return 'Say why it is parked or dropped. It stays visible with its reason.';
    }
    if (e.message.includes('private_only_individual')) {
      return 'Privacy is an individual track thing. A joint item is shared by definition.';
    }
    if (e.message.includes('violates row-level security')) {
      return 'This is not your track to write into.';
    }
    return e.message;
  }
  return 'Something went wrong writing that.';
}
