import { redirect } from 'next/navigation';
import { configState } from '@/lib/config';
import { Misconfigured, NotConfigured } from '@/components/ui/NotConfigured';
import { scopeProblem } from '@/lib/db/client';
import { currentViewer } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase/server';
import { SignInForm } from './SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const config = configState();
  if (!config.ready) return <NotConfigured state={config} />;

  const problem = await scopeProblem();
  if (problem) return <Misconfigured problem={problem} />;

  const viewer = await currentViewer().catch(() => null);
  if (viewer) redirect('/');

  const supabase = await supabaseServer().catch(() => null);
  const signedIn = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (signedIn) redirect('/setup');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-7 flex items-center gap-2.5">
        <span aria-hidden className="flex flex-col items-center gap-[2px]">
          <i className="block h-[3px] w-[9px] rounded-[1px] bg-brand" />
          <i className="block h-[3px] w-[13px] rounded-[1px] bg-brand" />
          <i className="block h-[3px] w-[17px] rounded-[1px] bg-brand" />
        </span>
        <div>
          <h1 className="font-serif text-[1.3rem] leading-none">Cairn</h1>
          <p className="mt-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-ink-faint">
            Household plan
          </p>
        </div>
      </div>
      <SignInForm />
      <p className="mt-6 max-w-[42ch] text-[.78rem] leading-relaxed text-ink-muted">
        A cairn is a marker on a long path that people add stones to over time.
        This one holds a plan across seven domains, and the rules that keep it honest
        are queries rather than things anyone has to remember.
      </p>
    </main>
  );
}
