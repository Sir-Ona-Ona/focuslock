/**
 * What the deployment needs before it can serve a request, and what it can do
 * without.
 *
 * A fresh deploy with no environment set should say which variable is missing,
 * not return a 500. In production Next.js strips error messages from the client
 * for good reason, so an error boundary cannot report this: the check has to
 * happen before anything throws.
 */

export interface ConfigItem {
  name: string;
  present: boolean;
  what: string;
}

export interface ConfigState {
  ready: boolean;
  missingRequired: ConfigItem[];
  optional: ConfigItem[];
}

export function configState(): ConfigState {
  const required: ConfigItem[] = [
    {
      name: 'DATABASE_URL',
      present: Boolean(process.env.DATABASE_URL),
      what: 'The pooled Supabase connection, as the cairn_app role. That role is what every '
        + 'row level policy is enforced against, so it must not be a superuser: a superuser '
        + 'bypasses every policy silently.',
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      what: 'The Supabase project URL, used for the email sign in.',
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      what: 'The Supabase publishable key, the one beginning sb_publishable_ (the legacy anon '
        + 'JWT also works). Safe in the browser: it grants nothing on its own, because '
        + 'authorization lives in the database rather than in the client.',
    },
  ];

  const optional: ConfigItem[] = [
    {
      name: 'ANTHROPIC_API_KEY',
      present: Boolean(process.env.ANTHROPIC_API_KEY),
      what: 'Facilitated reviews. Every other part of Cairn works without it, and a review '
        + 'can be run by hand from the track screens.',
    },
    {
      name: 'CRON_SECRET',
      present: Boolean(process.env.CRON_SECRET),
      what: 'Guards the scheduled routes. Needed from phase 6, when the collision scan and '
        + 'the prep briefs start running.',
    },
  ];

  return {
    ready: required.every((r) => r.present),
    missingRequired: required.filter((r) => !r.present),
    optional,
  };
}
