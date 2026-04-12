import type { PokemonType } from '../data/species';
import { MOVES } from '../data/moves';
import { getEffectiveness } from '../data/typeChart';
import { getInitialMoves } from './moveLearn';

const FALLBACK_MOVE = 'tackle';

/**
 * Simplified damage without Attack/Defense stats (this mode has no physical/special stats).
 * Uses move power × level with a small level offset so low-level fights aren’t overly spongy.
 * Tuned so neutral hits are a meaningful chunk of HP at similar levels (~5–10 turns depending on typings).
 */
export function damageForMove(
  attackerLevel: number,
  moveId: string,
  attackerTypes: PokemonType[],
  defenderTypes: PokemonType[],
): number {
  const move = MOVES[moveId];
  if (!move || move.power <= 0) return 0;

  const stab = attackerTypes.includes(move.type) ? 1.5 : 1;
  const eff = getEffectiveness(move.type, defenderTypes);
  if (eff <= 0) return 0;

  const levelTerm = attackerLevel + 5;
  let dmg = Math.max(1, Math.floor((move.power * levelTerm * stab * eff) / 30));
  // Mild extra swing on clear type wins/losses (effectiveness is already in eff).
  if (eff >= 2) dmg = Math.floor(dmg * 1.06);
  else if (eff < 1) dmg = Math.max(1, Math.floor(dmg * 0.94));
  if (Math.random() < 0.06) dmg = Math.max(1, Math.floor(dmg * 1.5));
  return dmg;
}

export function pickWildCounterMove(dexNum: number, level: number): string {
  const ids = getInitialMoves(dexNum, level).filter((id) => (MOVES[id]?.power ?? 0) > 0);
  if (ids.length > 0) return ids[Math.floor(Math.random() * ids.length)]!;
  return MOVES[FALLBACK_MOVE] ? FALLBACK_MOVE : 'tackle';
}

export function moveDisplayName(moveId: string): string {
  return MOVES[moveId]?.name ?? moveId;
}

/** Discrete tier from combined type effectiveness multiplier. */
export function effectivenessTier(eff: number): 'immune' | 'resisted' | 'neutral' | 'super' {
  if (eff <= 0) return 'immune';
  if (eff >= 2) return 'super';
  if (eff < 1) return 'resisted';
  return 'neutral';
}

/** Short HUD label for effectiveness chips (null = neutral — no chip). */
export function effectivenessChipLabel(tier: ReturnType<typeof effectivenessTier>): string | null {
  if (tier === 'super') return 'Super';
  if (tier === 'resisted') return 'Resisted';
  if (tier === 'immune') return 'Immune';
  return null;
}

/** Full battle-log line (Pokémon-style) for colored exchange UI; null when neutral. */
export function effectivenessBattleLogPhrase(eff: number): string | null {
  const t = effectivenessTier(eff);
  if (t === 'super') return "It's super effective!";
  if (t === 'resisted') return "It's not very effective…";
  if (t === 'immune') return 'It had no effect.';
  return null;
}

/** Same flavor lines as the games, plus neutral so both sides always get a clear recap line. */
export function effectivenessBattleSummaryPhrase(eff: number): string {
  return effectivenessBattleLogPhrase(eff) ?? 'No type advantage.';
}
