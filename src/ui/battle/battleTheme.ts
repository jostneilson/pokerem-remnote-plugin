import type { CSSProperties } from 'react';
import type { PokemonType } from '../../game/data/species';

/** Canonical Pokémon type colors (PokéRem type palette). */
export const TYPE_COLORS: Record<PokemonType, { bg: string; border: string }> = {
  Normal:   { bg: '#A8A878', border: '#705848' },
  Fire:     { bg: '#F08030', border: '#C03028' },
  Water:    { bg: '#6890F0', border: '#807870' },
  Electric: { bg: '#F8D030', border: '#B8A038' },
  Grass:    { bg: '#78C850', border: '#588040' },
  Ice:      { bg: '#98D8D8', border: '#9090A0' },
  Fighting: { bg: '#C03028', border: '#484038' },
  Poison:   { bg: '#A040A0', border: '#483850' },
  Ground:   { bg: '#E0C068', border: '#886830' },
  Flying:   { bg: '#A890F0', border: '#705898' },
  Psychic:  { bg: '#F85888', border: '#789010' },
  Bug:      { bg: '#A8B820', border: '#A8B820' },
  Rock:     { bg: '#B8A038', border: '#886830' },
  Ghost:    { bg: '#705898', border: '#483850' },
  Dragon:   { bg: '#7038F8', border: '#483890' },
  Dark:     { bg: '#705848', border: '#484038' },
  Steel:    { bg: '#B8B8D0', border: '#807870' },
  Fairy:    { bg: '#F0B6BC', border: '#905F63' },
};

export function typePillStyle(t: PokemonType | undefined): CSSProperties {
  const c = t ? TYPE_COLORS[t] : undefined;
  return {
    backgroundColor: c?.bg ?? '#718096',
    borderColor: c?.border ?? '#4A5568',
    color: (t === 'Electric' || t === 'Ice' || t === 'Ground' || t === 'Steel' || t === 'Fairy' || t === 'Normal') ? '#1a1a1a' : '#fff',
  };
}

export function typePillClass(_t: PokemonType | undefined): string {
  return 'border';
}
