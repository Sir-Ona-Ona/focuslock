import { guard } from '../_guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  // Phase 6. The scan runs under each principal's member scope rather than the
  // service role, writes a private_read_log row for every private item it
  // touches, and routes anything derived from one to that item's owner alone.
  return Response.json({ ran: 'collisions', status: 'not implemented until phase 6' });
}
