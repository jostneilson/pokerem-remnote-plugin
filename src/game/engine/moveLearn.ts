import type { OwnedPokemon } from '../state/model';
import { LEARNSETS } from '../data/learnsets';
import { MOVES } from '../data/moves';

const MAX_MOVES = 4;

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

  const moves = [...(mon.moves ?? [])];
  const learnedNames: string[] = [];

  for (const entry of learnset) {
    if (entry.level > previousLevel && entry.level <= mon.level) {
      if (moves.includes(entry.moveId)) continue;
      const moveData = MOVES[entry.moveId];
      if (!moveData) continue;

      if (moves.length < MAX_MOVES) {
        moves.push(entry.moveId);
      } else {
        moves.shift();
        moves.push(entry.moveId);
      }
      learnedNames.push(moveData.name);
    }
  }

  if (learnedNames.length === 0) return { updated: mon, learnedNames: [] };
  return { updated: { ...mon, moves }, learnedNames };
}

/**
 * Dedupe move ids in order (learnsets in data may repeat the same move many times).
 */
export function dedupeMoveIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || !MOVES[id] || seen.has(id)) continue;
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
    if (!MOVES[entry.moveId]) continue;
    if (seen.has(entry.moveId)) continue;
    seen.add(entry.moveId);
    out.push({ level: entry.level, moveId: entry.moveId });
  }
  return out;
}

export function getInitialMoves(dexNum: number, level: number): string[] {
  const unlocked = getUnlockedLearnsetMoveIds(dexNum, level);
  return unlocked.slice(-MAX_MOVES);
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
    if (entry.level > level || !MOVES[entry.moveId]) continue;
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
  if (deduped.length > 0) return deduped.slice(0, MAX_MOVES);
  return getInitialMoves(mon.dexNum, mon.level);
}

/** Prefer a damaging move for “fight first” (palette / queue menu); fall back to first slot if none. */
export function pickDefaultBattleMove(legalMoves: string[]): string | undefined {
  if (legalMoves.length === 0) return undefined;
  const damaging = legalMoves.find((id) => (MOVES[id]?.power ?? 0) > 0);
  return damaging ?? legalMoves[0];
}

/** One-line summary for Party move lists and the teachable-move browser. */
export function moveUiDescription(moveId: string): string {
  const m = MOVES[moveId];
  if (!m) return 'Unknown move.';
  if (m.power <= 0 || m.category === 'status') {
    return `${m.type} status — no direct damage; weakens, protects, or sets up in battle.`;
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
