'use client';

import { useMemo, useState } from 'react';
import { STATUS, formatMonth, type StatusKey } from '@/components/ui/vocab';

export interface TimelineMark {
  id: string;
  ref: string;
  title: string;
  note: string | null;
  domainCode: string;
  laneKey: string;
  targetDate: string;
  originalTargetDate: string;
  moveHistory: string[];
  status: StatusKey | null;
  agreement: 'proposed' | 'agreed' | 'active' | null;
}

export interface TimelineLane { key: string; label: string; token: string }
export interface TimelineDomain { code: string; short: string; name: string }
export interface TimelineGate { id: string; ref: string; title: string; decideBy: string }
export interface TimelineCollision {
  id: string; ref: string; tension: string;
  from: string | null; to: string | null; domains: string[];
}
export interface TimelineDependency {
  id: string; fromId: string; toId: string; nature: 'hard' | 'soft'; alert: boolean;
}

// method-literal-ok-file: this module is chart geometry in pixels and months.
// Everything the method controls, the domains and their order, arrives as props.
const ROW_H = 26;
const GROUP_PAD = 12;
const HEADER_H = 44;
const LEFT_W = 132;
const MONTH_W = 13;

function monthIndex(iso: string, start: Date): number {
  const d = new Date(iso);
  return (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
}

/**
 * The swimlane chart, hand built.
 *
 * Seven domain groups in the method's order, three lanes each with joint in the
 * middle. Position tells you whose an item is; colour tells you what needs
 * attention, which is what people scan for. Detail opens on tap and on keyboard
 * rather than on hover only, because this is opened on a phone in a room.
 */
export function Timeline({
  domains, lanes, marks, gates, collisions, dependencies, todayIso,
}: {
  domains: TimelineDomain[];
  lanes: TimelineLane[];
  marks: TimelineMark[];
  gates: TimelineGate[];
  collisions: TimelineCollision[];
  dependencies: TimelineDependency[];
  todayIso: string;
}) {
  const [selected, setSelected] = useState<TimelineMark | null>(null);
  const [laneFilter, setLaneFilter] = useState<string>('all');

  const geometry = useMemo(() => {
    const all = [
      ...marks.flatMap((m) => [m.targetDate, m.originalTargetDate, ...m.moveHistory]),
      ...gates.map((g) => g.decideBy),
      todayIso,
    ];
    const times = all.map((d) => new Date(d).getTime());
    const min = new Date(Math.min(...times, new Date(todayIso).getTime()));
    const max = new Date(Math.max(...times, new Date(todayIso).getTime()));
    const start = new Date(min.getFullYear(), min.getMonth() - 2, 1);
    const end = new Date(max.getFullYear(), max.getMonth() + 3, 1);
    const monthCount = Math.max(
      12,
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
    );
    const width = LEFT_W + monthCount * MONTH_W + 24;

    const rows: { domain: TimelineDomain; lane: TimelineLane; y: number }[] = [];
    let y = HEADER_H;
    for (const domain of domains) {
      for (const lane of lanes) {
        rows.push({ domain, lane, y });
        y += ROW_H;
      }
      y += GROUP_PAD;
    }
    return { start, monthCount, width, height: y + 12, rows };
  }, [domains, lanes, marks, gates, todayIso]);

  const x = (iso: string) => LEFT_W + (monthIndex(iso, geometry.start) + 0.5) * MONTH_W;
  const rowY = (domainCode: string, laneKey: string) =>
    geometry.rows.find((r) => r.domain.code === domainCode && r.lane.key === laneKey)?.y ?? 0;

  const visible = marks.filter((m) => laneFilter === 'all' || m.laneKey === laneFilter);
  const byId = new Map(marks.map((m) => [m.id, m]));

  const years = useMemo(() => {
    const out: { label: string; x: number }[] = [];
    for (let i = 0; i <= geometry.monthCount; i += 1) {
      const d = new Date(geometry.start.getFullYear(), geometry.start.getMonth() + i, 1);
      if (d.getMonth() === 0) {
        out.push({ label: String(d.getFullYear()), x: LEFT_W + i * MONTH_W });
      }
    }
    return out;
  }, [geometry]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-rule p-0.5" role="group" aria-label="View">
          {([{ key: 'all', label: 'All' }, ...lanes] as { key: string; label: string }[]).map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLaneFilter(l.key)}
              aria-pressed={laneFilter === l.key}
              className={`rounded px-2 py-1 text-[.76rem] ${
                laneFilter === l.key ? 'bg-surface-2 text-ink' : 'text-ink-muted'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[.72rem] text-ink-muted">
          {(Object.keys(STATUS) as StatusKey[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  background: STATUS[k].fill ? STATUS[k].token : 'transparent',
                  border: STATUS[k].fill ? 'none' : `1.5px solid ${STATUS[k].token}`,
                }}
              />
              {STATUS[k].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-ink-faint" />
            Proposed, no status yet
          </span>
        </div>
      </div>

      <div className="card max-w-full overflow-x-auto">
        <svg
          width={geometry.width}
          height={geometry.height}
          role="img"
          aria-label="Plan timeline by domain and track"
          style={{ display: 'block' }}
        >
          {years.map((y) => (
            <g key={y.label}>
              <line
                x1={y.x} x2={y.x} y1={HEADER_H - 12} y2={geometry.height}
                stroke="var(--rule)" strokeWidth={1}
              />
              <text
                x={y.x + 4} y={HEADER_H - 18}
                fill="var(--ink-faint)" fontSize={10} fontFamily="var(--mono)"
              >
                {y.label}
              </text>
            </g>
          ))}

          {/* Contested regions, hatched rather than filled, so what is under them stays readable. */}
          <defs>
            <pattern id="hatch" width={6} height={6} patternTransform="rotate(45)"
                     patternUnits="userSpaceOnUse">
              <line x1={0} y1={0} x2={0} y2={6} stroke="var(--st-warn)" strokeWidth={2} opacity={0.35} />
            </pattern>
          </defs>
          {collisions.map((c) => {
            if (!c.from || !c.to) return null;
            const rows = geometry.rows.filter((r) => c.domains.includes(r.domain.code));
            if (rows.length === 0) return null;
            const top = Math.min(...rows.map((r) => r.y)) - 3;
            const bottom = Math.max(...rows.map((r) => r.y)) + ROW_H;
            return (
              <rect
                key={c.id}
                x={x(c.from)} y={top}
                width={Math.max(6, x(c.to) - x(c.from))} height={bottom - top}
                fill="url(#hatch)"
              >
                <title>{`${c.ref}: ${c.tension}`}</title>
              </rect>
            );
          })}

          {geometry.rows.map((r, i) => (
            <g key={`${r.domain.code}-${r.lane.key}`}>
              {i % lanes.length === 0 ? (
                <text
                  x={10} y={r.y + 11}
                  fill="var(--ink)" fontSize={11} fontFamily="var(--serif)"
                >
                  {r.domain.short}
                </text>
              ) : null}
              <text
                x={70} y={r.y + 15}
                fill="var(--ink-faint)" fontSize={9.5} fontFamily="var(--mono)"
              >
                {r.lane.label}
              </text>
              <line
                x1={LEFT_W} x2={geometry.width - 12} y1={r.y + ROW_H / 2} y2={r.y + ROW_H / 2}
                stroke="var(--rule)" strokeWidth={1} strokeDasharray="2 4"
              />
            </g>
          ))}

          {/* Dependency curves. Alert coloured when the upstream item has slipped or blocked. */}
          {dependencies.map((dep) => {
            const from = byId.get(dep.fromId);
            const to = byId.get(dep.toId);
            if (!from || !to) return null;
            const x1 = x(from.targetDate);
            const y1 = rowY(from.domainCode, from.laneKey) + ROW_H / 2;
            const x2 = x(to.targetDate);
            const y2 = rowY(to.domainCode, to.laneKey) + ROW_H / 2;
            const crossesTrack = from.laneKey !== to.laneKey;
            return (
              <path
                key={dep.id}
                d={`M ${x1} ${y1} C ${x1 + 24} ${y1}, ${x2 - 24} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={dep.alert ? 'var(--st-crit)' : 'var(--rule-strong)'}
                strokeWidth={crossesTrack ? 1.6 : 1}
                strokeDasharray={dep.nature === 'soft' ? '4 3' : undefined}
              />
            );
          })}

          {/* Slippage ghosts: where it used to be, with a dotted line to where it is now. */}
          {visible.flatMap((m) => {
            const y = rowY(m.domainCode, m.laneKey) + ROW_H / 2;
            const history = [m.originalTargetDate, ...m.moveHistory].slice(0, -1);
            return history.map((h, idx) => (
              <g key={`${m.id}-ghost-${idx}`}>
                <circle
                  cx={x(h)} cy={y} r={3.5}
                  fill="none" stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="1.5 1.5"
                />
                <line
                  x1={x(h)} x2={x(m.targetDate)} y1={y} y2={y}
                  stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="1.5 2.5"
                />
              </g>
            ));
          })}

          {visible.map((m) => {
            const y = rowY(m.domainCode, m.laneKey) + ROW_H / 2;
            const proposed = m.agreement === 'proposed';
            const s = m.status ? STATUS[m.status] : null;
            const fill = proposed || !s ? 'transparent' : (s.fill ? s.token : 'transparent');
            const stroke = proposed ? 'var(--ink-faint)' : (s ? s.token : 'var(--ink-faint)');
            return (
              <g
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={`${m.ref}, ${m.title}, ${formatMonth(m.targetDate)}`}
                onClick={() => setSelected(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(m);
                  }
                  if (e.key === 'Escape') setSelected(null);
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={x(m.targetDate)} cy={y} r={9} fill="transparent" />
                <circle
                  cx={x(m.targetDate)} cy={y} r={5}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.6}
                  strokeDasharray={proposed ? '2 2' : undefined}
                />
                <title>{`${m.ref}: ${m.title}`}</title>
              </g>
            );
          })}

          {gates.map((g, i) => (
            <g key={g.id}>
              <line
                x1={x(g.decideBy)} x2={x(g.decideBy)}
                y1={HEADER_H - 8} y2={geometry.height - 8}
                stroke="var(--brand)" strokeWidth={1} strokeDasharray="5 3"
              />
              <text
                x={x(g.decideBy) + 3} y={HEADER_H - 30 + (i % 2) * 11}
                fill="var(--brand)" fontSize={9.5} fontFamily="var(--mono)"
              >
                {g.ref}
              </text>
            </g>
          ))}

          <line
            x1={x(todayIso)} x2={x(todayIso)} y1={HEADER_H - 12} y2={geometry.height}
            stroke="var(--ink)" strokeWidth={1.4}
          />
          <text
            x={x(todayIso) + 4} y={geometry.height - 2}
            fill="var(--ink-muted)" fontSize={9.5} fontFamily="var(--mono)"
          >
            today
          </text>
        </svg>
      </div>

      {selected ? (
        <div
          role="dialog"
          aria-label="Item detail"
          className="card mt-3 p-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="ref">{selected.ref}</span>
            <h3 className="font-serif text-[1.05rem]">{selected.title}</h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="ml-auto rounded-md border border-rule px-2 py-0.5 text-[.76rem] text-ink-muted"
            >
              Close
            </button>
          </div>
          <p className="mt-1 font-mono text-[.74rem] text-ink-muted">
            {formatMonth(selected.targetDate)}
            {selected.moveHistory.length > 0
              ? ` , moved ${selected.moveHistory.length}x from ${formatMonth(selected.originalTargetDate)}`
              : ''}
          </p>
          {selected.agreement === 'proposed' ? (
            <p className="mt-2 text-[.84rem] text-ink-muted">
              Proposed. Not part of the plan yet, so it carries no execution status.
            </p>
          ) : null}
          {selected.note ? (
            <p className="mt-2 max-w-[62ch] text-[.84rem] text-ink-muted">{selected.note}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
