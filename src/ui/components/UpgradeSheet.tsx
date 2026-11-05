import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ITEMS } from '../../game/data/items';
import { checkItemEvolution } from '../../game/engine/evolution';
import { powerUpPreview } from '../../game/engine/pokemonStats';
import { tutorOptions } from '../../game/engine/sinks';
import { frontSpriteUrl } from '../../game/sprites';
import type { OwnedPokemon } from '../../game/state/model';
import { coinsSpoken, formatCoins } from '../format/coins';
import { PokemonSprite } from './PokemonSprite';

/**
 * Upgrade sheet (SPEC U2): Power Up, stone Evolve when ready, Bottle Cap and Move Tutor in one place.
 * Bottle Cap and Tutor open the Pokémon's card detail, where their controls live.
 */
export function UpgradeSheet({
  rootURL,
  pokemon: p,
  bag,
  currency,
  blocked,
  evolutionBlocked,
  onPowerUp,
  onEvolve,
  onOpenDetail,
  onClose
}: {
  rootURL: string | undefined;
  pokemon: OwnedPokemon;
  bag: Record<string, number>;
  currency: number;
  /** An encounter or battle is on: upgrades wait. */
  blocked: boolean;
  evolutionBlocked: boolean;
  onPowerUp?: (id: string, expectedLevel: number) => void;
  onEvolve?: (id: string, itemId: string) => void;
  onOpenDetail: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const name = p.nickname || p.name;
  const preview = p.level < 100 ? powerUpPreview(p) : null;
  const stones = ITEMS.filter((item) => item.kind === 'evolution' && checkItemEvolution(p, item.id) && (bag[item.id] ?? 0) > 0);
  const caps = (bag['bottle-cap'] ?? 0) + (bag['gold-bottle-cap'] ?? 0);
  const tutors = tutorOptions(p).length;

  return createPortal(
    <div className="pkr-pixel-surface pkr-retro-chrome">
      <div className="pkr-sheet-backdrop" role="presentation" onClick={onClose}>
        <section className="pkr-sheet" role="dialog" aria-modal="true" aria-label={`Upgrade ${name}`} onClick={(e) => e.stopPropagation()}>
          <div className="pkr-sheet__head">
            <PokemonSprite src={frontSpriteUrl(rootURL, p.dexNum, p.shiny === true)} alt={name} size={40} />
            <strong>
              {name} Lv{p.level}
            </strong>
            <button type="button" className="pkr-sheet__close" aria-label="Close" onClick={onClose}>
              ✕
            </button>
          </div>
          {blocked ? <p className="pkr-sheet__note">Finish the encounter first.</p> : null}
          {onPowerUp ? (
            <button
              type="button"
              className="pkr-sheet__row"
              disabled={blocked || !preview || currency < preview.cost}
              aria-label={preview ? `Power Up to level ${preview.level} for ${coinsSpoken(preview.cost)}` : 'Maximum level'}
              onClick={() => onPowerUp(p.id, p.level)}
            >
              <span>{preview ? `Power Up → Lv${preview.level}` : 'Maximum level'}</span>
              <span>{preview ? (currency < preview.cost ? `Need ${formatCoins(preview.cost)}` : formatCoins(preview.cost)) : ''}</span>
            </button>
          ) : null}
          {onEvolve
            ? stones.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="pkr-sheet__row"
                  disabled={evolutionBlocked || p.currentHp <= 0}
                  onClick={() => {
                    onEvolve(p.id, item.id);
                    onClose();
                  }}
                >
                  <span>Evolve → {checkItemEvolution(p, item.id)!.intoName}</span>
                  <span>{item.name} ×{bag[item.id] ?? 0}</span>
                </button>
              ))
            : null}
          {caps > 0 ? (
            <button type="button" className="pkr-sheet__row" onClick={onOpenDetail}>
              <span>Bottle Cap</span>
              <span>×{caps}</span>
            </button>
          ) : null}
          {tutors > 0 ? (
            <button type="button" className="pkr-sheet__row" onClick={onOpenDetail}>
              <span>Move Tutor</span>
              <span>
                {tutors} move{tutors === 1 ? '' : 's'}
              </span>
            </button>
          ) : null}
        </section>
      </div>
    </div>,
    document.body
  );
}
