/**
 * Picks a Pokémon's best four moves from everything it has unlocked, the way a competitive player
 * would: hard-hitting, accurate, same-type (STAB) attacks that suit its stronger attacking stat,
 * spread across types for super-effective coverage, plus at most one status move when it earns the
 * slot (sleep and paralysis also make catching easier).
 */
import { MOVES, type MoveData } from '../data/moves';
import { ALL_TYPES, getEffectiveness } from '../data/typeChart';
import { SPECIES_BY_DEX, type PokemonType } from '../data/species';
import { battleStats } from './pokemonStats';
import { dedupeMoveIds, getInitialMoves, getUnlockedLearnsetMoveIds } from './moveLearn';
import { isMoveSupported } from './moveMechanics';
import type { PokemonIVs } from '../state/model';

const MAX_MOVES = 4;
/** A second move of a type already in the set is worth this much (it adds no coverage). */
const SAME_TYPE_FACTOR = 0.55;
/** Bonus per opposing type a move newly hits super-effectively. */
const COVERAGE_BONUS = 0.04;
/** Status move worth, as a share of the best attack's value. */
const STATUS_WORTH: Record<string, number> = { sleep: 0.75, paralysis: 0.6, burn: 0.45, poison: 0.4, confusion: 0.35 };
const BOOST_WORTH = 0.5;
const HEAL_WORTH = 0.4;

type Mon = { dexNum: number; level: number; types?: PokemonType[]; ivs?: PokemonIVs; moves?: string[]; tutorMoves?: string[] };

function monTypes(mon: Mon): PokemonType[] {
  return mon.types?.length ? mon.types : SPECIES_BY_DEX.get(mon.dexNum)?.types ?? ['Normal'];
}

/** Expected damage weight of one use: power × hits × accuracy × STAB × the matching attack stat, nudged by side effects. */
export function attackValue(mon: Mon, moveId: string): number {
  const m = MOVES[moveId];
  if (!m || m.power <= 0 || !isMoveSupported(m)) return 0;
  const stats = battleStats(mon);
  const offense = m.category === 'special' ? stats.specialAttack : stats.attack;
  const hits = m.maxHits ? ((m.minHits ?? m.maxHits) + m.maxHits) / 2 : 1;
  const accuracy = (m.accuracy ?? 100) / 100;
  const stab = monTypes(mon).includes(m.type) ? 1.5 : 1;
  const extras =
    (1 + m.drain / 400) * // drain helps, recoil (negative drain) hurts
    (1 + 0.1 * (m.critRate ?? 0)) *
    (1 + (m.flinchChance + (m.ailment !== 'none' ? m.ailmentChance : 0)) / 500) *
    (m.priority > 0 ? 1.05 : 1);
  return m.power * hits * accuracy * stab * offense * extras;
}

function statusWorth(mon: Mon, m: MoveData): number {
  if (!isMoveSupported(m) || m.category !== 'status') return 0;
  const accuracy = (m.accuracy ?? 100) / 100;
  if (m.ailment && m.ailment !== 'none') return (STATUS_WORTH[m.ailment] ?? 0.2) * accuracy;
  if (m.healing > 0) return HEAL_WORTH;
  const stats = battleStats(mon);
  const main = stats.specialAttack > stats.attack ? 'special-attack' : 'attack';
  const self = m.target === 'user' || m.target === 'users-field';
  const boost = m.statChanges.reduce((sum, c) => sum + (c.stat === main ? c.change : c.stat === 'speed' ? c.change / 2 : 0), 0);
  if (self && boost >= 2) return BOOST_WORTH;
  return 0.15 * accuracy;
}

const superEffectiveAgainst = (type: PokemonType) => new Set(ALL_TYPES.filter((t) => getEffectiveness(type, [t]) > 1));

/** Every move this Pokémon can use: its unlocked level-up moves, tutored moves and anything it already knows. */
export function knownMovePool(mon: Mon): string[] {
  return dedupeMoveIds([...getUnlockedLearnsetMoveIds(mon.dexNum, mon.level), ...(mon.tutorMoves ?? []), ...(mon.moves ?? [])]).filter((id) => id !== 'struggle');
}

export function optimalMoveset(mon: Mon): string[] {
  const pool = knownMovePool(mon);
  const attacks = pool.filter((id) => attackValue(mon, id) > 0);
  if (attacks.length === 0) return getInitialMoves(mon.dexNum, mon.level);
  const best = Math.max(...attacks.map((id) => attackValue(mon, id)));

  const chosen: string[] = [];
  const types = new Set<PokemonType>();
  const covered = new Set<PokemonType>();
  let statusPicked = false;
  const score = (id: string): number => {
    const m = MOVES[id]!;
    if (m.power <= 0) {
      // A status move only competes once two attacks are in, and only one ever makes the set.
      if (statusPicked || chosen.length < 2) return 0;
      return statusWorth(mon, m) * best;
    }
    let s = attackValue(mon, id);
    if (types.has(m.type)) s *= SAME_TYPE_FACTOR;
    const fresh = [...superEffectiveAgainst(m.type)].filter((t) => !covered.has(t)).length;
    return s * (1 + COVERAGE_BONUS * fresh);
  };

  while (chosen.length < MAX_MOVES) {
    let pick: string | undefined;
    let pickScore = 0;
    for (const id of pool) {
      if (chosen.includes(id)) continue;
      const s = score(id);
      if (s > pickScore) {
        pick = id;
        pickScore = s;
      }
    }
    if (!pick) break;
    chosen.push(pick);
    const m = MOVES[pick]!;
    if (m.power > 0) {
      types.add(m.type);
      for (const t of superEffectiveAgainst(m.type)) covered.add(t);
    } else statusPicked = true;
  }
  // Strongest attack first, so "Fight" and the first move slot hit hardest.
  return chosen.sort((a, b) => attackValue(mon, b) - attackValue(mon, a));
}

/** Re-pick moves unless the player has taken manual control of this Pokémon's moveset. */
export function withOptimalMoves<T extends Mon & { autoMoves?: boolean }>(mon: T): T {
  if (mon.autoMoves === false) return mon;
  const moves = optimalMoveset(mon);
  const same = moves.length === (mon.moves?.length ?? 0) && moves.every((m, i) => mon.moves?.[i] === m);
  return same ? mon : { ...mon, moves };
}
