import { describe, expect, it } from 'vitest';
import { canAgree } from '@/lib/rules/agreement';

describe('who may agree a joint item', () => {
  it('lets the other principal agree it', () => {
    expect(canAgree({ proposedByMemberId: 'a' }, 'b')).toBe(true);
  });

  it('never lets the proposer agree their own', () => {
    // The database refuses this outright. This exists so the interface offers
    // the right three actions rather than one that will fail.
    expect(canAgree({ proposedByMemberId: 'a' }, 'a')).toBe(false);
  });

  it('offers nothing to agree when nobody proposed it', () => {
    expect(canAgree({ proposedByMemberId: null }, 'a')).toBe(false);
  });
});
