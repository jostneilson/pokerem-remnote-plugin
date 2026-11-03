/**
 * How wild and trainer Pokémon choose a move: score each damaging move by the damage it would
 * really do (stats, STAB, type matchup), pick the best most of the time, and now and then use a
 * status move. Smarter foes (elite trainers) pick the best move more reliably.
 */
import { MOVES } from '../data/moves';
import { damageCeiling, isMoveSupported, type Fighter } from './moveMechanics';

export type FoeSkill = 'wild' | 'trainer' | 'elite';

/** Chance of picking the top-scoring move; otherwise a weighted pick among the rest. */
const BEST_MOVE_CHANCE: Record<FoeSkill, number> = { wild: 0.6, trainer: 0.8, elite: 0.95 };
/** Chance of opening with a status move when one is available and the target is unaffected. */
const STATUS_MOVE_CHANCE: Record<FoeSkill, number> = { wild: 0.12, trainer: 0.15, elite: 0.2 };

export function chooseFoeMove(
  foe: Fighter,
  target: Fighter,
  moves: string[],
  rng: () => number,
  skill: FoeSkill,
): string {
  const usable = moves.filter((id) => isMoveSupported(MOVES[id]));
  const scored = usable
    .map((id) => ({ id, score: damageCeiling(foe, target, id, false) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  const status = usable.filter((id) => (MOVES[id]?.power ?? 0) <= 0);
  const ailment = target.condition?.ailment;
  const targetAffected = !!ailment && ailment !== 'none';
  if (status.length > 0 && !targetAffected && rng() < STATUS_MOVE_CHANCE[skill]) {
    return status[Math.floor(rng() * status.length)]!;
  }
  if (scored.length === 0) return status[0] ?? 'tackle';
  if (scored.length === 1 || rng() < BEST_MOVE_CHANCE[skill]) return scored[0]!.id;

  const rest = scored.slice(1);
  const total = rest.reduce((a, m) => a + m.score, 0);
  let roll = rng() * total;
  for (const m of rest) {
    roll -= m.score;
    if (roll <= 0) return m.id;
  }
  return rest[rest.length - 1]!.id;
}
