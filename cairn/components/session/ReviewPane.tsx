'use client';

import { useEffect, useRef, useState } from 'react';
import { endReview } from '@/lib/actions/session';

interface Change {
  ref: string | null;
  title: string | null;
  field: string;
  fromValue: string | null;
  toValue: string;
  reason: string | null;
}

interface Facts {
  counts: { milestonesInScope: number; atRisk: number; slipped: number; blocked: number };
  slippage: number;
  proposedUnagreed: number;
  expiredAssumptions: number;
  dueInside90Days: number;
  overCeiling: boolean;
  shortfallMonths: number;
}

interface Turn { role: string; text: string }

export function ReviewPane({
  sessionId, mode, plannedMinutes, startedAt, endedAt, methodVersion,
  history, changes, commitments, facts,
}: {
  sessionId: string;
  mode: 'individual' | 'joint';
  plannedMinutes: number;
  startedAt: string;
  endedAt: string | null;
  methodVersion: number;
  history: Turn[];
  changes: Change[];
  commitments: { text: string; due: string }[];
  facts: Facts;
}) {
  const [turns, setTurns] = useState<Turn[]>(history);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState('');
  const [toolCalls, setToolCalls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);

  // Session state comes from one number. Storing the elapsed minutes and the
  // current position separately guarantees they will disagree, and a planning
  // tool whose own clock contradicts itself has no standing to tell anyone
  // their dates are wrong.
  useEffect(() => {
    if (endedAt) return;
    const tick = () => setElapsed(
      Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000),
    );
    tick();
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, [startedAt, endedAt]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, streaming]);

  const remaining = plannedMinutes - elapsed;
  const overrun = remaining < 0;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || busy) return;

    const message = draft;
    setDraft('');
    setTurns((t) => [...t, { role: 'user', text: message }]);
    setBusy(true);
    setError(null);
    setStreaming('');
    setToolCalls([]);

    try {
      const response = await fetch('/api/session/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? 'That turn did not reach the model.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistant = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as {
            type: string; text?: string; tool?: string; result?: string;
          };
          if (event.type === 'text' && event.text) {
            assistant += event.text;
            setStreaming(assistant);
          } else if (event.type === 'tool' && event.tool) {
            setToolCalls((c) => [...c, `${event.tool}: ${event.result ?? ''}`]);
          } else if (event.type === 'error' && event.text) {
            setError(event.text);
          }
        }
      }

      if (assistant.trim()) setTurns((t) => [...t, { role: 'assistant', text: assistant }]);
      setStreaming('');
      // Tool calls changed the plan, so the side panel is stale until reload.
      if (toolCalls.length > 0) window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That turn did not complete.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <header className="mb-4">
          <h1 className="font-serif text-[1.6rem]">
            {mode === 'joint' ? 'Joint review' : 'Your review'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[.8rem] text-ink-muted">
            <span className="font-mono tnum" style={overrun ? { color: 'var(--st-crit)' } : undefined}>
              {endedAt
                ? 'closed'
                : overrun
                  ? `${Math.abs(remaining)} min over the ${plannedMinutes} minute box`
                  : `${remaining} of ${plannedMinutes} minutes left`}
            </span>
            <span className="font-mono text-[.72rem] text-ink-faint">method v{methodVersion}</span>
          </div>
          {overrun && !endedAt ? (
            <p className="mt-2 max-w-[60ch] text-[.82rem]" style={{ color: 'var(--st-crit)' }}>
              The timebox has run out. A review refreshes state; it does not decide things.
              Close it and route anything unresolved to a session.
            </p>
          ) : null}
        </header>

        <div className="card mb-3 max-h-[58vh] overflow-y-auto p-4">
          {turns.length === 0 && !streaming ? (
            <div className="text-[.88rem] text-ink-muted">
              <p className="max-w-[62ch]">
                Every count this review needs has already been computed and handed over: what has
                moved, what is unagreed, what is past its test date, and where the hours and the
                money land. Nothing here asks the model to tally anything.
              </p>
              <p className="mt-3 max-w-[62ch]">
                Say where you want to start, or just say you are ready.
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {turns.map((t, i) => (
              <div key={i}>
                <div className="kicker">{t.role === 'user' ? 'You' : 'Cairn'}</div>
                <div className="mt-1 whitespace-pre-wrap text-[.9rem] leading-relaxed">
                  {t.text}
                </div>
              </div>
            ))}
            {streaming ? (
              <div>
                <div className="kicker">Cairn</div>
                <div className="mt-1 whitespace-pre-wrap text-[.9rem] leading-relaxed">
                  {streaming}
                </div>
              </div>
            ) : null}
            {toolCalls.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-rule bg-surface-2 p-3">
                {toolCalls.map((c, i) => (
                  <li key={i} className="font-mono text-[.74rem] text-ink-muted">{c}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div ref={bottom} />
        </div>

        {error ? (
          <p className="mb-3 text-[.84rem]" style={{ color: 'var(--st-crit)' }}>{error}</p>
        ) : null}

        {endedAt ? (
          <p className="text-[.86rem] text-ink-muted">
            This review is closed. What it changed is in the log, with the reason given at the time.
          </p>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-2">
            <textarea
              // method-literal-ok: textarea height in rows
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e);
              }}
              placeholder="Where do you want to start?"
              className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[.9rem]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="rounded-md bg-brand px-3 py-1.5 text-[.85rem] text-on-brand disabled:opacity-45"
              >
                {busy ? 'Working' : 'Send'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const r = await endReview(sessionId);
                  if (r.ok) window.location.reload();
                  else setError(r.error);
                }}
                className="rounded-md border border-rule px-3 py-1.5 text-[.85rem] text-ink-muted"
              >
                Close the review
              </button>
            </div>
          </form>
        )}
      </div>

      <aside className="space-y-3">
        <section className="card p-4">
          <div className="kicker">What the engine computed</div>
          <ul className="mt-2 space-y-1 text-[.82rem]">
            <Row label="Milestones in scope" value={facts.counts.milestonesInScope} />
            <Row label="At risk" value={facts.counts.atRisk} alert={facts.counts.atRisk > 0} />
            <Row label="Slipped" value={facts.counts.slipped} alert={facts.counts.slipped > 0} />
            <Row label="Blocked" value={facts.counts.blocked} alert={facts.counts.blocked > 0} />
            <Row label="Due inside 90 days" value={facts.dueInside90Days} />
            <Row label="Have moved" value={facts.slippage} alert={facts.slippage > 0} />
            <Row label="Proposed, unagreed" value={facts.proposedUnagreed} alert={facts.proposedUnagreed > 0} />
            <Row label="Assumptions expired" value={facts.expiredAssumptions} alert={facts.expiredAssumptions > 0} />
            <Row label="Shortfall months" value={facts.shortfallMonths} alert={facts.shortfallMonths > 0} />
          </ul>
          {facts.overCeiling ? (
            <p className="mt-2 text-[.78rem]" style={{ color: 'var(--st-crit)' }}>
              Hour demand is over the ceiling.
            </p>
          ) : null}
        </section>

        {changes.length > 0 ? (
          <section className="card p-4">
            <div className="kicker">Changed in this review</div>
            <ul className="mt-2 space-y-2 text-[.82rem]">
              {changes.map((c, i) => (
                <li key={i}>
                  {c.ref ? <span className="ref">{c.ref}</span> : null} {c.title}
                  <div className="text-[.76rem] text-ink-muted">
                    {c.field}
                    {c.fromValue ? ` from ${c.fromValue}` : ''} to {c.toValue}
                  </div>
                  {c.reason ? (
                    <div className="text-[.76rem] text-ink-faint">{c.reason}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {commitments.length > 0 ? (
          <section className="card p-4">
            <div className="kicker">Committed to</div>
            <ul className="mt-2 space-y-1.5 text-[.82rem]">
              {commitments.map((c, i) => (
                <li key={i}>
                  {c.text}
                  <span className="ml-1.5 font-mono text-[.72rem] text-ink-faint">{c.due}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span className="text-ink-muted">{label}</span>
      <span
        className="font-mono tnum"
        style={alert ? { color: 'var(--st-crit)' } : undefined}
      >
        {value}
      </span>
    </li>
  );
}
