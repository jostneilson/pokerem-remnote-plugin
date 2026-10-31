import type { LearnsetEntry } from './learnsetRules';

/**
 * Legacy export retained for callers. Canonical level-up data is not patched with
 * fantasy overrides; future corrections belong in the reproducible importer.
 */
export const LEARNSET_OVERRIDES: Partial<Record<number, LearnsetEntry[]>> = {};
