import type { ReactNode } from 'react';
import type { OwnedPokemon } from '../../game/state/model';
import { frontSpriteUrl } from '../../game/sprites';
import { xpProgressPercent } from '../../game/state/store';
import { typePillStyle } from '../battle/battleTheme';
import { PokemonSprite } from './PokemonSprite';
import { GameIcon } from './GameIcon';
import { checkLevelEvolution } from '../../game/engine/evolution';
import { PartyHpMeter, PartyXpMeter } from './Bars';
import { PokemonAppraisal } from './PokemonAppraisal';
import { SPECIES_BY_DEX } from '../../game/data/species';

export function PartyPokemonCard({
  rootURL,
  pokemon: p,
  variant,
  isActive,
  isExpanded,
  onToggle,
  detail,
  onToggleFavorite,
}: {
  rootURL: string | undefined;
  pokemon: OwnedPokemon;
  variant: 'party' | 'storage';
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  detail?: ReactNode;
  onToggleFavorite?: () => void;
}) {
  const displayName = p.nickname || p.name;
  const isParty = variant === 'party';
  const classification = SPECIES_BY_DEX.get(p.dexNum)?.classification ?? 'ordinary';

  return (
    <div
      className={`pkr-party-card pkr-party-card--${classification} ${p.shiny ? 'pkr-party-card--shiny' : ''} ${!isParty ? 'pkr-party-card--storage' : ''} ${isParty && isActive ? 'pkr-party-card--lead' : ''}`}
    >
      {onToggleFavorite ? (
        <button type="button" className="pkr-favorite-btn" aria-label={`${p.favorite ? 'Remove' : 'Add'} ${displayName} ${p.favorite ? 'from' : 'to'} favorites`} aria-pressed={p.favorite === true} onClick={onToggleFavorite}>★</button>
      ) : null}
      <button type="button" className="pkr-party-card__toggle" onClick={onToggle} aria-expanded={isExpanded}>
        <div className="pkr-party-card__sprite-well">
          <PokemonSprite src={frontSpriteUrl(rootURL, p.dexNum, p.shiny === true)} alt={displayName} size={76} />
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-baseline justify-between gap-1">
            <span className="truncate text-xs font-black" style={{ color: '#e2e8f0' }}>
              {displayName}
            </span>
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
              {classification !== 'ordinary' ? <span className="pkr-classification-badge">{classification === 'ultra-beast' ? 'Ultra Beast' : classification}</span> : null}
              {p.shiny ? <span className="pkr-classification-badge pkr-classification-badge--shiny">Shiny</span> : null}
              {checkLevelEvolution(p) ? (
                <span
                  className="flex items-center gap-0.5 rounded px-1 py-px text-[7px] font-black uppercase"
                  style={{
                    background: 'rgba(168,85,247,0.28)',
                    color: '#f3e8ff',
                    border: '1px solid rgba(192,132,252,0.45)',
                  }}
                  title="Will evolve on next level-up after battle"
                >
                  <GameIcon name="dna" size={9} />
                  Evolves
                </span>
              ) : null}
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.35)',
                  color: '#fbbf24',
                }}
              >
                Lv{p.level}
              </span>
            </span>
          </div>
          <div className="mt-1.5 space-y-1">
            {p.currentHp <= 0 ? (
              <div
                className="rounded border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide"
                style={{
                  borderColor: 'rgba(248,113,113,0.45)',
                  background: 'rgba(127,29,29,0.35)',
                  color: '#fecaca',
                }}
              >
                Fainted
              </div>
            ) : null}
            <PartyHpMeter current={p.currentHp} max={p.maxHp} />
            <PartyXpMeter percent={xpProgressPercent(p)} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
            {p.types.map((t) => (
              <span key={t} className="rounded border px-1 py-px text-[7px] font-bold uppercase" style={typePillStyle(t)}>
                {t}
              </span>
            ))}
            {isParty && isActive ? (
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[7px] font-black uppercase"
                style={{
                  background: '#dc2626',
                  color: 'white',
                  boxShadow: '0 0 8px rgba(220,38,38,0.45)',
                }}
              >
                Lead
              </span>
            ) : null}
            {!isParty ? (
              <span
                className="ml-auto rounded px-1.5 py-px text-[6px] font-black uppercase tracking-wide"
                style={{ color: '#94a3b8', border: '1px solid rgba(148,163,184,0.25)' }}
              >
                Storage
              </span>
            ) : null}
          </div>
          <PokemonAppraisal pokemon={p} compact />
        </div>
      </button>
      {isExpanded && detail ? <div className="pkr-party-card__detail">{detail}</div> : null}
    </div>
  );
}
