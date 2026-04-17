import type { PokemonType } from './species';
import type { MoveData } from './moves';
import { MOVES } from './moves';

export interface LearnsetEntry {
  level: number;
  moveId: string;
}

/** Level-up moves may only be the species' own typings or Normal. */
export function allowedTypesForLearnset(speciesTypes: readonly PokemonType[]): Set<PokemonType> {
  return new Set<PokemonType>(['Normal', ...speciesTypes]);
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
  const allow = allowedTypesForLearnset(speciesTypes);
  for (const e of entries) {
    const m = MOVES[e.moveId];
    if (!m) throw new Error(`[learnset] dex ${dexNum}: unknown move id "${e.moveId}"`);
    if (!allow.has(m.type)) {
      throw new Error(
        `[learnset] dex ${dexNum}: illegal move "${e.moveId}" (${m.type}) for types [${speciesTypes.join(', ')}]`,
      );
    }
    if (e.level < 0 || e.level > 100) {
      throw new Error(`[learnset] dex ${dexNum}: level ${e.level} out of range for move "${e.moveId}"`);
    }
  }
}
