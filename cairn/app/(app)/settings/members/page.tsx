import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { members } from '@/lib/plan/read';
import { Card } from '@/components/ui/Tile';
import { OptInToggle } from '@/components/plan/OptInToggle';
import { trackToken } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const viewer = await requireViewer();

  const data = await withMember(viewer.memberId, async (tx) => {
    const people = await members(tx);
    const [household] = (await tx.execute(sql`
      select name, reporting_currency from household
       where id = ${viewer.householdId}`)) as unknown as
      Array<{ name: string; reporting_currency: string }>;
    return { people, household };
  });

  const principals = data.people.filter((p) => p.role === 'principal');
  const bothOptedIn = principals.length > 0 && principals.every((p) => p.privateReadOptIn);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">Members and privacy</h1>
        <p className="mt-1 max-w-[64ch] text-[.86rem] text-ink-muted">
          {data.household?.name}. There is no admin role and no hierarchy between principals:
          a planning tool where one person has elevated rights over the other reproduces the
          failure the whole design exists to prevent.
        </p>
      </header>

      <Card title="Members" sub="Up to six, at most two of them principals. Advisors sit outside that count.">
        <ul className="space-y-2.5">
          {data.people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 text-[.88rem]">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: trackToken(p.principalSlot) }}
              />
              <span>{p.displayName}</span>
              <span className="text-[.76rem] text-ink-faint">{p.role}</span>
              {p.trackId ? (
                <Link
                  href={`/track/${p.id}`}
                  className="text-[.78rem] underline decoration-rule-strong"
                >
                  their track
                </Link>
              ) : null}
              <span className="ml-auto text-[.76rem] text-ink-muted">
                {p.claimStatus === 'claimed' ? 'claimed' : 'unclaimed'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-[62ch] text-[.8rem] text-ink-faint">
          Adding anyone beyond the second member takes both principals, and it changes what this
          tool is: a plan two people wrote for themselves reads differently the moment a third
          person can see it.
        </p>
      </Card>

      <Card
        title="Machine reads of private items"
        sub="A decided position, with four things around it that keep it defensible."
      >
        <p className="max-w-[64ch] text-[.86rem]">
          Collision detection may read private items, and nothing else may. Both principals opt in
          separately, in their own session, and if either declines then private items are excluded
          from machine reads for the whole household. A privacy setting one person chose for both
          is not consent.
        </p>

        <div className="mt-4 space-y-2">
          {principals.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 text-[.86rem]">
              <span>{p.displayName}</span>
              <span className="text-ink-muted">
                {p.privateReadOptIn ? 'opted in' : 'has not opted in'}
              </span>
              {p.id === viewer.memberId ? (
                <OptInToggle optedIn={p.privateReadOptIn} />
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-3 max-w-[64ch] text-[.82rem] text-ink-muted">
          {bothOptedIn
            ? 'Both principals have opted in, so collision detection reads private items. Every '
              + 'finding it derives from one goes to that item\'s owner alone, and every read is '
              + 'logged where the owner can see it.'
            : 'Private items are excluded from every machine read while either principal has not '
              + 'opted in.'}
        </p>

        <Link
          href="/settings/privacy"
          className="mt-3 inline-block text-[.82rem] underline decoration-rule-strong"
        >
          Your private read log
        </Link>
      </Card>
    </div>
  );
}
