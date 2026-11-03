import type { PokeRemGameState } from '../state/model';
import { damageCeiling } from './moveMechanics';
import { movesetForBattle } from './moveLearn';

/** Uses the critical-hit ceiling, without consuming randomness or changing a save. */
export function planAutoAttack(state: PokeRemGameState): { moveId?: string; message: string } {
  const wild = state.currentEncounter;
  const lead = state.party.find(p => p.id === state.activePokemonId) ?? state.party[0];
  if (state.currentTrainerBattle || !wild || wild.currentHp <= 0) return { message: 'Encounter ended.' };
  if (!lead || lead.currentHp <= 0) return { message: 'Your lead fainted. Auto attack stopped.' };
  // Sleep, paralysis and poison no longer stop auto attack: protected turns can't knock the wild out.
  const moves = movesetForBattle(lead).filter(moveId => moveId !== 'struggle').map(moveId => ({ moveId, ceiling: damageCeiling(lead, wild, moveId, true) }));
  moves.sort((a, b) => b.ceiling - a.ceiling);
  const best = moves[0];
  if (!best || best.ceiling <= 0) return { message: 'No effective attack. Try catching or change your lead.' };
  if (best.ceiling >= wild.currentHp) return { message: 'Within knockout range — try Catch!' };
  return { moveId: best.moveId, message: 'Auto attacking · stops before knockout range' };
}
