/**
 * The rules engine.
 *
 * I-7: Claude never counts. Every computed rule is a query whose result is
 * injected into a prompt as structured context. The model is given the counts
 * and asked to run the conversation about them.
 *
 * Every function here takes a transaction already scoped to a member, so private
 * items are excluded by the ms_read policy rather than by any caller
 * remembering to filter. The one exception is forCollisionScan, which lives in
 * collisions.ts and is the only code path allowed to load a private row.
 */
export * from './slippage';
export * from './rollover';
export * from './agreement';
export * from './assumptions';
export * from './load';
export * from './money';
export * from './severity';
