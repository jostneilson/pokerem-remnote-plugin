import { ITEMS, type ItemData, type ItemId } from '../../game/data/items';
import { itemIconUrl } from '../../game/sprites';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import type { PokeRemGameState, XpDoublerTier } from '../../game/state/model';
import {
  XP_DOUBLER_CARDS,
  XP_DOUBLER_QUEUE_MAX,
  isXpDoublerItemId,
  xpDoublerLabel,
} from '../../game/engine/xpDoublers';

type BagCounts = Record<string, number>;

const XP_DOUBLER_ITEMS: { tier: XpDoublerTier; id: ItemId }[] = [
  { tier: 'common',    id: 'xp-doubler-common' },
  { tier: 'rare',      id: 'xp-doubler-rare' },
  { tier: 'legendary', id: 'xp-doubler-legendary' },
];

const TIER_STYLE: Record<
  XpDoublerTier,
  {
    label: string;
    short: string;
    name: string;
    accent: string;
    chipBg: string;
    chipText: string;
  }
> = {
  common: {
    label: 'Common',
    short: 'C',
    name: 'Common Doubler',
    accent: '#cbd5e1',
    chipBg: 'linear-gradient(180deg, #cbd5e1 0%, #64748b 100%)',
    chipText: '#0f172a',
  },
  rare: {
    label: 'Rare',
    short: 'R',
    name: 'Rare Doubler',
    accent: '#93c5fd',
    chipBg: 'linear-gradient(180deg, #bfdbfe 0%, #2563eb 100%)',
    chipText: '#0b1a3d',
  },
  legendary: {
    label: 'Legend',
    short: 'L',
    name: 'Legend Doubler',
    accent: '#fde68a',
    chipBg: 'linear-gradient(180deg, #fde68a 0%, #b45309 100%)',
    chipText: '#1c1917',
  },
};

function BoostersPanel({
  rootURL,
  bag,
  state,
  onActivate,
}: {
  rootURL: string | undefined;
  bag: BagCounts;
  state: PokeRemGameState;
  onActivate: (tier: XpDoublerTier) => void;
}) {
  const active = state.xpBoosterActive ?? null;
  const queue = state.xpBoosterQueue ?? [];
  const queueFull = queue.length >= XP_DOUBLER_QUEUE_MAX;
  const activeTotal = active ? XP_DOUBLER_CARDS[active.tier] : 0;
  const activePct = active && activeTotal > 0 ? Math.max(4, Math.round((active.cardsRemaining / activeTotal) * 100)) : 0;

  return (
    <Panel
      title="Boosters"
      icon={<GameIcon name="coin" size={13} style={{ color: '#fde68a' }} />}
      accent="#fde68a"
    >
      <div className="flex flex-col gap-2">
        {/* Active/inactive status row — same pkr-bag-item language as below */}
        <div
          className={`pkr-bag-item ${active ? '' : 'pkr-bag-item--empty'}`}
          style={
            active
              ? {
                  borderColor: 'rgba(253,224,71,0.55)',
                  background:
                    'linear-gradient(180deg, rgba(253,224,71,0.18) 0%, rgba(120,53,15,0.2) 100%)',
                  boxShadow: '0 0 10px rgba(253,224,71,0.18)',
                }
              : undefined
          }
        >
          <div
            className="pkr-bag-item__icon-slot"
            style={{
              background: active
                ? 'radial-gradient(circle at 30% 25%, rgba(253,224,71,0.45) 0%, rgba(15,23,42,0.7) 75%)'
                : undefined,
              borderColor: active ? 'rgba(120,53,15,0.75)' : undefined,
            }}
          >
            <span
              className="text-[13px] font-black tabular-nums"
              style={{ color: active ? '#fde68a' : '#94a3b8' }}
            >
              2×
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="truncate text-[11px] font-black"
                style={{ color: active ? '#fde68a' : '#94a3b8' }}
              >
                {active ? `${TIER_STYLE[active.tier].label} Doubler` : 'XP Doubler'}
              </span>
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums"
                style={
                  active
                    ? {
                        borderColor: 'rgba(253,224,71,0.5)',
                        color: '#fde68a',
                        background: 'rgba(120,53,15,0.4)',
                      }
                    : {
                        borderColor: 'rgba(100,116,139,0.35)',
                        color: '#8296a5',
                        background: 'rgba(0,0,0,0.2)',
                      }
                }
              >
                {active ? `${active.cardsRemaining}/${activeTotal}` : 'Off'}
              </span>
            </div>
            <div className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
              {active ? '2× XP for all Pokémon — ticks down each card' : 'No booster active · use one below to start 2× XP'}
            </div>
            {active ? (
              <div className="pkr-meter-track mt-1 h-[4px] overflow-hidden">
                <div
                  className="pkr-meter-fill h-full transition-[width] duration-500"
                  style={{
                    width: `${activePct}%`,
                    background: 'linear-gradient(90deg, #fde68a 0%, #f59e0b 100%)',
                    boxShadow: '0 0 6px rgba(253,224,71,0.5)',
                  }}
                />
              </div>
            ) : null}
            {queue.length > 0 ? (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                  Next
                </span>
                {queue.map((q, i) => (
                  <span
                    key={i}
                    className="grid place-items-center rounded-full text-[8px] font-black"
                    style={{
                      width: 14,
                      height: 14,
                      background: TIER_STYLE[q.tier].chipBg,
                      color: TIER_STYLE[q.tier].chipText,
                    }}
                    title={`${xpDoublerLabel(q.tier)} — ${XP_DOUBLER_CARDS[q.tier]} cards`}
                  >
                    {TIER_STYLE[q.tier].short}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Booster items — matches pkr-bag-item shop language */}
        {XP_DOUBLER_ITEMS.map(({ tier, id }) => {
          const item = ITEMS.find((i) => i.id === id);
          if (!item) return null;
          const count = bag[id] ?? 0;
          const disabled = count <= 0 || queueFull;
          const owned = count > 0;
          const style = TIER_STYLE[tier];
          return (
            <div
              key={id}
              className={`pkr-bag-item ${owned ? '' : 'pkr-bag-item--empty'}`}
              style={
                owned
                  ? {
                      borderColor: `${style.accent}88`,
                      background: `linear-gradient(180deg, ${style.accent}14 0%, transparent 100%)`,
                    }
                  : undefined
              }
            >
              <div className="pkr-bag-item__icon-slot">
                <img
                  src={itemIconUrl(rootURL, item.iconFile)}
                  alt=""
                  width={32}
                  height={32}
                  style={{ imageRendering: 'pixelated', opacity: owned ? 1 : 0.45 }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-[11px] font-black" style={{ color: owned ? '#e2e8f0' : '#94a3b8' }}>
                      {style.name}
                    </span>
                    <span
                      className="shrink-0 rounded px-1 py-[1px] text-[7px] font-black uppercase leading-none tracking-[0.1em]"
                      style={{
                        background: owned ? style.chipBg : 'rgba(15,23,42,0.6)',
                        color: owned ? style.chipText : '#94a3b8',
                        border: owned ? 'none' : '1px solid rgba(100,116,139,0.4)',
                      }}
                    >
                      {style.label}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums"
                    style={
                      owned
                        ? { borderColor: 'rgba(110,231,183,0.35)', color: '#6ee7b7', background: 'rgba(6,78,59,0.35)' }
                        : { borderColor: 'rgba(100,116,139,0.35)', color: '#8296a5', background: 'rgba(0,0,0,0.2)' }
                    }
                  >
                    ×{count}
                  </span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
                  2× XP for all Pokémon · next {XP_DOUBLER_CARDS[tier]} cards
                </div>
                {!owned ? (
                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Empty slot · earn from trainer battles &amp; achievements
                  </div>
                ) : null}
              </div>
              {owned ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onActivate(tier)}
                  className="pkr-game-btn"
                  style={{
                    borderColor: disabled ? 'rgba(100,116,139,0.5)' : '#854d0e',
                    background: disabled
                      ? 'rgba(71,85,105,0.35)'
                      : 'linear-gradient(180deg, #fde68a 0%, #f59e0b 50%, #b45309 100%)',
                    color: disabled ? '#8296a5' : '#1c1917',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    queueFull
                      ? 'Queue is full — wait for the active booster to finish'
                      : active
                      ? 'Queue for after the current booster'
                      : 'Activate now'
                  }
                >
                  {active ? 'Queue' : 'Use'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const CATEGORIES: { label: string; icon: JSX.Element; kinds: string[]; accent?: string }[] = [
  { label: 'Poke Balls', icon: <GameIcon name="pokeball" size={13} style={{ color: '#ef4444' }} />, kinds: ['catch'], accent: '#f87171' },
  { label: 'Medicine', icon: <GameIcon name="pills" size={13} style={{ color: '#f472b6' }} />, kinds: ['heal'], accent: '#f472b6' },
  { label: 'Evolution stones', icon: <GameIcon name="gem" size={13} style={{ color: '#c084fc' }} />, kinds: ['evolution'], accent: '#c084fc' },
  { label: 'Key items', icon: <GameIcon name="key" size={13} style={{ color: '#fbbf24' }} />, kinds: ['utility', 'hold'], accent: '#fbbf24' },
];

function totalBagCount(bag: BagCounts): number {
  return ITEMS.reduce((n, i) => n + (bag[i.id] ?? 0), 0);
}

function ItemRow({
  rootURL,
  item,
  count,
  onUse,
  canUse,
}: {
  rootURL: string | undefined;
  item: ItemData;
  count: number;
  onUse: () => void;
  canUse: boolean;
}) {
  const isEmpty = count <= 0;
  return (
    <div className={`pkr-bag-item ${isEmpty ? 'pkr-bag-item--empty' : ''}`}>
      <div className="pkr-bag-item__icon-slot">
        <img
          src={itemIconUrl(rootURL, item.iconFile)}
          alt=""
          width={32}
          height={32}
          style={{ imageRendering: 'pixelated', opacity: isEmpty ? 0.45 : 1 }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[11px] font-black" style={{ color: isEmpty ? '#94a3b8' : '#e2e8f0' }}>
            {item.name}
          </span>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums"
            style={
              isEmpty
                ? { borderColor: 'rgba(100,116,139,0.35)', color: '#8296a5', background: 'rgba(0,0,0,0.2)' }
                : { borderColor: 'rgba(110,231,183,0.35)', color: '#6ee7b7', background: 'rgba(6,78,59,0.35)' }
            }
          >
            ×{count}
          </span>
        </div>
        {item.description ? (
          <div className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
            {item.description}
          </div>
        ) : null}
        {!isEmpty && !canUse ? (
          <div className="mt-1 text-[8px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
            Equip in battle or progression — not used from here
          </div>
        ) : null}
        {isEmpty ? (
          <div className="mt-1 text-[8px] font-bold" style={{ color: '#8296a5' }}>
            Empty slot · visit the Shop to stock up
          </div>
        ) : null}
      </div>
      {canUse && count > 0 ? (
        <button
          type="button"
          onClick={onUse}
          className="pkr-game-btn shrink-0 rounded-lg border-2 px-3 py-2 text-[9px] font-black uppercase"
          style={{
            borderColor: '#166534',
            background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 45%, #15803d 100%)',
            color: '#052e16',
          }}
          title={`Use ${item.name} on your lead Pokémon`}
        >
          Use
        </button>
      ) : null}
    </div>
  );
}

export function BagScreen({
  rootURL,
  bag,
  currency,
  state,
  onUseItem,
  onActivateXpDoubler,
}: {
  rootURL: string | undefined;
  bag: BagCounts;
  currency?: number;
  state?: PokeRemGameState;
  onUseItem: (itemId: ItemId) => void;
  onActivateXpDoubler?: (tier: XpDoublerTier) => void;
}) {
  const total = totalBagCount(bag);
  const isEmpty = total <= 0;

  return (
    <div className="space-y-3">
      <div className="pkr-bag-screen-header">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GameIcon name="bag" size={20} style={{ color: 'var(--pkr-accent, #fbbf24)' }} />
            <div>
              <div className="pkr-pixel-title text-[7px] font-black uppercase leading-tight tracking-wide" style={{ color: 'var(--pkr-accent, #fbbf24)' }}>
                Your bag
              </div>
              <div className="text-[9px] font-semibold" style={{ color: '#94a3b8' }}>
                Items for catching, healing, and evolving. Medicine targets your <span className="font-bold text-slate-300">lead</span> —{' '}
                <span className="font-bold text-slate-300">Revive</span> only works on fainted Pokémon; other heals need them conscious first.
              </div>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 pkr-pixel-title text-[6px] font-black tabular-nums"
            style={{ borderColor: 'rgba(148,163,184,0.35)', color: '#cbd5e1' }}
            title="Total item count"
          >
            {total} pcs
          </span>
        </div>
      </div>

      {currency != null ? (
        <div className="pkr-currency-bar pkr-shimmer-bg animate-pkr-shimmer flex min-h-[2.75rem] items-center justify-between px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#fde68a' }}>
            <GameIcon name="coin" size={14} style={{ color: '#fbbf24' }} /> Poké Dollars
          </span>
          <span className="text-base font-black tabular-nums" style={{ color: '#fef3c7' }}>
            P{currency}
          </span>
        </div>
      ) : null}

      {state && onActivateXpDoubler ? (
        <BoostersPanel
          rootURL={rootURL}
          bag={bag}
          state={state}
          onActivate={onActivateXpDoubler}
        />
      ) : null}

      {isEmpty ? (
        <Panel title="Bag is empty" icon={<GameIcon name="box" size={14} />}>
          <p className="text-center text-[10px] font-semibold leading-relaxed" style={{ color: '#94a3b8' }}>
            No items yet. Open the <span className="font-bold text-amber-200">Shop</span> tab to buy balls and medicine.
          </p>
        </Panel>
      ) : (
        CATEGORIES.map(({ label, icon, kinds, accent }) => {
          const items = ITEMS.filter((i) => kinds.includes(i.kind) && !isXpDoublerItemId(i.id));
          if (items.length === 0) return null;
          const hasAny = items.some((i) => (bag[i.id] ?? 0) > 0);
          if (!hasAny && label !== 'Poke Balls' && label !== 'Medicine') return null;
          return (
            <Panel key={label} title={label} icon={icon} accent={accent}>
              <div className="pkr-bag-shelf space-y-1.5">
                {items.map((item) => {
                  const count = bag[item.id] ?? 0;
                  const canUse =
                    count > 0 &&
                    (item.kind === 'heal' || item.id === 'rare-candy' || item.id === 'exp-candy-s');
                  return (
                    <ItemRow
                      key={item.id}
                      rootURL={rootURL}
                      item={item}
                      count={count}
                      onUse={() => onUseItem(item.id)}
                      canUse={canUse}
                    />
                  );
                })}
              </div>
            </Panel>
          );
        })
      )}
    </div>
  );
}
