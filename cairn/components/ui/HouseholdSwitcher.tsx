'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { switchHousehold } from '@/lib/actions/household';
import type { Membership } from '@/lib/auth/session';

/**
 * Which household this request is acting in.
 *
 * Only rendered when someone belongs to more than one. A person with a single
 * household should not have to think about the concept at all.
 */
export function HouseholdSwitcher({
  memberships, currentHouseholdId,
}: { memberships: Membership[]; currentHouseholdId: string }) {
  const [pending, start] = useTransition();

  if (memberships.length <= 1) {
    return (
      <Link
        href="/setup"
        className="rounded-md border border-rule px-2.5 py-1 text-[.72rem] text-ink-muted
                   hover:border-rule-strong"
      >
        Another household
      </Link>
    );
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Household</span>
      <select
        value={currentHouseholdId}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'new') { window.location.assign('/setup'); return; }
          start(async () => { await switchHousehold(value); });
        }}
        className="rounded-md border border-rule bg-surface px-2 py-1 text-[.76rem]
                   text-ink-muted disabled:opacity-45"
      >
        {memberships.map((m) => (
          <option key={m.householdId} value={m.householdId}>{m.householdName}</option>
        ))}
        <option value="new">Another household...</option>
      </select>
    </label>
  );
}
