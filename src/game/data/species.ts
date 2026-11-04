export type PokemonType =
  | 'Normal' | 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Ice'
  | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug'
  | 'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel' | 'Fairy';

export interface SpeciesData {
  dexNum: number;
  name: string;
  types: PokemonType[];
  baseHp: number;
  baseAttack?: number;
  baseDefense?: number;
  baseSpecialAttack?: number;
  baseSpecialDefense?: number;
  baseSpeed?: number;
  baseCatchRate: number;
  tier: 'Common' | 'Baby' | 'Ultra' | 'Legendary' | 'Mythical';
  classification: 'ordinary' | 'legendary' | 'mythical' | 'ultra-beast';
  generation: number;
}

import { FULL_POKEDEX, STARTER_DEX_ALL, type FullSpeciesData } from './pokedex';
import { REGIONAL_FORMS } from './regionalForms';

export { STARTER_DEX_ALL };

const CLASS_TIER: Partial<Record<FullSpeciesData['classification'], FullSpeciesData['tier']>> = {
  legendary: 'Legendary',
  mythical: 'Mythical',
  'ultra-beast': 'Ultra'
};

/**
 * The generated Pokédex keeps legacy tiers, and 27 headline legendaries (Mewtwo, Lugia, Rayquaza…) came through
 * as "Common". Their PokéAPI classification is right, so it sets the tier for every non-ordinary species.
 */
function withClassTier(s: FullSpeciesData): FullSpeciesData {
  const tier = CLASS_TIER[s.classification];
  return tier && tier !== s.tier ? { ...s, tier } : s;
}

/** Every species PokéRem knows: the National Dex roster plus regional forms (Galarian birds). */
export const SPECIES_LIST: FullSpeciesData[] = [...FULL_POKEDEX, ...REGIONAL_FORMS].map(withClassTier);
export const SPECIES_BY_DEX = new Map(SPECIES_LIST.map((s) => [s.dexNum, s]));

const NATIONAL_DEX = new Map(REGIONAL_FORMS.map((f) => [f.dexNum, f.nationalDex]));
/** Dex number to show players: a regional form shows its base species' National Dex number. */
export function displayDexNumber(dexNum: number): number {
  return NATIONAL_DEX.get(dexNum) ?? dexNum;
}
export function isRegionalForm(dexNum: number): boolean {
  return NATIONAL_DEX.has(dexNum);
}

export const STARTER_DEX = [1, 4, 7] as const;

export const WILD_POOL_DEX = FULL_POKEDEX
  .filter((s) => !(STARTER_DEX_ALL as readonly number[]).includes(s.dexNum))
  .map((s) => s.dexNum);
