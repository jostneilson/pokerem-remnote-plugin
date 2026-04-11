import { useState } from 'react';
import { getShopInventory, type ShopItem } from '../../game/engine/shop';
import { itemIconUrl } from '../../game/sprites';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';

export function ShopScreen({
  rootURL,
  currency,
  onBuy,
  reducedMotion,
}: {
  rootURL: string | undefined;
  currency: number;
  onBuy: (itemId: string, price: number) => void;
  reducedMotion?: boolean;
}) {
  const inventory = getShopInventory();
  const always = inventory.filter((i) => !i.isDaily);
  const daily = inventory.filter((i) => i.isDaily);
  const [purchasePulseId, setPurchasePulseId] = useState<string | null>(null);

  const handleBuy = (si: ShopItem) => {
    if (currency < si.price) return;
    onBuy(si.item.id, si.price);
    const key = si.item.id + (si.isDaily ? '-daily' : '');
    if (!reducedMotion) {
      setPurchasePulseId(key);
      window.setTimeout(() => setPurchasePulseId(null), 700);
    }
  };

  function renderItem(si: ShopItem) {
    const canAfford = currency >= si.price;
    const key = si.item.id + (si.isDaily ? '-daily' : '');
    const pulsing = purchasePulseId === key;

    return (
      <div
        key={key}
        className={`pkr-shop-row flex min-h-[3.25rem] items-center gap-2.5 rounded-lg border p-2 transition-all ${
          pulsing && !reducedMotion ? 'pkr-shop-row--pulse' : ''
        }`}
        style={
          canAfford
            ? {
                borderColor: 'rgba(255,255,255,0.1)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.08) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }
            : {
                borderColor: 'rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.12)',
                opacity: 0.72,
              }
        }
      >
        <div className="pkr-shop-row__icon-slot flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-black/40 bg-black/25">
          <img
            src={itemIconUrl(rootURL, si.item.iconFile)}
            alt=""
            width={32}
            height={32}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black" style={{ color: '#e2e8f0' }}>
            {si.item.name}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
            {si.item.description}
          </div>
        </div>
        <button
          type="button"
          disabled={!canAfford}
          onClick={() => handleBuy(si)}
          className="pkr-game-btn shrink-0 rounded-lg border-2 px-3 py-2 text-[10px] font-black tabular-nums uppercase active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
          style={
            canAfford
              ? {
                  borderColor: '#b45309',
                  background: 'linear-gradient(180deg, #fde047 0%, #eab308 45%, #ca8a04 100%)',
                  color: '#451a03',
                }
              : {
                  borderColor: 'rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#64748b',
                }
          }
        >
          P{si.price}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="pkr-shop-hero">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="pkr-pixel-title text-[7px] font-black tracking-wide" style={{ color: 'var(--pkr-accent, #fbbf24)' }}>
              POKE MART
            </div>
            <p className="mt-0.5 max-w-[18rem] text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
              Spend Poké Dollars on balls and supplies. Purchased items go straight to your bag — watch your balance update.
            </p>
          </div>
        </div>
      </div>

      <div className="pkr-currency-bar pkr-shimmer-bg animate-pkr-shimmer flex min-h-[2.75rem] items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#fde68a' }}>
          <GameIcon name="coin" size={14} style={{ color: '#fbbf24' }} /> Your balance
        </span>
        <span className="text-base font-black tabular-nums" style={{ color: '#fef3c7' }}>
          P{currency}
        </span>
      </div>

      <Panel title="Always in stock" icon={<GameIcon name="bag" size={13} style={{ color: '#4ade80' }} />}>
        <div className="space-y-1.5">{always.map(renderItem)}</div>
      </Panel>

      <Panel title="Today's deals" icon={<GameIcon name="starFilled" size={13} style={{ color: '#f59e0b' }} />} accent="#d97706">
        <div className="space-y-1.5">{daily.map(renderItem)}</div>
        <div className="mt-2 text-center text-[9px] font-bold" style={{ color: '#fbbf24' }}>
          Rotates daily · same great items, limited feel
        </div>
      </Panel>
    </div>
  );
}
