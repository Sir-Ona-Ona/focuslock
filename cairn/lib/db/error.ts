/**
 * The sentence Postgres actually sent.
 *
 * Drizzle wraps a failed query in an error whose message is the SQL and the
 * parameters, which is the least useful part of it: a raise exception inside a
 * function, a check constraint and a unique index all arrive looking identical,
 * and the sentence saying which one it was sits in cause. Someone reading a
 * form should get the sentence, not the statement that carried it.
 *
 * Walks to the deepest message that is not the wrapper's own, so it keeps
 * working if another layer is added above it.
 */
export function dbMessage(e: unknown, fallback: string): string {
  let best: string | null = null;
  let cur: unknown = e;
  // method-literal-ok: a loop bound on an error chain, not a method value
  for (let depth = 0; cur instanceof Error && depth < 8; depth += 1) {
    if (cur.message && !cur.message.startsWith('Failed query')) best = cur.message;
    cur = (cur as { cause?: unknown }).cause;
  }
  return best ?? fallback;
}
