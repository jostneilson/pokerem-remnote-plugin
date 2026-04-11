import type { PokemonType } from '../data/species';
import { MOVES } from '../data/moves';
import { getEffectiveness } from '../data/typeChart';

/** Scales chip XP by move effectiveness (neutral = 1). */
export function effectivenessXpFactor(eff: number): number {
  if (eff <= 0) return 0;
  if (eff < 1) return 0.88;
  if (eff === 1) return 1;
  if (eff === 2) return 1.28;
  return 1.5; // 4×
}

export function xpFromPlayerAttack(params: {
  damage: number;
  moveId: string;
  defenderTypes: PokemonType[];
}): number {
  const move = MOVES[params.moveId];
  const moveType = move?.type ?? 'Normal';
  const eff = getEffectiveness(moveType, params.defenderTypes);
  if (eff <= 0) return 0;
  const base = 2 + Math.floor(params.damage * 0.11);
  return Math.max(1, Math.round(base * effectivenessXpFactor(eff)));
}

export function xpFromTakingHit(params: {
  damage: number;
  wildMoveId: string;
  playerTypes: PokemonType[];
}): number {
  if (params.damage <= 0) return 0;
  const move = MOVES[params.wildMoveId];
  const moveType = move?.type ?? 'Normal';
  const eff = getEffectiveness(moveType, params.playerTypes);
  const base = 1 + Math.floor(params.damage * 0.085);
  return Math.max(0, Math.round(base * effectivenessXpFactor(eff)));
}
