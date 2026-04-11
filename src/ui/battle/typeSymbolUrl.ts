import type { PokemonType } from '../../game/data/species';

/** Bundled TCG-style type orb under `public/assets/types/<lowercase>.png`. */
export function typeSymbolUrl(rootURL: string | undefined, type: PokemonType): string {
  return `${(rootURL ?? '').replace(/\/?$/, '/') }assets/types/${type.toLowerCase()}.png`;
}
