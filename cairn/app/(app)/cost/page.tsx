import { sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { withMember } from '@/lib/db/client';
import { RATE_CARD_DATE } from '@/lib/claude/client';
import { Card, Tile } from '@/components/ui/Tile';
import { formatMonth } from '@/components/ui/vocab';

export const dynamic = 'force-dynamic';

/**
 * What this household costs to run, by flow and by month.
 *
 * OD-8 priced Cairn as a flat per-household subscription, which accepts that
 * cost scales with engagement while price does not. This page is what makes
 * that exposure measured rather than assumed, and it is what OD-9 reads.
 */
export default async function CostPage() {
  const viewer = await requireViewer();

  const rows = await withMember(viewer.memberId, async (tx) =>
    (await tx.execute(sql`
      select month::text as month, flow, calls, input_tokens, output_tokens,
             cache_read_input_tokens, cost_usd
        from v_model_cost_month
       order by month desc, flow`)) as unknown as Array<{
        month: string; flow: string; calls: number;
        input_tokens: string; output_tokens: string;
        cache_read_input_tokens: string; cost_usd: string;
      }>);

  const total = rows.reduce((n, r) => n + Number(r.cost_usd), 0);
  // method-literal-ok: the length of a YYYY-MM prefix
  const thisMonth = new Date().toISOString().slice(0, 7);
  const current = rows
    .filter((r) => r.month.startsWith(thisMonth))
    .reduce((n, r) => n + Number(r.cost_usd), 0);
  const cached = rows.reduce((n, r) => n + Number(r.cache_read_input_tokens), 0);
  const input = rows.reduce((n, r) => n + Number(r.input_tokens), 0);

  const usd = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-serif text-[1.7rem]">Model cost</h1>
        <p className="mt-1 max-w-[64ch] text-[.86rem] text-ink-muted">
          What the facilitated flows cost this household. Priced at the rate card as it stood on
          the day of each call, so a later price change never rewrites what a past month cost.
          Rate card of {RATE_CARD_DATE}.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-[.9rem] text-ink-muted">
          No model calls yet. This fills in from the first facilitated review, which is
          deliberate: cost recorded retrospectively is guesswork.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="This month" value={usd(current)} note="across every flow" />
            <Tile label="All time" value={usd(total)} note={`${rows.reduce((n, r) => n + r.calls, 0)} calls`} />
            <Tile
              label="Served from cache"
              value={input + cached > 0
                ? `${Math.round((cached / (input + cached)) * 100)}%`
                : '0%'}
              note="of input tokens, at a tenth of the price"
            />
          </div>

          <Card title="By month and flow" sub="The distribution OD-9 turns on.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-[.82rem]">
                <thead>
                  <tr>
                    {['Month', 'Flow', 'Calls', 'Input', 'Output', 'Cost'].map((h) => (
                      <th
                        key={h}
                        className="border-b border-rule-strong px-2 py-1.5 text-left font-mono
                                   text-[.64rem] font-medium uppercase tracking-[.1em] text-ink-faint"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.month}-${r.flow}`}>
                      <td className="border-b border-rule px-2 py-1.5">{formatMonth(r.month)}</td>
                      <td className="border-b border-rule px-2 py-1.5">{r.flow}</td>
                      <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum">
                        {r.calls}
                      </td>
                      <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum">
                        {Number(r.input_tokens).toLocaleString('en-US')}
                      </td>
                      <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum">
                        {Number(r.output_tokens).toLocaleString('en-US')}
                      </td>
                      <td className="border-b border-rule px-2 py-1.5 text-right font-mono tnum">
                        {usd(Number(r.cost_usd))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
