/**
 * The words the app uses for each state, and the colour that goes with them.
 *
 * Status is never colour alone: every pill carries its label, and on the
 * timeline fill, border and dash carry it too. These are enum values rather
 * than method settings, so they live here rather than in the method.
 */

export const STATUS = {
  on_track: { label: 'On track', token: 'var(--st-good)', fill: true },
  at_risk: { label: 'At risk', token: 'var(--st-warn)', fill: true },
  slipped: { label: 'Slipped', token: 'var(--st-crit)', fill: true },
  blocked: { label: 'Blocked', token: 'var(--st-serious)', fill: false },
  done: { label: 'Done', token: 'var(--st-muted)', fill: true },
  parked: { label: 'Parked', token: 'var(--st-muted)', fill: false },
  dropped: { label: 'Dropped', token: 'var(--st-muted)', fill: false },
} as const;

export type StatusKey = keyof typeof STATUS;

export const AGREEMENT = {
  proposed: {
    label: 'Proposed',
    hint: 'One principal entered it. Not yet part of the plan.',
  },
  agreed: {
    label: 'Agreed',
    hint: 'Both confirmed it belongs in the plan.',
  },
  active: {
    label: 'Active',
    hint: 'Agreed and currently being worked.',
  },
} as const;

export type AgreementKey = keyof typeof AGREEMENT;

export const HORIZON = {
  now: 'Now',
  next: 'Next',
  later: 'Later',
  beyond: 'Beyond',
} as const;

/** Track colour by seat. Position carries identity; colour carries attention. */
export function trackToken(slot: number | null): string {
  if (slot === 1) return 'var(--track-a)';
  if (slot === 2) return 'var(--track-b)';
  return 'var(--track-j)';
}

export function formatMonth(iso: string): string {
  const [y, m] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1] ?? m} ${y}`;
}

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`;
}
