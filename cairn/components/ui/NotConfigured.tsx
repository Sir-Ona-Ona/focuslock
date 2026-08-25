import type { ConfigState } from '@/lib/config';

/**
 * What a fresh deployment shows before its environment is set.
 *
 * It names the variables rather than saying something went wrong, because the
 * person reading this is the person who can fix it and they are one screen away
 * from doing so.
 */
export function Misconfigured({ problem }: { problem: string }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <div className="mb-7">
        <h1 className="font-serif text-[1.3rem] leading-none">Cairn</h1>
        <p className="mt-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-ink-faint">
          Refusing to serve
        </p>
      </div>
      <section className="card p-5">
        <p className="max-w-[60ch] text-[.9rem] leading-relaxed">{problem}</p>
        <p className="mt-4 max-w-[60ch] text-[.82rem] leading-relaxed text-ink-muted">
          This is refused rather than served, because the failure is silent. Every policy would
          still exist and none of them would be consulted, so the application would look
          entirely healthy while showing one member another member's private items.
        </p>
      </section>
    </main>
  );
}

export function NotConfigured({ state }: { state: ConfigState }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <div className="mb-7 flex items-center gap-2.5">
        <span aria-hidden className="flex flex-col items-center gap-[2px]">
          <i className="block h-[3px] w-[9px] rounded-[1px] bg-brand" />
          <i className="block h-[3px] w-[13px] rounded-[1px] bg-brand" />
          <i className="block h-[3px] w-[17px] rounded-[1px] bg-brand" />
        </span>
        <div>
          <h1 className="font-serif text-[1.3rem] leading-none">Cairn</h1>
          <p className="mt-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-ink-faint">
            Not configured yet
          </p>
        </div>
      </div>

      <p className="max-w-[62ch] text-[.9rem] leading-relaxed text-ink-muted">
        The build deployed. It cannot serve a plan yet, because it has no database and no way to
        sign anyone in. Set these in the project environment, then redeploy.
      </p>

      <section className="card mt-6 p-5">
        <div className="kicker">Missing</div>
        <ul className="mt-3 space-y-4">
          {state.missingRequired.map((item) => (
            <li key={item.name}>
              <code className="font-mono text-[.84rem] text-ink">{item.name}</code>
              <p className="mt-1 max-w-[58ch] text-[.82rem] leading-relaxed text-ink-muted">
                {item.what}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-4 p-5">
        <div className="kicker">Optional</div>
        <ul className="mt-3 space-y-3">
          {state.optional.map((item) => (
            <li key={item.name} className="text-[.82rem]">
              <code className="font-mono text-[.82rem]">{item.name}</code>
              <span className="ml-2 text-ink-faint">{item.present ? 'set' : 'not set'}</span>
              <p className="mt-0.5 max-w-[58ch] leading-relaxed text-ink-muted">{item.what}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-5 max-w-[62ch] text-[.8rem] leading-relaxed text-ink-faint">
        Migrations do not run on deploy. Apply them once against the database with DIRECT_URL
        set, which seeds the method and creates the cairn_app role. The README has the sequence.
      </p>
    </main>
  );
}
