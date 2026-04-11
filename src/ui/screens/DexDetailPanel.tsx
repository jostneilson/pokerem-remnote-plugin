import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SPECIES_BY_DEX } from '../../game/data/species';
import { frontSpriteUrl } from '../../game/sprites';
import { typePillStyle } from '../battle/battleTheme';
import { TypeSymbolImage } from '../battle/TypeBattleIcon';
import { PokemonSprite } from '../components/PokemonSprite';
import { GameIcon } from '../components/GameIcon';

export function DexDetailPanel({
  dexNum,
  rootURL,
  caughtCount,
  onClose,
}: {
  dexNum: number;
  rootURL: string | undefined;
  caughtCount: number;
  onClose: () => void;
}) {
  const species = SPECIES_BY_DEX.get(dexNum);
  if (!species) return null;

  const owned = caughtCount > 0;
  const displayName = owned ? species.name : '???';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Portaled to `document.body` so `position: fixed` uses the real viewport; `.pokerem-sidebar` applies `filter`, which would otherwise make fixed descendants anchor to the full scroll height of the tab. */
  const overlay = (
    <div
      className="pkr-dex-detail-overlay fixed inset-0 z-50 flex flex-col justify-end p-0 sm:p-2"
      style={{ background: 'linear-gradient(180deg, rgba(5,18,12,0.72) 0%, rgba(2,8,6,0.88) 100%)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pkr-dex-detail-title"
    >
      <button type="button" className="absolute inset-0 cursor-default border-0 bg-transparent" aria-label="Close Pokédex entry" onClick={onClose} />
      <div
        className="pkr-dex-detail-sheet pkr-dex-detail-surface relative z-10 sm:mx-auto sm:mb-2 sm:max-w-md"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="pkr-dex-detail-header">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="pkr-dex-detail-no pkr-pixel-title shrink-0 tabular-nums">#{String(species.dexNum).padStart(3, '0')}</span>
                <h2 id="pkr-dex-detail-title" className="pkr-pixel-title pkr-dex-detail-name min-w-0 truncate">
                  {displayName}
                </h2>
              </div>
              <div className="pkr-dex-detail-type-row mt-2 flex flex-wrap items-center gap-1.5">
                {owned ? (
                  species.types.map((t) => (
                    <span
                      key={t}
                      className="pkr-battle-type inline-flex items-center gap-1 rounded-md border-2 pkr-pixel-title font-black uppercase"
                      style={typePillStyle(t)}
                    >
                      <TypeSymbolImage rootURL={rootURL} type={t} size={16} variant="resist" />
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="pkr-dex-detail-unregistered pkr-pixel-title inline-flex items-center gap-1 rounded-md border-2 border-dashed px-2 py-1 font-black uppercase">
                    <GameIcon name="dot" size={11} style={{ color: '#64748b' }} />
                    Unregistered
                  </span>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} className="pkr-dex-detail-close pkr-btn-secondary pkr-game-btn pkr-pixel-title shrink-0 font-black uppercase tracking-wide">
              Close
            </button>
          </div>
        </header>

        <div className="pkr-dex-detail-hero mt-3">
          <div className={`pkr-dex-detail-sprite ${owned ? '' : 'pkr-dex-detail-sprite--unknown'}`}>
            <PokemonSprite
              src={frontSpriteUrl(rootURL, species.dexNum)}
              alt={displayName}
              size={128}
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`pkr-dex-detail-registry ${owned ? 'pkr-dex-detail-registry--owned' : 'pkr-dex-detail-registry--unknown'}`}>
              <div className="pkr-dex-detail-registry__line flex items-center gap-1.5 font-black">
                <GameIcon name="book" size={12} style={{ color: 'var(--pkr-accent, #fbbf24)' }} />
                {owned ? (
                  <>
                    Registered — caught <span className="tabular-nums text-amber-200">{caughtCount}</span>×
                  </>
                ) : (
                  <span className="pkr-dex-detail-registry__muted">Not registered — silhouette only</span>
                )}
              </div>
            </div>

            {owned ? (
              <>
                <div className="pkr-dex-stat-grid">
                  <div className="pkr-dex-stat-grid__title">Base data</div>
                  <div className="pkr-dex-stat-grid__rows">
                    <StatRow label="HP" value={species.baseHp} />
                    <StatRow label="Catch" value={species.baseCatchRate} />
                    <StatRow label="Tier" value={species.tier} />
                    <StatRow label="Gen" value={species.generation} />
                  </div>
                </div>
                <p className="pkr-dex-detail-footnote">
                  Base HP feeds into max HP at each level. Higher catch rates are easier to land in the wild.
                </p>
              </>
            ) : (
              <p className="pkr-dex-detail-footnote pkr-dex-detail-footnote--hint">Catch this species in battle to unlock its name, types, and full Pokédex data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(overlay, document.body);
  }
  return overlay;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="pkr-dex-stat-row">
      <span className="pkr-dex-stat-row__label">{label}</span>
      <span className="pkr-dex-stat-row__value tabular-nums">{value}</span>
    </div>
  );
}
