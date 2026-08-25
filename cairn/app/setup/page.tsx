import { redirect } from 'next/navigation';
import { currentViewer } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase/server';
import { SetupForm } from './SetupForm';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const viewer = await currentViewer();
  if (viewer) redirect('/');

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/sign-in');

  return (
    <main className="mx-auto max-w-lg px-5 py-14">
      <h1 className="font-serif text-[1.5rem]">Set up the household</h1>
      <p className="mt-2 max-w-[56ch] text-[.86rem] text-ink-muted">
        Two principals, three tracks: one each and one shared. Cairn creates all three now. Only
        their owner puts goals in a track, because a track written on someone's behalf looks like
        agreement without being agreement.
      </p>
      <div className="mt-6">
        <SetupForm email={data.user.email ?? ''} />
      </div>
    </main>
  );
}
