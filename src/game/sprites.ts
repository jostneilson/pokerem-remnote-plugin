const POKEAPI_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

function base(rootURL: string | undefined): string {
  return (rootURL ?? '').replace(/\/?$/, '/');
}

export function frontSpriteUrl(_rootURL: string | undefined, dexNum: number): string {
  return `${POKEAPI_SPRITE_BASE}/${dexNum}.png`;
}

export function backSpriteUrl(_rootURL: string | undefined, dexNum: number): string {
  return `${POKEAPI_SPRITE_BASE}/back/${dexNum}.png`;
}

export function itemIconUrl(rootURL: string | undefined, file: string): string {
  return `${base(rootURL)}assets/items/${file}`;
}

export function badgeIconUrl(rootURL: string | undefined, n: number): string {
  return `${base(rootURL)}assets/progress/badge-${n}.png`;
}

import type { PokemonType } from './data/species';

const TYPE_TO_SCENE: Partial<Record<PokemonType, string>> = {
  Water: 'beach_pkmnbattlescene.png',
  Fire: 'desert_pkmnbattlescene.png',
  Ice: 'ice_pkmnbattlescene.png',
  Rock: 'rock_pkmnbattlescene.png',
  Ground: 'rock_pkmnbattlescene.png',
};

const DEFAULT_SCENE = 'grass_pkmnbattlescene.png';

export function battleSceneUrl(rootURL: string | undefined, primaryType?: PokemonType): string {
  const scene = (primaryType && TYPE_TO_SCENE[primaryType]) || DEFAULT_SCENE;
  return `${base(rootURL)}assets/battle_scenes/${scene}`;
}

export function typeIconUrl(rootURL: string | undefined, type: string): string {
  return `${base(rootURL)}assets/types/${type.toLowerCase()}.png`;
}
