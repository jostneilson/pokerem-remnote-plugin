/**
 * Legacy label only — the live game uses **turn-based** combat (`applyCombatTurn` in `game/state/store.ts`).
 * This file remains so old imports do not break; do not describe behavior from here.
 */

/** @deprecated Actual battles are turn-based; see `applyCombatTurn` in `game/state/store.ts`. */
export const INSTANT_BATTLE_MODE_LABEL = 'Deprecated label (battles are turn-based)';
