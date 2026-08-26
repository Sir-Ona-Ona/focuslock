import { signOut } from '@/lib/actions/auth';

/**
 * A form rather than a click handler, so signing out works with no JavaScript
 * and cannot leave a half ended session behind.
 */
export function SignOut({ label = 'Sign out' }: { label?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md border border-rule px-2.5 py-1 text-[.72rem] text-ink-muted
                   hover:border-rule-strong"
      >
        {label}
      </button>
    </form>
  );
}
