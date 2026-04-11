import type { PokemonType } from '../../game/data/species';
import { typePillStyle } from '../battle/battleTheme';
import { typeSymbolUrl } from '../battle/typeSymbolUrl';

export function TypeBadge({ rootURL, type }: { rootURL: string | undefined; type: PokemonType }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded border px-1 py-px text-[8px] font-bold uppercase leading-tight"
      style={typePillStyle(type)}
    >
      <img
        src={typeSymbolUrl(rootURL, type)}
        alt=""
        width={14}
        height={14}
        className="pkr-type-orb shrink-0"
        style={{ imageRendering: 'auto' }}
      />
      {type}
    </span>
  );
}
