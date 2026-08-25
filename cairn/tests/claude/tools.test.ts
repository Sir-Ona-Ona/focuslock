import { describe, expect, it } from 'vitest';
import { REVIEW_TOOLS } from '@/lib/claude/tools';

/**
 * The tool list is an invariant surface.
 *
 * Assert that it contains no tool that could violate one, rather than asserting
 * on model output. A prompt asking the model to behave is not a control; the
 * absence of a tool is.
 */
describe('the review tool list', () => {
  const names = REVIEW_TOOLS.map((t) => t.name);

  it('offers no way to set a weight, because a weight is a person\'s own act', () => {
    expect(names).not.toContain('set_weight');
    expect(names.some((n) => n.includes('weight'))).toBe(false);
  });

  it('offers no way to decide anything', () => {
    expect(names.some((n) => n.startsWith('decide') || n === 'record_decision')).toBe(false);
  });

  it('offers no way to write into a track directly', () => {
    expect(names).not.toContain('write_to_track');
    expect(names).not.toContain('add_milestone_to_track');
  });

  it('offers no way to create a finding or set its severity', () => {
    expect(names).not.toContain('create_finding');
    expect(names).not.toContain('set_severity');
  });

  it('offers no way to agree a joint item', () => {
    // Agreement requires the other principal's session. A tool that could do it
    // would put agreement one model turn away from being a formality.
    expect(names).not.toContain('confirm_joint_item');
    expect(names).not.toContain('agree_joint_item');
    expect(names).toContain('record_position_on_joint_item');
  });

  it('reaches another member only through their pending queue', () => {
    expect(names).toContain('raise_pending_item');
    const raise = REVIEW_TOOLS.find((t) => t.name === 'raise_pending_item');
    expect(raise?.description).toMatch(/queue/i);
    expect(raise?.description).toMatch(/never in their plan/i);
  });

  it('requires a reason on every date move', () => {
    const move = REVIEW_TOOLS.find((t) => t.name === 'move_milestone_target');
    const schema = move?.input_schema as { required?: string[] };
    expect(schema.required).toContain('reason');
  });

  it('keeps a deterministic order, because the tool list is part of the cached prefix', () => {
    const again = REVIEW_TOOLS.map((t) => t.name);
    expect(again).toEqual(names);
  });

  it('gives every tool a schema that rejects unknown properties', () => {
    for (const tool of REVIEW_TOOLS) {
      const schema = tool.input_schema as { additionalProperties?: boolean };
      expect(schema.additionalProperties, tool.name).toBe(false);
    }
  });
});
