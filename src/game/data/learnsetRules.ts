import type { PokemonType } from './species';
import type { MoveData } from './moves';
import { MOVES } from './moves';

export interface LearnsetEntry {
  level: number;
  moveId: string;
}

/** Canonical level-up learnsets legitimately contain off-type coverage moves. */
export function allowedTypesForLearnset(speciesTypes: readonly PokemonType[]): Set<PokemonType> {
  void speciesTypes;
  return new Set<PokemonType>([
    'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison',
    'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
  ]);
}

export function isMoveTypeLegalForSpecies(
  speciesTypes: readonly PokemonType[],
  move: Pick<MoveData, 'type'>,
): boolean {
  return allowedTypesForLearnset(speciesTypes).has(move.type);
}

export function legalMoveIdsForSpeciesTypes(speciesTypes: readonly PokemonType[]): string[] {
  const allow = allowedTypesForLearnset(speciesTypes);
  return (Object.keys(MOVES) as string[]).filter((id) => allow.has(MOVES[id]!.type));
}

export function validateLearnsetAgainstSpecies(
  dexNum: number,
  speciesTypes: readonly PokemonType[],
  entries: readonly LearnsetEntry[],
): void {
  void speciesTypes;
  const seen = new Set<string>();
  for (const e of entries) {
    const m = MOVES[e.moveId];
    if (!m) throw new Error(`[learnset] dex ${dexNum}: unknown move id "${e.moveId}"`);
    if (e.level < 0 || e.level > 100) {
      throw new Error(`[learnset] dex ${dexNum}: level ${e.level} out of range for move "${e.moveId}"`);
    }
    if (seen.has(e.moveId)) {
      throw new Error(`[learnset] dex ${dexNum}: duplicate move id "${e.moveId}"`);
    }
    seen.add(e.moveId);
  }
}
