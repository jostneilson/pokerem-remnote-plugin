import { isKeyItem } from '../../game/engine/capacity';
import { Coins } from '../components/Coins';
import { coinsSpoken, formatCoins } from '../format/coins';
import { useEffect, useRef, useState } from 'react';
import { getShopInventory, type ShopItem } from '../../game/engine/shop';
import { itemIconUrl } from '../../game/sprites';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';

export function ShopScreen({
  rootURL,
  currency,
  trainerLevel,
  onBuy,
  reducedMotion,
  bag,
  bagRoom,
}: {
  /** Free bag slots; at 0 non-key items can't be bought. Omit for no cap. */
  bagRoom?: number;
  rootURL: string | undefined;
  currency: number;
  trainerLevel: number;
  /** Buy `quantity` (price comes from the shop inventory). */
  onBuy: (itemId: string, quantity: number) => void;
  reducedMotion?: boolean;
  bag?: Record<string, number>;
}) {
  const inventory = getShopInventory(trainerLevel);
  const always = inventory.filter((i) => !i.isDaily);
  const daily = inventory.filter((i) => i.isDaily);
  const [purchasePulseId, setPurchasePulseId] = useState<string | null>(null);

  const pulseTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (pulseTimer.current) clearTimeout(pulseTimer.current); }, []);

  const roomFor = (si: ShopItem) => (bagRoom === undefined || isKeyItem(si.item.id) ? Infinity : bagRoom);
  const handleBuy = (si: ShopItem, quantity = 1) => {
    if (currency < si.price * quantity || roomFor(si) < quantity) return;
    onBuy(si.item.id, quantity);
    const key = si.item.id + (si.isDaily ? '-daily' : '');
    if (!reducedMotion) {
      setPurchasePulseId(key);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setPurchasePulseId(null), 420);
    }
  };

  function renderItem(si: ShopItem) {
    const bagFull = roomFor(si) < 1;
    const canAfford = currency >= si.price && !bagFull;
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
                opacity: 1,
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
          <div className="pkr-copy font-black" style={{ color: 'var(--pkr-ink-text)' }}>
            {si.item.name}
          </div>
          <div className="mt-0.5 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
            {si.item.description}
          </div>
          {bag ? <div className="pkr-shop-owned">Owned: {bag[si.item.id] ?? 0}</div> : null}
        </div>
        <div className="pkr-shop-buy flex shrink-0 flex-col items-stretch gap-1">
        <button
          type="button"
          aria-label={`Buy ${si.item.name} for ${coinsSpoken(si.price)}${bagFull ? ', bag full' : canAfford ? '' : ', insufficient balance'}`}
          title={bagFull ? 'Bag full: use or sell items, or buy a Bag Upgrade' : undefined}
          disabled={!canAfford}
          onClick={() => handleBuy(si)}
          className="pkr-game-btn shrink-0 rounded-lg border-2 px-3 py-2 pkr-fine font-black tabular-nums uppercase active:translate-y-px disabled:cursor-not-allowed disabled:opacity-75"
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
                  color: 'var(--pkr-ink-muted)',
                }
          }
        >
          {bagFull ? <span>Bag full</span> : <><span className="pkr-shop-buy__verb">Buy</span> <span>{formatCoins(si.price)}</span></>}
        </button>
        {si.price < 5000 ? (
          <div className="pkr-shop-multi" role="group" aria-label={`Buy several ${si.item.name}`}>
            {[5, 10].map((n) => (
              <button
                key={n}
                type="button"
                className="pkr-game-btn"
                disabled={currency < si.price * n || roomFor(si) < n}
                aria-label={`Buy ${n} ${si.item.name} for ${coinsSpoken(si.price * n)}`}
                onClick={() => handleBuy(si, n)}
              >
                ×{n}
              </button>
            ))}
          </div>
        ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="pkr-shop-hero">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="pkr-pixel-title pkr-fine font-black tracking-wide" style={{ color: 'var(--pkr-accent, #fbbf24)' }}>
              POKE MART
            </div>
            <p className="mt-0.5 max-w-[18rem] pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
              Buy supplies here, then switch to My items to use them.
            </p>
          </div>
        </div>
      </div>

      <div className="pkr-currency-bar pkr-shimmer-bg animate-pkr-shimmer flex min-h-[2.75rem] items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 pkr-copy font-bold" style={{ color: 'var(--pkr-ink-gold)' }}>
          <GameIcon name="coin" size={14} style={{ color: 'var(--pkr-ink-gold-strong)' }} /> Your balance
        </span>
        <span className="text-base font-black tabular-nums" style={{ color: '#fef3c7' }}>
          <Coins value={currency} />
        </span>
      </div>

      <Panel title="Always in stock" icon={<GameIcon name="bag" size={13} style={{ color: '#4ade80' }} />}>
        <div className="space-y-1.5">{always.map(renderItem)}</div>
      </Panel>

      <Panel title="Today's deals" icon={<GameIcon name="starFilled" size={13} style={{ color: '#f59e0b' }} />} accent="#d97706">
        <div className="space-y-1.5">{daily.map(renderItem)}</div>
        <div className="mt-2 text-center pkr-fine font-bold" style={{ color: 'var(--pkr-ink-gold-strong)' }}>
          Deals change daily
        </div>
      </Panel>
    </div>
  );
}
