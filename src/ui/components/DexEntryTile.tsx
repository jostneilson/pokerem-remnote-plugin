import { frontSpriteUrl } from '../../game/sprites';
import { PokemonSprite } from './PokemonSprite';

export interface DexEntryTileSpecies {
  dexNum: number;
  name: string;
}

/**
 * Pokédex grid cell — caught vs uncaught silhouette treatment, battle-adjacent chrome.
 */
export function DexEntryTile({
  rootURL,
  species,
  owned,
  onSelect,
}: {
  rootURL: string | undefined;
  species: DexEntryTileSpecies;
  owned: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`pkr-dex-tile ${owned ? 'pkr-dex-tile--caught' : 'pkr-dex-tile--unknown'}`}
      aria-label={owned ? `${species.name}, number ${species.dexNum}` : `Unknown species, number ${species.dexNum}`}
    >
      <div className={`pkr-dex-tile__sprite ${owned ? '' : 'pkr-dex-tile__sprite--silhouette'}`}>
        <PokemonSprite
          src={frontSpriteUrl(rootURL, species.dexNum)}
          alt={owned ? species.name : 'Unknown'}
          size={56}
          style={{ imageRendering: 'pixelated' }}
          lazy
        />
        {!owned ? <span className="pkr-dex-tile__mystery" aria-hidden>?</span> : null}
      </div>
      <div className="pkr-dex-tile__dexno">#{species.dexNum}</div>
      <div className={`pkr-dex-tile__name ${owned ? '' : 'pkr-dex-tile__name--hidden'}`}>
        {owned ? species.name : '???'}
      </div>
    </button>
  );
}
