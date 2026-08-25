/**
 * A hardcoded threshold, timebox, domain list or prompt string anywhere in
 * app/ or lib/ outside lib/method/seed/ is a bug.
 *
 * This is a check rather than a code review habit, because a code review habit
 * will miss one, and the whole method layer exists so that changing a number is
 * a versioned record rather than an edit and a deploy.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { FINDING_RULES } from '../lib/method/seed/finding-rules';
import { SETTINGS } from '../lib/method/seed/settings';

const ROOTS = ['app', 'lib', 'components'];
const EXEMPT = [
  'lib/method/seed',
  'lib/db/migrations',
  // The enum has to name its own values, and column widths are storage rather
  // than method. Nothing in the schema reads a threshold to decide anything.
  'lib/db/schema.ts',
];

const DOMAIN_CODES = (SETTINGS.find((s) => s.key === 'structure.domain_order')
  ?.value ?? []) as string[];

// Numbers worth catching: the ones that carry an argument. 0, 1 and 2 appear in
// too much ordinary code to be a useful signal.
const NUMERIC_KEYS = [
  'rules.slippage_moves', 'rules.rollover_limit', 'rules.assumption_cycles',
  'session.cutoff_minute', 'decision.weight_budget', 'decision.tie_band',
  'timebox.review_individual', 'timebox.review_joint',
  'timebox.session_individual', 'timebox.session_joint',
  'cadence.individual_days', 'cadence.joint_days',
  'advisory.pattern_min_history_days', 'advisory.disconfirm_min_chars',
  'money.horizon_months',
];

const guarded = new Set(
  NUMERIC_KEYS
    .map((k) => SETTINGS.find((s) => s.key === k)?.value)
    .filter((v): v is number => typeof v === 'number' && v > 2),
);
for (const rule of FINDING_RULES) {
  if (rule.minHistoryDays > 2) guarded.add(rule.minHistoryDays);
}

interface Finding { file: string; line: number; text: string; why: string }

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(full)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Blanks out comments and string literals, including ones that span lines,
 * while keeping every newline so line numbers still point at the right place.
 * A number inside a class name, a colour or a SQL page size is not a method
 * threshold, and a check that cries wolf on those gets switched off in a week.
 */
function stripLiterals(src: string): string {
  const out: string[] = [];
  let i = 0;
  const keepNewlines = (text: string) => text.replace(/[^\n]/g, ' ');

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '/' && next === '/') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      out.push(keepNewlines(src.slice(i, stop)));
      i = stop;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out.push(keepNewlines(src.slice(i, stop)));
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === ch) break;
        j += 1;
      }
      out.push(ch + keepNewlines(src.slice(i + 1, j)) + ch);
      i = Math.min(j + 1, src.length);
      continue;
    }
    out.push(ch);
    i += 1;
  }
  return out.join('');
}

const findings: Finding[] = [];
const SUPPRESS = /method-literal-ok:\s*\S/;
// A whole file of pixel geometry earns one marker rather than forty. It waives
// the numeric rule only: a domain list written out is still a bug anywhere.
const SUPPRESS_FILE = /method-literal-ok-file:\s*\S/;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(process.cwd(), file);
    if (EXEMPT.some((e) => rel.startsWith(e))) continue;

    const raw = readFileSync(file, 'utf8');
    const numericWaived = SUPPRESS_FILE.test(raw);
    const rawLines = raw.split('\n');
    const codeLines = stripLiterals(raw).split('\n');

    codeLines.forEach((code, i) => {
      if (code.trim() === '') return;
      // An exemption has to say why, on the line above or the line itself.
      if (SUPPRESS.test(rawLines[i] ?? '') || SUPPRESS.test(rawLines[i - 1] ?? '')) return;

      // A domain code list written out in application code will be wrong the
      // day someone reorders the domains.
      const codesOnLine = DOMAIN_CODES.filter((c) => (rawLines[i] ?? '').includes(`'${c}'`));
      if (codesOnLine.length >= 3) {
        findings.push({
          file: rel, line: i + 1, text: (rawLines[i] ?? '').trim(),
          why: 'domain codes written out. Read them from method.domains().',
        });
      }

      if (numericWaived) return;

      for (const n of guarded) {
        const re = new RegExp(`(^|[^\\w.$])${n}([^\\w.]|$)`);
        if (re.test(code)) {
          findings.push({
            file: rel, line: i + 1, text: (rawLines[i] ?? '').trim(),
            why: `${n} is a seeded method threshold. Read it through the accessor, `
               + 'or mark the line method-literal-ok with a reason.',
          });
          break;
        }
      }
    });
  }
}

if (findings.length > 0) {
  console.error('Method values found as literals in application code:\n');
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.why}`);
    console.error(`    ${f.text}\n`);
  }
  process.exit(1);
}

console.log('No seeded thresholds, domain lists or prompt strings outside lib/method/seed.');
