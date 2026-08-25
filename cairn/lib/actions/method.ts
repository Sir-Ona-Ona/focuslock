'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withMember } from '@/lib/db/client';
import { requireViewer } from '@/lib/auth/session';
import {
  requestMethodChange, respondToMethodChange, revertToVersion, updateSoloSetting,
} from '@/lib/method/change';

export type Result = { ok: true } | { ok: false; error: string };

const editInput = z.object({
  key: z.string().min(1),
  /** JSON, because a setting value can be a number, a list of domains, or a prompt. */
  valueJson: z.string().min(1),
  reason: z.string().min(1, 'Every method change carries a reason. It is what makes the history readable.'),
});

function parseValue(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    // A prompt body is a plain string rather than JSON, and typing quotes round
    // it by hand would be a pointless ceremony.
    return json;
  }
}

export async function editSetting(raw: z.input<typeof editInput>): Promise<Result> {
  const parsed = editInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    const viewer = await requireViewer();
    if (viewer.role !== 'principal') {
      return { ok: false, error: 'The method belongs to the principals.' };
    }
    await withMember(viewer.memberId, (tx) => updateSoloSetting(tx, {
      householdId: viewer.householdId,
      memberId: viewer.memberId,
      key: parsed.data.key,
      value: parseValue(parsed.data.valueJson),
      reason: parsed.data.reason,
    }));
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'That change did not save.' };
  }
}

export async function openChangeRequest(raw: z.input<typeof editInput>): Promise<Result> {
  const parsed = editInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    const viewer = await requireViewer();
    await withMember(viewer.memberId, (tx) => requestMethodChange(tx, {
      householdId: viewer.householdId,
      memberId: viewer.memberId,
      key: parsed.data.key,
      value: parseValue(parsed.data.valueJson),
      reason: parsed.data.reason,
    }));
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'That request did not open.' };
  }
}

export async function respondToRequest(
  raw: { requestId: string; approve: boolean; declineReason?: string },
): Promise<Result> {
  const parsed = z.object({
    requestId: z.string().uuid(),
    approve: z.boolean(),
    declineReason: z.string().optional(),
  }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    const viewer = await requireViewer();
    await withMember(viewer.memberId, (tx) => respondToMethodChange(tx, {
      householdId: viewer.householdId,
      memberId: viewer.memberId,
      requestId: parsed.data.requestId,
      approve: parsed.data.approve,
      declineReason: parsed.data.declineReason,
    }));
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'That response did not save.' };
  }
}

export async function revert(
  raw: { targetVersionId: string; reason: string },
): Promise<Result> {
  const parsed = z.object({
    targetVersionId: z.string().uuid(),
    reason: z.string().min(1, 'Say why you are going back to this version.'),
  }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    const viewer = await requireViewer();
    await withMember(viewer.memberId, (tx) => revertToVersion(tx, {
      householdId: viewer.householdId,
      memberId: viewer.memberId,
      targetVersionId: parsed.data.targetVersionId,
      reason: parsed.data.reason,
    }));
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'That revert did not save.' };
  }
}
