'use client';

import { useState, useTransition } from 'react';
import { editSetting, openChangeRequest } from '@/lib/actions/method';

export interface SettingRowProps {
  settingKey: string;
  value: unknown;
  defaultValue: unknown;
  tier: 'solo' | 'two_key';
  protects: string | null;
  rationale: string;
  fromCanonical: boolean;
  /** Whose protection this is, named, so the warning is about a person rather than a policy. */
  otherPrincipalName: string | null;
  canEdit: boolean;
}

function render(v: unknown): string {
  if (typeof v === 'string') return v;
  return JSON.stringify(v, null, 0);
}

export function SettingRow(props: SettingRowProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(render(props.value));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isPrompt = props.settingKey.startsWith('prompts.');
  const changed = render(props.value) !== render(props.defaultValue);
  const twoKey = props.tier === 'two_key';

  return (
    <div className="border-b border-rule py-3 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="font-mono text-[.76rem] text-ink">{props.settingKey}</code>
        {twoKey ? (
          <span className="rounded-full border border-rule px-1.5 py-0.5 text-[.68rem] text-ink-muted">
            two keys
          </span>
        ) : null}
        {changed ? (
          <span className="rounded-full border border-rule px-1.5 py-0.5 text-[.68rem] text-ink-muted">
            changed from the default
          </span>
        ) : null}
        {props.canEdit ? (
          <button
            type="button"
            onClick={() => { setOpen(!open); setError(null); setDone(null); }}
            className="ml-auto rounded-md border border-rule px-2.5 py-1 text-[.76rem] text-ink-muted"
          >
            {twoKey ? 'Open a request' : 'Change it'}
          </button>
        ) : null}
      </div>

      {!isPrompt ? (
        <div className="mt-1.5 font-mono text-[.8rem] tnum">{render(props.value)}</div>
      ) : (
        <div className="mt-1.5 text-[.78rem] text-ink-faint">
          {String(props.value).length.toLocaleString('en-US')} characters, seeded from the skill
        </div>
      )}

      {changed ? (
        <div className="mt-0.5 font-mono text-[.72rem] text-ink-faint">
          default {isPrompt ? 'is the seeded text' : render(props.defaultValue)}
        </div>
      ) : null}

      {/* The argument the setting encodes, in front of the person changing it. */}
      <p className="mt-1.5 max-w-[68ch] text-[.8rem] leading-relaxed text-ink-muted">
        {props.rationale}
      </p>

      {twoKey && props.protects ? (
        <p className="mt-1 max-w-[68ch] text-[.8rem]" style={{ color: 'var(--st-serious)' }}>
          Protects {props.protects}.
        </p>
      ) : null}

      {open ? (
        <form
          className="mt-3 rounded-lg border border-rule bg-surface-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fn = twoKey ? openChangeRequest : editSetting;
            start(async () => {
              const r = await fn({ key: props.settingKey, valueJson: draft, reason });
              if (r.ok) {
                setOpen(false);
                setReason('');
                setDone(twoKey ? 'Request sent to the other principal.' : 'Saved as a new version.');
              } else {
                setError(r.error);
              }
            });
          }}
        >
          {twoKey ? (
            <div className="mb-3 rounded-md border border-rule bg-surface p-3">
              <div className="kicker">What this changes</div>
              <p className="mt-1.5 max-w-[62ch] text-[.83rem] leading-relaxed">
                {props.otherPrincipalName ?? 'The other principal'} currently relies on this.
                Turning it off is a unilateral edit to a two party agreement, so it takes their
                approval rather than yours alone. Nothing here is locked: the point is that the
                person a rule constrains should not be able to switch it off at the moment it
                inconveniences them.
              </p>
            </div>
          ) : null}

          {isPrompt ? (
            <textarea
              rows={12}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-md border border-rule bg-surface px-2.5 py-2 font-mono text-[.76rem]"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 font-mono text-[.84rem]"
            />
          )}

          <label className="kicker mt-3 block" htmlFor={`why-${props.settingKey}`}>Why</label>
          <input
            id={`why-${props.settingKey}`}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[.84rem]"
          />
          <p className="mt-1.5 text-[.74rem] text-ink-faint">
            The reason is stored with the version. Every record written afterwards is stamped with
            the version it was made under, so an old review is never reinterpreted under a newer
            method.
          </p>

          {error ? (
            <p className="mt-2 text-[.8rem]" style={{ color: 'var(--st-crit)' }}>{error}</p>
          ) : null}

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand px-3 py-1.5 text-[.82rem] text-on-brand disabled:opacity-45"
            >
              {pending ? 'Saving' : twoKey ? 'Send the request' : 'Save a new version'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setDraft(render(props.value)); }}
              className="rounded-md border border-rule px-3 py-1.5 text-[.82rem] text-ink-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {done ? <p className="mt-2 text-[.8rem] text-ink-muted">{done}</p> : null}
    </div>
  );
}
