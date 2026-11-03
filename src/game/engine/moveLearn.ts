import { isMoveSupported } from './moveMechanics';
import type { OwnedPokemon } from '../state/model';
import { LEARNSETS as NATIONAL_LEARNSETS } from '../data/learnsets';
import { REGIONAL_FORM_LEARNSETS } from '../data/regionalForms';

export const LEARNSETS: Record<number, (typeof NATIONAL_LEARNSETS)[number]> = { ...NATIONAL_LEARNSETS, ...REGIONAL_FORM_LEARNSETS };
import { MOVES } from '../data/moves';

const MAX_MOVES = 4;
const STRUGGLE_MOVE = 'struggle';

/**
 * Check if a Pokemon should learn new moves at its current level.
 * Returns the updated Pokemon with new moves and the names of learned moves.
 */
export function checkLearnMoves(
  mon: OwnedPokemon,
  previousLevel: number,
): { updated: OwnedPokemon; learnedNames: string[] } {
  const learnset = LEARNSETS[mon.dexNum];
  if (!learnset) return { updated: mon, learnedNames: [] };

  const learnedNames = learnset.filter(e => e.level > previousLevel && e.level <= mon.level).map(e => MOVES[e.moveId]?.name).filter((v):v is string => !!v);
  return { updated: mon, learnedNames: [...new Set(learnedNames)] };
}

/**
 * Dedupe move ids in order (learnsets in data may repeat the same move many times).
 */
export function dedupeMoveIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || !MOVES[id] || !isMoveSupported(MOVES[id]) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Get initial moves for a Pokemon at a given level (for starters and wild spawns).
 * Walks the learnset in order and keeps each move once — last MAX_MOVES unique moves by progression.
 */
/** First occurrence level per move (level > 0), in learnset order — for Growth / Dex UI. */
export function learnsetMilestonesOrdered(dexNum: number): { level: number; moveId: string }[] {
  const learnset = LEARNSETS[dexNum];
  if (!learnset) return [];
  const seen = new Set<string>();
  const out: { level: number; moveId: string }[] = [];
  for (const entry of learnset) {
    if (entry.level <= 0) continue;
    if (!MOVES[entry.moveId] || !isMoveSupported(MOVES[entry.moveId])) continue;
    if (seen.has(entry.moveId)) continue;
    seen.add(entry.moveId);
    out.push({ level: entry.level, moveId: entry.moveId });
  }
  return out;
}

export function getInitialMoves(dexNum: number, level: number): string[] {
  let unlocked = getUnlockedLearnsetMoveIds(dexNum, level);
  // Some species learn nothing until past Lv1 (Crabrawler); start them on their first move.
  if (unlocked.length === 0) unlocked = learnsetMilestonesOrdered(dexNum).slice(0, 1).map((e) => e.moveId);
  const attacks=unlocked.filter(id=>(MOVES[id]?.power??0)>0).slice(-2);
  return [...new Set([...attacks,...unlocked.slice().reverse()])].slice(0,MAX_MOVES);
}

/**
 * Unique moves this species has unlocked on its level-up table by `level` (learnset order;
 * same rules as {@link getInitialMoves} before the final four-slot trim). Manual teaching
 * from Party only allows moves in this set.
 */
export function getUnlockedLearnsetMoveIds(dexNum: number, level: number): string[] {
  const learnset = LEARNSETS[dexNum];
  if (!learnset) return [];

  const seen = new Set<string>();
  const order: string[] = [];
  for (const entry of learnset) {
    if (entry.level > level || !isMoveSupported(MOVES[entry.moveId])) continue;
    if (seen.has(entry.moveId)) continue;
    seen.add(entry.moveId);
    order.push(entry.moveId);
  }
  return order;
}

/** Party moves if set (deduped), otherwise learnset-derived moves for battle UI and combat. */
export function movesetForBattle(mon: { dexNum: number; level: number; moves?: string[] }): string[] {
  const raw = mon.moves?.filter(Boolean) ?? [];
  const deduped = dedupeMoveIds(raw);
  const moves = deduped.length > 0 ? deduped.slice(0, MAX_MOVES) : getInitialMoves(mon.dexNum, mon.level);
  // Species like Magikarp and Metapod can have no attack at all. As in the main games, they
  // Struggle instead of being unable to finish a fight.
  if (moves.some((id) => (MOVES[id]?.power ?? 0) > 0)) return moves;
  return [...moves.slice(0, MAX_MOVES - 1), STRUGGLE_MOVE];
}

/** Strongest damaging move for “fight first” (palette / queue menu); fall back to first slot if none. */
export function pickDefaultBattleMove(legalMoves: string[]): string | undefined {
  if (legalMoves.length === 0) return undefined;
  let best: string | undefined;
  for (const id of legalMoves) {
    if ((MOVES[id]?.power ?? 0) > (best ? MOVES[best]!.power : 0)) best = id;
  }
  return best ?? legalMoves[0];
}

/** One-line summary for Party move lists and the teachable-move browser. */
export function moveUiDescription(moveId: string): string {
  const m = MOVES[moveId];
  if (!m) return 'Unknown move.';
  if (moveId === 'splash') return 'Does nothing at all, exactly as in the main games.';
  if (moveId === STRUGGLE_MOVE) return 'Used when a Pokémon has no attacks. Hurts the user by a quarter of its max HP.';
  if (m.power <= 0 || m.category === 'status') {
    return (m as any).description || `${m.type} status move.`;
  }
  const kind = m.category === 'physical' ? 'Physical' : 'Special';
  return `${kind} ${m.type} attack — power ${m.power}.`;
}

/**
 * Remove a move from a Pokemon's moveset.
 */
export function forgetMove(mon: OwnedPokemon, moveId: string): OwnedPokemon {
  const moves = (mon.moves ?? []).filter((m) => m !== moveId);
  return { ...mon, moves };
}
