import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * The Anthropic client, server side only.
 *
 * Never a browser-side key: every call goes through a route handler or a server
 * action, executing as the authenticated member.
 */

export const MODEL = 'claude-opus-5';

let client: Anthropic | undefined;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set, so facilitated reviews are unavailable. '
      + 'Everything else in Cairn works without it.',
    );
  }
  client ??= new Anthropic();
  return client;
}

export function modelAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * The rate card, in dollars per million tokens, as at the date below.
 *
 * Calls are priced when they are made and the figure is stored, so a later
 * price change never rewrites what a past month cost. OD-9 reads the stored
 * figures rather than recomputing them.
 */
const RATE_CARD_DATE = '2026-06-24';

const RATES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function priceUsd(model: string, usage: Usage): number {
  const rate = RATES[model];
  if (!rate) return 0;
  const million = 1_000_000;
  return (
    (usage.input_tokens * rate.input
      + usage.output_tokens * rate.output
      + (usage.cache_read_input_tokens ?? 0) * rate.cacheRead
      + (usage.cache_creation_input_tokens ?? 0) * rate.cacheWrite)
    / million
  );
}

export { RATE_CARD_DATE };
