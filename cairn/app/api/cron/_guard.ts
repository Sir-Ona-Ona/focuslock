/**
 * Cron entrypoints are the only place besides the migration runner where the
 * service role appears, and even there the scan re-enters member scope before
 * touching member data. Any other use is a bug.
 */
export function guard(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: 'CRON_SECRET is not set, so scheduled routes are refused.' },
      { status: 503 },
    );
  }
  const header = request.headers.get('authorization');
  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not authorised.' }, { status: 401 });
  }
  return null;
}
