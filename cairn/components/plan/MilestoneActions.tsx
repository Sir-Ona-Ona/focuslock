'use client';

import { useState, useTransition } from 'react';
import {
  agreeJointItem, proposeEditToJointItem, sendJointItemToSession,
  setPrivate, updateMilestoneStatus, updateMilestoneTarget,
} from '@/lib/actions/plan';
import { STATUS, type StatusKey } from '@/components/ui/vocab';

const STATUS_KEYS = Object.keys(STATUS) as StatusKey[];

export function MoveTarget({ milestoneId }: { milestoneId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return <Small onClick={() => setOpen(true)}>Move the date</Small>;
  }

  return (
    <form
      className="mt-2 rounded-lg border border-rule bg-surface-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await updateMilestoneTarget({ milestoneId, newTarget: date, reason });
          if (r.ok) { setOpen(false); setDate(''); setReason(''); } else setError(r.error);
        });
      }}
    >
      <input
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.84rem]"
      />
      <input
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why it moved"
        className="mt-2 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.84rem]"
      />
      <p className="mt-2 max-w-[52ch] text-[.74rem] text-ink-faint">
        The move is written to the history in the same transaction as the date. A date change
        with no record of it is invisible slippage, which is the thing this is built to catch.
      </p>
      {error ? <Err>{error}</Err> : null}
      <Row pending={pending} onCancel={() => setOpen(false)} label="Move it" />
    </form>
  );
}

export function SetStatus({ milestoneId, current }: { milestoneId: string; current: StatusKey | null }) {
  const [status, setStatus] = useState<StatusKey>(current ?? 'on_track');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const needsReason = status === 'parked' || status === 'dropped';

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await updateMilestoneStatus({ milestoneId, status, reason: reason || undefined });
          if (!r.ok) setError(r.error); else setReason('');
        });
      }}
    >
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as StatusKey)}
        aria-label="Status"
        className="rounded-md border border-rule bg-surface px-2 py-1 text-[.8rem]"
      >
        {STATUS_KEYS.map((k) => (
          <option key={k} value={k}>{STATUS[k].label}</option>
        ))}
      </select>
      {needsReason ? (
        <input
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`Why it is ${status}`}
          className="min-w-[14rem] flex-1 rounded-md border border-rule bg-surface px-2.5 py-1 text-[.8rem]"
        />
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-rule px-2.5 py-1 text-[.78rem] text-ink-muted disabled:opacity-45"
      >
        {pending ? 'Saving' : 'Set status'}
      </button>
      {error ? <Err>{error}</Err> : null}
    </form>
  );
}

export function PrivateToggle({
  milestoneId, isPrivate,
}: { milestoneId: string; isPrivate: boolean }) {
  const [disclosure, setDisclosure] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(acknowledged: boolean) {
    setError(null);
    start(async () => {
      const r = await setPrivate({
        milestoneId, isPrivate: !isPrivate, disclosureAcknowledged: acknowledged,
      });
      if (r.ok) setDisclosure(null);
      else if (r.needsDisclosure) setDisclosure(r.error);
      else setError(r.error);
    });
  }

  return (
    <div className="mt-2">
      <Small onClick={() => submit(false)} disabled={pending}>
        {isPrivate ? 'Make it visible' : 'Mark it private'}
      </Small>
      {/* Disclosure at the moment of marking. Once, clearly, at the point of the decision. */}
      {disclosure ? (
        <div className="mt-2 rounded-lg border border-rule bg-surface-2 p-3">
          <div className="kicker">What private means here</div>
          <p className="mt-1.5 max-w-[54ch] text-[.82rem]">{disclosure}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={pending}
              className="rounded-md bg-brand px-3 py-1.5 text-[.8rem] text-on-brand disabled:opacity-45"
            >
              Understood, mark it private
            </button>
            <button
              type="button"
              onClick={() => setDisclosure(null)}
              className="rounded-md border border-rule px-3 py-1.5 text-[.8rem] text-ink-muted"
            >
              Leave it visible
            </button>
          </div>
        </div>
      ) : null}
      {error ? <Err>{error}</Err> : null}
    </div>
  );
}

/**
 * Agreement offers three responses, not one. A single Confirm button forces
 * everything that is not agreement into inaction, and people click it to clear
 * the badge.
 */
export function AgreementActions({
  milestoneId, canAgree,
}: { milestoneId: string; canAgree: boolean }) {
  const [mode, setMode] = useState<'edit' | 'session' | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {canAgree ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => {
              const r = await agreeJointItem({ milestoneId });
              if (!r.ok) setError(r.error);
            })}
            className="rounded-md bg-brand px-3 py-1 text-[.78rem] text-on-brand disabled:opacity-45"
          >
            Agree
          </button>
        ) : (
          <span className="text-[.76rem] text-ink-faint">
            You proposed this, so agreement is theirs to give.
          </span>
        )}
        <Small onClick={() => setMode(mode === 'edit' ? null : 'edit')}>Propose an edit</Small>
        <Small onClick={() => setMode(mode === 'session' ? null : 'session')}>
          Discuss in session
        </Small>
      </div>

      {mode ? (
        <form
          className="mt-2 rounded-lg border border-rule bg-surface-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fn = mode === 'edit' ? proposeEditToJointItem : sendJointItemToSession;
            start(async () => {
              const r = await fn({ milestoneId, note });
              if (r.ok) { setMode(null); setNote(''); } else setError(r.error);
            });
          }}
        >
          <textarea
            required
            // method-literal-ok: textarea height in rows
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === 'edit' ? 'What you would change' : 'What you want to discuss'}
            className="w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.84rem]"
          />
          <p className="mt-2 max-w-[52ch] text-[.74rem] text-ink-faint">
            This is recorded against the item and changes nothing else. Disagreement is not
            rejection, and the item stays proposed until you both settle it.
          </p>
          {error ? <Err>{error}</Err> : null}
          <Row pending={pending} onCancel={() => setMode(null)} label="Record it" />
        </form>
      ) : null}
      {error && !mode ? <Err>{error}</Err> : null}
    </div>
  );
}

function Small({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-rule px-2.5 py-1 text-[.78rem] text-ink-muted
                 hover:border-rule-strong disabled:opacity-45"
    >
      {children}
    </button>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{children}</p>;
}

function Row({
  pending, onCancel, label,
}: { pending: boolean; onCancel: () => void; label: string }) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-3 py-1.5 text-[.82rem] text-on-brand disabled:opacity-45"
      >
        {pending ? 'Saving' : label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-rule px-3 py-1.5 text-[.82rem] text-ink-muted"
      >
        Cancel
      </button>
    </div>
  );
}
