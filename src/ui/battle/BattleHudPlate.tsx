import { useState, type ReactNode } from 'react';
import type { PokemonType } from '../../game/data/species';
import { TypeSymbolImage } from './TypeBattleIcon';

/**
 * A corner info plate on the battle field (wild top-left, yours bottom-right): name, level and HP,
 * with a type panel that opens on hover or stays pinned on click / Enter.
 */
export function BattleHudPlate({
  idPrefix,
  className,
  interactive = true,
  maxWidth,
  accent,
  header,
  shiny,
  name,
  level,
  levelColor,
  hp,
  maxHp,
  hpTextColor,
  hpGradient,
  hit,
  rootURL,
  typeIconSize,
  reducedMotion,
  types,
  resists,
  weaknesses,
}: {
  /** Keeps React keys distinct between the two plates. */
  idPrefix: 'w' | 'p';
  /** Position and state classes. */
  className: string;
  interactive?: boolean;
  maxWidth: number;
  accent: string;
  header: ReactNode;
  shiny: boolean;
  name: string;
  level: number;
  levelColor: string;
  hp: number;
  maxHp: number;
  hpTextColor: string;
  hpGradient: string;
  hit: boolean;
  rootURL: string | undefined;
  typeIconSize: number;
  reducedMotion?: boolean;
  /** Sorted types to show in the panel (empty hides the row). */
  types: PokemonType[];
  resists: PokemonType[];
  weaknesses: PokemonType[];
}) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = pinned || hover;
  const hpPct = maxHp <= 0 ? 0 : Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const icon = (t: PokemonType, key: string, size: number, variant: 'resist' | 'weak') => (
    <TypeSymbolImage
      key={key}
      rootURL={rootURL}
      type={t}
      size={size}
      variant={variant}
      reducedMotion={reducedMotion}
      showTooltip={false}
    />
  );
  return (
    <div
      className={`pkr-battle-hud pkr-battle-hud--compact absolute z-[25] max-w-full px-1.5 py-1 text-left ${className}`}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      onClick={() => interactive && setPinned((v) => !v)}
      role={interactive ? 'button' : 'presentation'}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setPinned((v) => !v);
        }
      }}
      aria-expanded={open}
      style={{
        maxWidth,
        borderColor: `${accent}55`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 1px 1px 0 rgba(0,0,0,0.38), 0 0 12px ${accent}22`,
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {header}
      <div className="line-clamp-2 pkr-fine font-black leading-tight" style={{ color: 'white' }}>
        {shiny ? (
          <span className="pkr-hud-shiny" title="Shiny" aria-label="Shiny">
            ✦
          </span>
        ) : null}
        <span className="break-words">{name}</span>{' '}
        <span className="whitespace-nowrap font-bold" style={{ color: levelColor }}>
          Lv{level}
        </span>
      </div>
      <div className="mt-0.5 flex flex-row-reverse items-center gap-1">
        <span
          className="shrink-0 pkr-fine font-bold tabular-nums leading-none"
          style={{ color: hpTextColor }}
        >
          {Math.floor(hp)}/{Math.floor(maxHp)}
        </span>
        <div className="pkr-battle-hp-track h-[4px] min-w-0 flex-1 overflow-hidden">
          <div
            className={`pkr-battle-hp-fill h-full transition-[width] duration-300 ${hit ? 'pkr-hp-fill-hit' : ''}`}
            style={{ width: `${hpPct}%`, background: hpGradient }}
          />
        </div>
      </div>
      <div className={`pkr-battle-type-panel ${open ? 'pkr-battle-type-panel--open' : ''}`}>
        {types.length > 0 ? (
          <div className="mt-1 flex flex-wrap items-center justify-start gap-0.5">
            {types.map((t) => icon(t, `${idPrefix}t-${t}`, Math.min(typeIconSize, 16), 'resist'))}
          </div>
        ) : null}
        {resists.length > 0 ? (
          <div className="mt-1 flex min-w-0 flex-wrap items-center justify-start gap-0.5">
            <span
              className="shrink-0 pkr-fine font-black leading-none"
              style={{ color: '#86efac' }}
            >
              ↑
            </span>
            {resists.map((t) => icon(t, `${idPrefix}r-${t}`, typeIconSize, 'resist'))}
          </div>
        ) : null}
        {weaknesses.length > 0 ? (
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center justify-start gap-0.5">
            <span
              className="shrink-0 pkr-fine font-black leading-none"
              style={{ color: 'var(--pkr-ink-danger)' }}
            >
              ↓
            </span>
            {weaknesses.map((t) => icon(t, `${idPrefix}w-${t}`, typeIconSize, 'weak'))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
