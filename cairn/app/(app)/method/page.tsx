import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { method } from '@/lib/method/accessor';
import { members } from '@/lib/plan/read';
import { SettingRow } from '@/components/plan/SettingRow';
import { ChangeRequest } from '@/components/plan/ChangeRequest';
import { Card } from '@/components/ui/Tile';

export const dynamic = 'force-dynamic';

/** The groups the Method screen renders, in the order someone would read them. */
const GROUPS: { prefix: string; title: string; blurb: string }[] = [
  { prefix: 'structure.', title: 'Structure',
    blurb: 'The domains and the order they are worked in.' },
  { prefix: 'cadence.', title: 'Cadence',
    blurb: 'How often each review comes round.' },
  { prefix: 'timebox.', title: 'Timeboxes',
    blurb: 'Reviews and sessions have fixed durations, and the app enforces them.' },
  { prefix: 'session.', title: 'Session shape',
    blurb: 'The blocks, the breaks, and the minute after which no new heavy item opens.' },
  { prefix: 'rules.', title: 'Rule thresholds',
    blurb: 'The bars that make the discipline computed rather than remembered.' },
  { prefix: 'decision.', title: 'Decisions',
    blurb: 'The weight budget and the band inside which a result is a tie.' },
  { prefix: 'advisory.', title: 'Advisory limits',
    blurb: 'How much may be said, how often, and when it stops.' },
  { prefix: 'money.', title: 'Money',
    blurb: 'The horizon the schedule runs over.' },
  { prefix: 'protection.', title: 'Protections',
    blurb: 'Fully editable, and each takes two keys, because each is something the other person relies on.' },
  { prefix: 'prompts.', title: 'Prompts',
    blurb: 'The six skills, seeded verbatim as the method rather than as files in the codebase.' },
];

export default async function MethodPage() {
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const m = await method(tx);
    const people = await members(tx);

    const versions = (await tx.execute(sql`
      select v.id, v.version, v.label, v.note, v.active, v.created_at,
             mm.display_name as author
        from method_version v
        left join member mm on mm.id = v.created_by_member_id
       where v.household_id is not null
       order by v.version desc
       limit 20`)) as unknown as Array<{
        id: string; version: number; label: string; note: string;
        active: boolean; created_at: string; author: string | null;
      }>;

    const requests = (await tx.execute(sql`
      select r.id, r.key, r.from_value, r.to_value, r.reason, r.requested_by_member_id,
             mm.display_name as requested_by
        from method_change_request r
        join member mm on mm.id = r.requested_by_member_id
       where r.status = 'pending'
       order by r.requested_at`)) as unknown as Array<{
        id: string; key: string; from_value: unknown; to_value: unknown;
        reason: string; requested_by_member_id: string; requested_by: string;
      }>;

    return { settings: m.all(), version: m.version, label: m.label, people, versions, requests };
  });

  const isPrincipal = viewer.role === 'principal';
  const otherPrincipal = data.people.find(
    (p) => p.role === 'principal' && p.id !== viewer.memberId,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">Method</h1>
        <p className="mt-1 max-w-[66ch] text-[.86rem] text-ink-muted">
          The method is data, and it belongs to this household. Every setting shows its value, the
          value Cairn ships, and the argument it encodes, because someone about to reorder the
          domains should be reading why Faith opens as a filter at the moment they change it.
        </p>
        <p className="mt-2 font-mono text-[.74rem] text-ink-faint">
          Running v{data.version}: {data.label}
        </p>
      </header>

      {data.requests.length > 0 ? (
        <Card
          title="Waiting on a second key"
          sub="A change to something the other principal relies on."
        >
          <div className="space-y-2.5">
            {data.requests.map((r) => (
              <ChangeRequest
                key={r.id}
                requestId={r.id}
                settingKey={r.key}
                fromValue={JSON.stringify(r.from_value)}
                toValue={JSON.stringify(r.to_value)}
                reason={r.reason}
                requestedBy={r.requested_by}
                isMine={r.requested_by_member_id === viewer.memberId}
                protects={data.settings.find((s) => s.key === r.key)?.protects ?? null}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {GROUPS.map((g) => {
        const rows = data.settings.filter((s) => s.key.startsWith(g.prefix));
        if (rows.length === 0) return null;
        return (
          <Card key={g.prefix} title={g.title} sub={g.blurb}>
            {rows.map((s) => (
              <SettingRow
                key={s.key}
                settingKey={s.key}
                value={s.value}
                defaultValue={s.defaultValue}
                tier={s.tier}
                protects={s.protects}
                rationale={s.rationale}
                fromCanonical={s.fromCanonical}
                otherPrincipalName={otherPrincipal?.displayName ?? null}
                canEdit={isPrincipal}
              />
            ))}
          </Card>
        );
      })}

      {data.versions.length > 0 ? (
        <Card
          title="History"
          sub="Reverting is a forward step with its own entry, never a rollback that erases what happened."
        >
          <ul className="space-y-2.5">
            {data.versions.map((v) => (
              <li key={v.id} className="border-b border-rule pb-2.5 text-[.86rem] last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="ref">v{v.version}</span>
                  <span>{v.label}</span>
                  {v.active ? (
                    <span className="rounded-full border border-rule px-1.5 py-0.5 text-[.68rem] text-ink-muted">
                      running
                    </span>
                  ) : null}
                  <span className="ml-auto font-mono text-[.72rem] text-ink-faint">
                    {new Date(v.created_at).toISOString().slice(0, 10)}
                    {v.author ? `, ${v.author}` : ''}
                  </span>
                </div>
                <p className="mt-0.5 max-w-[62ch] text-[.8rem] text-ink-muted">{v.note}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <p className="text-[.84rem] text-ink-faint">
          This household is running the method Cairn ships, unchanged. The first edit forks it.
        </p>
      )}
    </div>
  );
}
