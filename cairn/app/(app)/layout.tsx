import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { configState } from '@/lib/config';
import { Misconfigured, NotConfigured } from '@/components/ui/NotConfigured';
import { currentViewer } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase/server';
import { scopeProblem, withMember } from '@/lib/db/client';
import { members, tracks } from '@/lib/plan/read';
import { proposedCycles } from '@/lib/rules/agreement';
import { method } from '@/lib/method/accessor';
import { Nav, type NavGroup } from '@/components/ui/Nav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { HouseholdSwitcher } from '@/components/ui/HouseholdSwitcher';
import { trackToken } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Checked before anything can throw. A fresh deploy should name the missing
  // variable rather than return a 500 that hides which one it is.
  const config = configState();
  if (!config.ready) return <NotConfigured state={config} />;

  // Checked before a viewer is resolved, so a connection that can ignore row
  // level security is reported here rather than discovered by the first person
  // who signs in.
  const problem = await scopeProblem();
  if (problem) return <Misconfigured problem={problem} />;

  const viewer = await currentViewer();
  // Signed in but not a member of a household yet: that is setup, not a dead end.
  if (!viewer) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    redirect(data.user ? '/setup' : '/sign-in');
  }

  const chrome = await withMember(viewer.memberId, async (tx) => {
    const [people, allTracks, unagreed, m] = await Promise.all([
      members(tx),
      tracks(tx),
      proposedCycles(tx, viewer.householdId),
      method(tx),
    ]);

    const openCollisions = (await tx.execute(sql`
      select count(*)::int as n from collision where status = 'open'`)) as unknown as
      { n: number }[];

    const pendingRequests = (await tx.execute(sql`
      select count(*)::int as n from method_change_request where status = 'pending'`)) as unknown as
      { n: number }[];

    const openReview = (await tx.execute(sql`
      select id from session_row
       where kind = 'review' and ended_at is null
         and ${viewer.memberId}::uuid = any(actor_member_ids)
       order by started_at desc limit 1`)) as unknown as { id: string }[];

    return {
      people,
      allTracks,
      unagreed: unagreed.length,
      openCollisions: openCollisions[0]?.n ?? 0,
      pendingRequests: pendingRequests[0]?.n ?? 0,
      openReviewId: openReview[0]?.id ?? null,
      methodVersion: m.version,
    };
  });

  const planItems = [
    { href: '/', label: 'Home' },
    ...chrome.people
      .filter((p) => p.role !== 'advisor')
      .flatMap((p) => {
        const item = {
          href: `/track/${p.id}`,
          label: p.id === viewer.memberId ? 'My track' : `${p.displayName}'s track`,
          token: trackToken(p.principalSlot),
        };
        return [item];
      }),
    {
      href: '/joint',
      label: 'Joint plan',
      token: trackToken(null),
      count: chrome.unagreed,
      alert: chrome.unagreed > 0,
    },
    { href: '/timeline', label: 'Timeline', count: chrome.openCollisions },
  ];

  // The joint track sits between the two individual ones, the way it does on
  // the timeline: position is what tells you whose a thing is.
  const jointIndex = planItems.findIndex((i) => i.href === '/joint');
  if (jointIndex > 2) {
    const [joint] = planItems.splice(jointIndex, 1);
    planItems.splice(2, 0, joint);
  }

  const groups: NavGroup[] = [
    { group: 'Plan', items: planItems },
    {
      group: 'Work',
      items: [
        ...(chrome.openReviewId
          ? [{ href: `/session/${chrome.openReviewId}`, label: 'Review in progress', alert: true, count: 1 }]
          : []),
        { href: '/money', label: 'Money' },
        { href: '/cost', label: 'Model cost' },
        { href: '/logs', label: 'Logs' },
      ],
    },
    {
      group: 'Household',
      items: [
        {
          href: '/method',
          label: 'Method',
          count: chrome.pendingRequests || `v${chrome.methodVersion}`,
          alert: chrome.pendingRequests > 0,
        },
        { href: '/settings/members', label: 'Members and privacy' },
      ],
    },
  ];

  return (
    <div className="md:grid md:min-h-screen md:grid-cols-[236px_1fr]">
      <aside className="border-b border-rule bg-surface md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <span aria-hidden className="flex flex-col items-center gap-[2px]">
            <i className="block h-[3px] w-[9px] rounded-[1px] bg-brand" />
            <i className="block h-[3px] w-[13px] rounded-[1px] bg-brand" />
            <i className="block h-[3px] w-[17px] rounded-[1px] bg-brand" />
          </span>
          <div>
            <Link href="/" className="font-serif text-[1.05rem] leading-none">Cairn</Link>
            <div className="mt-1 max-w-[150px] truncate font-mono text-[.62rem] uppercase
                            tracking-[.14em] text-ink-faint" title={viewer.householdName}>
              {viewer.householdName}
            </div>
          </div>
        </div>
        <Nav groups={groups} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-3 border-b border-rule bg-surface px-4 py-2.5">
          <span className="kicker">Signed in as</span>
          <span className="flex items-center gap-1.5 text-[.85rem]">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{
                background: trackToken(
                  chrome.people.find((p) => p.id === viewer.memberId)?.principalSlot ?? null,
                ),
              }}
            />
            {viewer.displayName}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <HouseholdSwitcher
              memberships={viewer.memberships}
              currentHouseholdId={viewer.householdId}
            />
            <ThemeToggle />
          </div>
        </div>
        <main className="min-w-0 flex-1 px-4 pb-16 pt-6 md:px-7">{children}</main>
      </div>
    </div>
  );
}
