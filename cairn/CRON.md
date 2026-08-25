# Scheduled routes

Three routes exist and are guarded by `CRON_SECRET`. None of them does anything
yet: the collision scan, the prep briefs and the cadence reminders all land in
phase 6.

| Route | Phase 6 job | Suggested schedule |
|-------|-------------|--------------------|
| `/api/cron/cadence` | Reminds each member when a review is due | `0 6 * * *` |
| `/api/cron/collisions` | Scans cross-track dates and money against dependencies | `0 3 * * *` |
| `/api/cron/prep` | Writes the pre-session brief | `0 7 * * 1` |

They are deliberately **not** registered in `vercel.json`. Two reasons:

1. They are no-ops until phase 6, and a schedule that fires a route which
   returns "not implemented" is noise in the logs and cost in the account.
2. The Vercel Hobby plan caps a project at two cron jobs. Registering three
   fails the deploy, and it fails for a reason that has nothing to do with the
   code.

When phase 6 lands, add them back to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/cadence", "schedule": "0 6 * * *" },
    { "path": "/api/cron/collisions", "schedule": "0 3 * * *" },
    { "path": "/api/cron/prep", "schedule": "0 7 * * 1" }
  ]
}
```

Vercel sends `Authorization: Bearer $CRON_SECRET` on every scheduled
invocation, which is exactly what the guard in `app/api/cron/_guard.ts` checks.
Set `CRON_SECRET` before enabling them, or every firing is refused.

The collision scan in particular runs under each principal's member scope
rather than the service role, writes a `private_read_log` row for every private
item it reads, and routes anything derived from one to that item's owner alone.
