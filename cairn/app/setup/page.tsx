import { redirect } from 'next/navigation';
import { currentViewer } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase/server';
import { SetupForm } from './SetupForm';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  // Reachable from inside the app as well as before the first household, so a
  // member is not bounced out: they are here to start or join another one.
  const viewer = await currentViewer();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/sign-in');

  return (
    <main className="mx-auto max-w-lg px-5 py-14">
      <h1 className="font-serif text-[1.5rem]">
        {viewer ? 'Another household' : 'Set up the household'}
      </h1>
      <p className="mt-2 max-w-[56ch] text-[.86rem] text-ink-muted">
        Two principals, three tracks: one each and one shared. Cairn creates all three now. Only
        their owner puts goals in a track, because a track written on someone's behalf looks like
        agreement without being agreement.
      </p>
      {viewer ? (
        <p className="mt-2 max-w-[56ch] text-[.82rem] text-ink-faint">
          A separate household, with its own tracks, method version and history. Nothing crosses
          between them, including you: you are a different member in each.
        </p>
      ) : null}
      <div className="mt-6">
        <SetupForm email={data.user.email ?? ''} />
      </div>
      {viewer ? (
        <a href="/" className="mt-4 inline-block text-[.82rem] underline decoration-rule-strong">
          Back to {viewer.householdName}
        </a>
      ) : null}
    </main>
  );
}
