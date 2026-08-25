export function Tile({
  label, value, note, alert,
}: { label: string; value: string; note?: string; alert?: boolean }) {
  return (
    <div className="card p-4">
      <div className="kicker">{label}</div>
      <div
        className="mt-2 font-serif text-[1.85rem] leading-tight tnum"
        style={alert ? { color: 'var(--st-crit)' } : undefined}
      >
        {value}
      </div>
      {note ? <div className="mt-1 text-[.78rem] text-ink-muted">{note}</div> : null}
    </div>
  );
}

export function Card({
  title, sub, children, action,
}: {
  title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-4 py-3">
        <h2 className="font-serif text-[1.05rem]">{title}</h2>
        {sub ? <p className="text-[.78rem] text-ink-muted">{sub}</p> : null}
        {action ? <div className="ml-auto">{action}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Meter({ parts, ceiling, max }: {
  parts: { token: string; value: number; label: string }[];
  ceiling: number;
  max: number;
}) {
  const scale = Math.max(max, ceiling) || 1;
  return (
    <div>
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-[5px] bg-surface-3">
        {parts.map((p) => (
          <span
            key={p.label}
            title={`${p.label}: ${p.value}`}
            style={{ width: `${(p.value / scale) * 100}%`, background: p.token }}
            className="block h-full border-l-2 border-surface first:border-l-0"
          />
        ))}
      </div>
      <div className="relative mt-1 h-4">
        <i
          className="absolute top-0 block h-2 w-0.5 bg-ink"
          style={{ left: `${(ceiling / scale) * 100}%` }}
          aria-hidden
        />
        <em
          className="absolute top-0 -translate-x-1/2 pt-2 font-mono text-[.64rem] not-italic text-ink-muted"
          style={{ left: `${(ceiling / scale) * 100}%` }}
        >
          ceiling {ceiling}
        </em>
      </div>
    </div>
  );
}
