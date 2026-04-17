import type { LearnsetEntry } from './learnsetRules';

/**
 * Hand-authored learnsets for species where automation would feel wrong,
 * or where we want to preserve a specific progression (Eeveelutions).
 * Every move must exist in MOVES and respect learnset type rules.
 */
export const LEARNSET_OVERRIDES: Partial<Record<number, LearnsetEntry[]>> = {
  /** Flopping-fish fantasy: almost useless early, then a real attack. */
  129: [
    { level: 1, moveId: 'splash' },
    { level: 12, moveId: 'tackle' },
    { level: 18, moveId: 'watersport' },
    { level: 24, moveId: 'flail' },
  ],
  /** Shapeshifter fantasy without Transform in the catalog. */
  132: [
    { level: 1, moveId: 'transform' },
    { level: 8, moveId: 'copycat' },
    { level: 16, moveId: 'pound' },
    { level: 24, moveId: 'hiddenpower' },
    { level: 32, moveId: 'recover' },
    { level: 40, moveId: 'doubleteam' },
  ],
  /** Living alphabet: narrow Psychic toolkit. */
  201: [
    { level: 1, moveId: 'confusion' },
    { level: 10, moveId: 'imprison' },
    { level: 14, moveId: 'hiddenpower' },
    { level: 22, moveId: 'lightscreen' },
    { level: 28, moveId: 'psybeam' },
    { level: 36, moveId: 'reflect' },
  ],
  /** Water + Normal only; keeps the old “milestone ladder” feel without off-type coverage. */
  134: [
    { level: 1, moveId: 'growl' },
    { level: 1, moveId: 'tailwhip' },
    { level: 1, moveId: 'watergun' },
    { level: 5, moveId: 'smokescreen' },
    { level: 10, moveId: 'quickattack' },
    { level: 15, moveId: 'pound' },
    { level: 18, moveId: 'aquajet' },
    { level: 24, moveId: 'waterpulse' },
    { level: 30, moveId: 'bubblebeam' },
    { level: 36, moveId: 'withdraw' },
    { level: 42, moveId: 'hydropump' },
  ],
  /** Electric + Normal only. */
  135: [
    { level: 1, moveId: 'growl' },
    { level: 1, moveId: 'tailwhip' },
    { level: 1, moveId: 'nuzzle' },
    { level: 5, moveId: 'smokescreen' },
    { level: 8, moveId: 'thundershock' },
    { level: 12, moveId: 'quickattack' },
    { level: 18, moveId: 'chargebeam' },
    { level: 24, moveId: 'spark' },
    { level: 28, moveId: 'thunderwave' },
    { level: 34, moveId: 'charge' },
    { level: 40, moveId: 'discharge' },
  ],
  /** Fire + Normal only. */
  136: [
    { level: 1, moveId: 'growl' },
    { level: 1, moveId: 'tailwhip' },
    { level: 1, moveId: 'firespin' },
    { level: 5, moveId: 'smokescreen' },
    { level: 10, moveId: 'quickattack' },
    { level: 14, moveId: 'ember' },
    { level: 20, moveId: 'flamecharge' },
    { level: 26, moveId: 'incinerate' },
    { level: 32, moveId: 'firefang' },
    { level: 38, moveId: 'firepunch' },
    { level: 44, moveId: 'doubleedge' },
  ],
};
