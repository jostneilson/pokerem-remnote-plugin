import type { PokemonType } from './species';

/** 18x18 type effectiveness matrix. EFF_CHART[attacking][defending] = multiplier (0, 0.5, 1, 2). */
const EFF_CHART: Record<PokemonType, Record<PokemonType, number>> = {
  Normal:   { Normal: 1, Fighting: 1, Flying: 1, Poison: 1, Ground: 1, Rock: 0.5, Bug: 1, Ghost: 0, Fire: 1, Water: 1, Grass: 1, Electric: 1, Psychic: 1, Ice: 1, Dragon: 1, Steel: 0.5, Dark: 1, Fairy: 1 },
  Fighting: { Normal: 2, Fighting: 1, Flying: 0.5, Poison: 0.5, Ground: 1, Rock: 2, Bug: 0.5, Ghost: 0, Fire: 1, Water: 1, Grass: 1, Electric: 1, Psychic: 0.5, Ice: 2, Dragon: 1, Steel: 2, Dark: 2, Fairy: 0.5 },
  Flying:   { Normal: 1, Fighting: 2, Flying: 1, Poison: 1, Ground: 1, Rock: 0.5, Bug: 2, Ghost: 1, Fire: 1, Water: 1, Grass: 2, Electric: 0.5, Psychic: 1, Ice: 1, Dragon: 1, Steel: 0.5, Dark: 1, Fairy: 1 },
  Poison:   { Normal: 1, Fighting: 1, Flying: 1, Poison: 0.5, Ground: 0.5, Rock: 0.5, Bug: 1, Ghost: 0.5, Fire: 1, Water: 1, Grass: 2, Electric: 1, Psychic: 1, Ice: 1, Dragon: 1, Steel: 0, Dark: 1, Fairy: 2 },
  Ground:   { Normal: 1, Fighting: 1, Flying: 0, Poison: 2, Ground: 1, Rock: 2, Bug: 0.5, Ghost: 1, Fire: 2, Water: 1, Grass: 0.5, Electric: 2, Psychic: 1, Ice: 1, Dragon: 1, Steel: 2, Dark: 1, Fairy: 1 },
  Rock:     { Normal: 1, Fighting: 0.5, Flying: 2, Poison: 1, Ground: 0.5, Rock: 1, Bug: 2, Ghost: 1, Fire: 2, Water: 1, Grass: 1, Electric: 1, Psychic: 1, Ice: 2, Dragon: 1, Steel: 0.5, Dark: 1, Fairy: 1 },
  Bug:      { Normal: 1, Fighting: 0.5, Flying: 0.5, Poison: 0.5, Ground: 1, Rock: 1, Bug: 1, Ghost: 0.5, Fire: 0.5, Water: 1, Grass: 2, Electric: 1, Psychic: 2, Ice: 1, Dragon: 1, Steel: 0.5, Dark: 2, Fairy: 0.5 },
  Ghost:    { Normal: 0, Fighting: 1, Flying: 1, Poison: 1, Ground: 1, Rock: 1, Bug: 1, Ghost: 2, Fire: 1, Water: 1, Grass: 1, Electric: 1, Psychic: 2, Ice: 1, Dragon: 1, Steel: 1, Dark: 0.5, Fairy: 1 },
  Fire:     { Normal: 1, Fighting: 1, Flying: 1, Poison: 1, Ground: 1, Rock: 0.5, Bug: 2, Ghost: 1, Fire: 0.5, Water: 0.5, Grass: 2, Electric: 1, Psychic: 1, Ice: 2, Dragon: 0.5, Steel: 2, Dark: 1, Fairy: 1 },
  Water:    { Normal: 1, Fighting: 1, Flying: 1, Poison: 1, Ground: 2, Rock: 2, Bug: 1, Ghost: 1, Fire: 2, Water: 0.5, Grass: 0.5, Electric: 1, Psychic: 1, Ice: 1, Dragon: 0.5, Steel: 1, Dark: 1, Fairy: 1 },
  Grass:    { Normal: 1, Fighting: 1, Flying: 0.5, Poison: 0.5, Ground: 2, Rock: 2, Bug: 0.5, Ghost: 1, Fire: 0.5, Water: 2, Grass: 0.5, Electric: 1, Psychic: 1, Ice: 1, Dragon: 0.5, Steel: 0.5, Dark: 1, Fairy: 1 },
  Electric: { Normal: 1, Fighting: 1, Flying: 2, Poison: 1, Ground: 0, Rock: 1, Bug: 1, Ghost: 1, Fire: 1, Water: 2, Grass: 0.5, Electric: 0.5, Psychic: 1, Ice: 1, Dragon: 0.5, Steel: 1, Dark: 1, Fairy: 1 },
  Psychic:  { Normal: 1, Fighting: 2, Flying: 1, Poison: 2, Ground: 1, Rock: 1, Bug: 1, Ghost: 1, Fire: 1, Water: 1, Grass: 1, Electric: 1, Psychic: 0.5, Ice: 1, Dragon: 1, Steel: 0.5, Dark: 0, Fairy: 1 },
  Ice:      { Normal: 1, Fighting: 1, Flying: 2, Poison: 1, Ground: 2, Rock: 1, Bug: 1, Ghost: 1, Fire: 0.5, Water: 0.5, Grass: 2, Electric: 1, Psychic: 1, Ice: 0.5, Dragon: 2, Steel: 0.5, Dark: 1, Fairy: 1 },
  Dragon:   { Normal: 1, Fighting: 1, Flying: 1, Poison: 1, Ground: 1, Rock: 1, Bug: 1, Ghost: 1, Fire: 1, Water: 1, Grass: 1, Electric: 1, Psychic: 1, Ice: 1, Dragon: 2, Steel: 0.5, Dark: 1, Fairy: 0 },
  Dark:     { Normal: 1, Fighting: 0.5, Flying: 1, Poison: 1, Ground: 1, Rock: 1, Bug: 1, Ghost: 2, Fire: 1, Water: 1, Grass: 1, Electric: 1, Psychic: 2, Ice: 1, Dragon: 1, Steel: 0.5, Dark: 0.5, Fairy: 0.5 },
  Steel:    { Normal: 1, Fighting: 1, Flying: 1, Poison: 1, Ground: 1, Rock: 2, Bug: 1, Ghost: 1, Fire: 0.5, Water: 0.5, Grass: 1, Electric: 0.5, Psychic: 1, Ice: 2, Dragon: 1, Steel: 0.5, Dark: 1, Fairy: 2 },
  Fairy:    { Normal: 1, Fighting: 2, Flying: 1, Poison: 0.5, Ground: 1, Rock: 1, Bug: 1, Ghost: 1, Fire: 0.5, Water: 1, Grass: 1, Electric: 1, Psychic: 1, Ice: 1, Dragon: 2, Steel: 0.5, Dark: 2, Fairy: 1 },
};

const ALL_TYPES: PokemonType[] = [
  'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
];

export { ALL_TYPES };

/** Get combined effectiveness of an attacking type against one or more defending types. */
export function getEffectiveness(attackType: PokemonType, defenseTypes: PokemonType[]): number {
  const chart = EFF_CHART[attackType];
  if (!chart) return 1;
  let result = 1;
  for (const dt of defenseTypes) {
    result *= chart[dt] ?? 1;
  }
  return result;
}

/** Find all types that deal super-effective (2x+) damage against the given defending types. */
export function getWeaknesses(defenseTypes: PokemonType[]): PokemonType[] {
  return ALL_TYPES.filter((atk) => getEffectiveness(atk, defenseTypes) >= 2);
}

/** Find all types that the given defending types resist (0.5x or less, but not 0). */
export function getResistances(defenseTypes: PokemonType[]): PokemonType[] {
  return ALL_TYPES.filter((atk) => {
    const eff = getEffectiveness(atk, defenseTypes);
    return eff > 0 && eff < 1;
  });
}

/** Find all types that have no effect (0x) against the given defending types. */
export function getImmunities(defenseTypes: PokemonType[]): PokemonType[] {
  return ALL_TYPES.filter((atk) => getEffectiveness(atk, defenseTypes) === 0);
}
