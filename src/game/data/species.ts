export type PokemonType =
  | 'Normal' | 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Ice'
  | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug'
  | 'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel' | 'Fairy';

export interface SpeciesData {
  dexNum: number;
  name: string;
  types: PokemonType[];
  baseHp: number;
  baseCatchRate: number;
  tier: 'Common' | 'Baby' | 'Ultra' | 'Legendary' | 'Mythical';
  generation: number;
}

export { FULL_POKEDEX as SPECIES_LIST, POKEDEX_BY_DEX as SPECIES_BY_DEX, STARTER_DEX_ALL } from './pokedex';

import { FULL_POKEDEX, STARTER_DEX_ALL } from './pokedex';

export const STARTER_DEX = [1, 4, 7] as const;

export const WILD_POOL_DEX = FULL_POKEDEX
  .filter((s) => !(STARTER_DEX_ALL as readonly number[]).includes(s.dexNum))
  .map((s) => s.dexNum);
