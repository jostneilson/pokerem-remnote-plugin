import type { FullSpeciesData } from './pokedex';
import { FULL_POKEDEX } from './pokedex';
import { LEARNSETS } from './learnsets';
import type { LearnsetEntry } from './learnsetRules';
import { validateLearnsetAgainstSpecies } from './learnsetRules';

/** Return an isolated copy of the pinned canonical learnset for a species. */
export function buildLearnsetForSpecies(species: FullSpeciesData): LearnsetEntry[] {
  const entries = LEARNSETS[species.dexNum];
  if (!entries?.length) {
    throw new Error(`[learnset] missing canonical learnset for dex ${species.dexNum} (${species.name})`);
  }
  validateLearnsetAgainstSpecies(species.dexNum, species.types, entries);
  return entries.map((entry) => ({ ...entry }));
}

/** Compatibility API: canonical data is generated offline, never synthesized at runtime. */
export function buildAllLearnsets(): Record<number, LearnsetEntry[]> {
  const out: Record<number, LearnsetEntry[]> = {};
  for (const species of FULL_POKEDEX) out[species.dexNum] = buildLearnsetForSpecies(species);
  return out;
}

export function validateEveryLearnset(
  learnsets: Record<number, LearnsetEntry[]>,
  pokedex: readonly FullSpeciesData[],
): void {
  for (const species of pokedex) {
    const entries = learnsets[species.dexNum];
    if (!entries?.length) {
      throw new Error(`[learnset] missing learnset for dex ${species.dexNum} (${species.name})`);
    }
    validateLearnsetAgainstSpecies(species.dexNum, species.types, entries);
  }
}

export function getBuiltLearnsets(): Record<number, LearnsetEntry[]> {
  return buildAllLearnsets();
}
