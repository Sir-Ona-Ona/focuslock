'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  token?: string;
  count?: number | string;
  alert?: boolean;
}

export interface NavGroup { group: string; items: NavItem[] }

export function Nav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Sections" className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:overflow-visible md:px-2 md:py-3">
      {groups.map((g) => (
        <div key={g.group} className="contents md:block">
          <div className="hidden px-2 pb-1 pt-3 font-mono text-[.63rem] uppercase tracking-[.14em] text-ink-faint md:block">
            {g.group}
          </div>
          {g.items.map((item) => {
            const current = path === item.href
              || (item.href !== '/' && path.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5
                            text-[.85rem] md:w-full ${
                              current ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:bg-surface-2'
                            }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.token ?? 'transparent' }}
                />
                <span>{item.label}</span>
                {item.count !== undefined && item.count !== 0 ? (
                  <span
                    className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[.64rem] ${
                      item.alert
                        ? 'bg-[var(--st-crit)] text-white'
                        : 'bg-surface-3 text-ink-muted'
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
