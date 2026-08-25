import 'server-only';
import type { ReviewFacts } from '@/lib/rules/for-review';
import type { Method } from '@/lib/method/accessor';

/**
 * Builds a system prompt from the method, never from a literal.
 *
 * Two rules hold this together. The prompt body is a method setting seeded from
 * the skill that tested it, so changing the method is a versioned record rather
 * than an edit and a deploy. And everything the method controls is injected
 * rather than written into the text: a prompt that names its own domain order
 * will be wrong the day someone reorders the domains, so it is told the order
 * instead.
 *
 * The facts block is the other half of I-7. Every number the model will discuss
 * is here, computed. Nothing in the assembled prompt asks it to count.
 */

const FACTS_HEADER = '<computed_facts>';
const FACTS_FOOTER = '</computed_facts>';

export interface AssembledPrompt {
  /** Stable across a session, so it caches. */
  system: string;
  /** Changes each time the plan changes, so it sits after the cached prefix. */
  facts: string;
}

export function assembleReview(m: Method, facts: ReviewFacts): AssembledPrompt {
  const body = m.prompt('review');

  const domainList = facts.domains
    .map((d, i) => `${i + 1}. ${d.code}, ${d.short}: ${d.name}`)
    .join('\n');

  const system = [
    body,
    '',
    '<operating_context>',
    'You are running inside Cairn, which holds this household\'s plan in a database.',
    'The file paths and markdown conventions in the method above describe how this',
    'method was originally practised. Here the same work happens through tools:',
    'read what you are given, and change the plan only by calling a tool.',
    '',
    'Work the domains in this order, which is the order this household\'s method',
    'states. Do not reorder them, and do not use an order you remember:',
    domainList,
    '',
    `This is a ${facts.mode} review with a timebox of ${facts.timeboxMinutes} minutes.`,
    'The application enforces the clock. You do not need to watch it, and you should',
    'not spend turns reporting how much time is left.',
    '',
    'Rules of the room:',
    '',
    '- Every count, total and threshold you need has already been computed and is',
    '  given to you in the facts block. Never recount, re-derive, or estimate a',
    '  number. If a figure you want is not in the facts, say that it is not',
    '  available rather than producing one.',
    '- A review refreshes state. It does not decide things. If a real decision',
    '  emerges, name it and route it to a session or a decision brief.',
    '- Never author into a track the actor does not own. To raise something on',
    '  another member\'s track, use raise_pending_item, which puts it in their',
    '  queue for them to work through.',
    '- A joint item that is proposed has no execution status. Do not ask how it is',
    '  going. Ask whether it belongs in the plan.',
    '- Interpretation stays neutral: "survived three cycles without a test, treat',
    '  it as unverified", not "this is definitely wrong". Firm language is for the',
    '  mechanical rules only: "it cannot roll again unchanged".',
    '- Do not use em dashes or en dashes as punctuation. Use colons, commas,',
    '  parentheses or a full stop.',
    '</operating_context>',
  ].join('\n');

  return { system, facts: renderFacts(facts) };
}

/**
 * The facts, as text the model reads rather than JSON it has to parse.
 *
 * Rendered rather than stringified because a review is a conversation about
 * these numbers, and prose the model can quote back is what keeps its answers
 * traceable to the engine that produced them.
 */
export function renderFacts(f: ReviewFacts): string {
  const lines: string[] = [FACTS_HEADER];

  lines.push(`Computed on ${f.generatedOn} for ${f.actor}. Every number below comes from the`);
  lines.push('rules engine. These are the only figures in play.');
  lines.push('');

  lines.push(`Last ${f.mode} review: ${
    f.daysSinceLastReview === null
      ? 'none recorded'
      : `${f.daysSinceLastReview} days ago`
  }`);
  lines.push('');

  lines.push('THRESHOLDS THIS HOUSEHOLD RUNS');
  lines.push(`- A milestone that has moved ${f.thresholds.slippageMoves} times needs its goal re-examined, not its date.`);
  lines.push(`- A commitment carried ${f.thresholds.rolloverLimit} review periods must be parked, dropped or re-scoped.`);
  lines.push(`- A joint item proposed for ${f.thresholds.proposedCycles} cycles is forced: agree it, or move it to one track.`);
  lines.push(`- An assumption carried ${f.thresholds.assumptionCycles} reviews past its test date is a hope.`);
  lines.push('');

  lines.push('MILESTONE COUNTS IN SCOPE');
  lines.push(`- total ${f.counts.milestonesInScope}, on track ${f.counts.onTrack}, at risk ${f.counts.atRisk},`);
  lines.push(`  slipped ${f.counts.slipped}, blocked ${f.counts.blocked}, done ${f.counts.done}, parked ${f.counts.parked}`);
  lines.push('');

  section(lines, 'DUE INSIDE 90 DAYS', f.dueInside90Days, (d) =>
    `- ${d.ref} ${d.title} (${d.domainCode}, ${d.trackLabel}) target ${d.targetDate}, `
    + `${d.daysAway} days away, status ${d.status ?? 'not yet part of the plan'}`);

  section(lines, 'MILESTONES THAT HAVE MOVED', f.slippage, (s) =>
    `- ${s.ref} ${s.title}: moved ${s.moveCount} times, originally ${s.originalTargetDate}, `
    + `now ${s.targetDate}, history ${s.moveHistory.join(' then ')}`
    + (s.needsGoalReexamined ? '. AT THE THRESHOLD: this is a goal question, not a date question.' : ''));

  section(lines, 'COMMITMENTS AT THE ROLLOVER LIMIT', f.rollovers, (r) =>
    `- "${r.text}" carried ${r.rolloverCount} times, due ${r.dueDate}. It cannot roll again unchanged.`);

  section(lines, 'JOINT ITEMS PROPOSED AND NOT AGREED', f.proposedUnagreed, (p) =>
    `- ${p.ref} ${p.title}: unagreed for ${p.cyclesProposed} cycles`
    + (p.forced ? '. AT THE LIMIT: agree it, or move it to the individual track of whoever wants it.' : ''));

  section(lines, 'ASSUMPTIONS PAST THEIR TEST DATE', f.expiredAssumptions, (a) =>
    `- ${a.ref} "${a.statement}" (${a.confidence} confidence, test by ${a.testBy}), `
    + `${a.carries} milestones rest on it, carried through ${a.carriedReviewCount} reviews`
    + (a.isHope ? '. AT THE THRESHOLD: this is a hope, not an assumption.' : ''));

  if (f.load.length > 0) {
    lines.push('HOURS AGAINST CEILING');
    for (const l of f.load) {
      lines.push(
        `- demand ${l.demand} h/wk against a ceiling of ${l.ceiling}, gap ${l.gap}`
        + (l.overCeiling
          ? `. OVER. A bad week runs to ${l.demandBad}. The four remedies are: cut a goal, `
            + 'move a date, reduce a scope, or raise the ceiling with a named change.'
          : '.'),
      );
    }
    lines.push('');
  }

  if (f.money.peak) {
    lines.push('MONEY BY MONTH');
    lines.push(`- reporting currency ${f.money.reportingCurrency}`);
    for (const s of f.money.shortfallMonths) {
      lines.push(
        `- ${s.month}: ${s.outflow} lands, ${s.income} comes in, ${s.shortfall} short`
        + (s.committed
          ? '. COMMITTED, so this is a cash problem rather than a planning problem.'
          : '. Intended rather than committed.'),
      );
    }
    lines.push('');
  }

  section(lines, 'INCOME THE PLAN NEEDS THAT NOBODY IS BUILDING',
    f.money.assumedIncomeWithoutBuilder, (i) =>
      `- ${i.label}, ${i.amountMonthly} ${i.currency} a month, with no milestone building it`);

  section(lines, 'OPEN COLLISIONS', f.openCollisions, (c) =>
    `- ${c.ref} ${c.tension}: open ${c.openDays} days`
    + (c.nextStep ? `, next step "${c.nextStep}"` : ', with no next step set'));

  section(lines, 'RAISED FOR THIS PERSON BY SOMEONE ELSE', f.pendingForActor, (p) =>
    `- "${p.text}" raised ${p.raisedAt.slice(0, 10)}`);

  lines.push(FACTS_FOOTER);
  return lines.join('\n');
}

function section<T>(lines: string[], title: string, rows: T[], render: (row: T) => string): void {
  if (rows.length === 0) return;
  lines.push(title);
  for (const row of rows) lines.push(render(row));
  lines.push('');
}

export { FACTS_HEADER, FACTS_FOOTER };
