import { getBuiltLearnsets } from './learnsetBuilder';

export type { LearnsetEntry } from './learnsetRules';

/** Level-up tables for every species in `FULL_POKEDEX` (generated + small overrides). */
export const LEARNSETS = getBuiltLearnsets();
