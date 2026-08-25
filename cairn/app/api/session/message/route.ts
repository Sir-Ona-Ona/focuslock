import { z } from 'zod';
import { requireViewer } from '@/lib/auth/session';
import { runReviewTurn } from '@/lib/claude/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const body = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
});

/**
 * One turn of a review, streamed.
 *
 * A route handler rather than a server action because the response is a stream:
 * a review is thirty minutes of back and forth, and waiting for a whole turn
 * before showing anything makes it feel broken.
 */
export async function POST(request: Request) {
  const viewer = await requireViewer().catch(() => null);
  if (!viewer) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        for await (const event of runReviewTurn({
          memberId: viewer.memberId,
          householdId: viewer.householdId,
          sessionId: parsed.data.sessionId,
          userMessage: parsed.data.message,
        })) {
          send(event);
        }
      } catch (e) {
        send({
          type: 'error',
          text: e instanceof Error ? e.message : 'That turn did not complete.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
