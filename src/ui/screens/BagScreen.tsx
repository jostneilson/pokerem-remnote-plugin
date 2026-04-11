import { ITEMS, type ItemData, type ItemId } from '../../game/data/items';
import { itemIconUrl } from '../../game/sprites';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';

type BagCounts = Record<string, number>;

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
          <span className="truncate text-[11px] font-black" style={{ color: isEmpty ? '#64748b' : '#e2e8f0' }}>
            {item.name}
          </span>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums"
            style={
              isEmpty
                ? { borderColor: 'rgba(100,116,139,0.35)', color: '#475569', background: 'rgba(0,0,0,0.2)' }
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
          <div className="mt-1 text-[8px] font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>
            Equip in battle or progression — not used from here
          </div>
        ) : null}
        {isEmpty ? (
          <div className="mt-1 text-[8px] font-bold" style={{ color: '#475569' }}>
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
  onUseItem,
}: {
  rootURL: string | undefined;
  bag: BagCounts;
  currency?: number;
  onUseItem: (itemId: ItemId) => void;
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
                Items for catching, healing, and evolving. Use heals on your <span className="font-bold text-slate-300">lead</span> Pokémon.
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

      {isEmpty ? (
        <Panel title="Bag is empty" icon={<GameIcon name="box" size={14} />}>
          <p className="text-center text-[10px] font-semibold leading-relaxed" style={{ color: '#94a3b8' }}>
            No items yet. Open the <span className="font-bold text-amber-200">Shop</span> tab to buy balls and medicine.
          </p>
        </Panel>
      ) : (
        CATEGORIES.map(({ label, icon, kinds, accent }) => {
          const items = ITEMS.filter((i) => kinds.includes(i.kind));
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
