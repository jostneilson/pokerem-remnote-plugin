import type { PokeRemGameState } from './state/model';

/**
 * Logical battle UI phases. Combat is turn-based (`applyCombatTurn` in `game/state/store.ts`).
 * After Defeat / Run / successful Catch, `currentEncounter` becomes null → `idle_no_encounter`.
 */
export type BattleFlowPhase = 'idle_no_encounter' | 'encounter_active' | 'resolving_action';

export function getBattleFlowPhase(
  state: PokeRemGameState,
  isResolvingAction: boolean,
): BattleFlowPhase {
  if (isResolvingAction) return 'resolving_action';
  if (state.currentEncounter) return 'encounter_active';
  return 'idle_no_encounter';
}
