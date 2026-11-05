import { bagCap, bagCount, bagRoom, bagUpgradePrice, storageCap, storageUpgradePrice } from '../../game/engine/capacity';
import { useState, type ComponentProps } from 'react';
import type { PokeRemGameState } from '../../game/state/model';
import { BagScreen } from './BagScreen';
import { ShopScreen } from './ShopScreen';
import { ShopExtras } from './ShopExtras';
import { ThemeShop } from './ThemeShop';
import { GameIcon } from '../components/GameIcon';

type Props = {
  rootURL?: string;
  state: PokeRemGameState;
  onUseItem: ComponentProps<typeof BagScreen>['onUseItem'];
  onActivateXpDoubler: NonNullable<ComponentProps<typeof BagScreen>['onActivateXpDoubler']>;
  onBuy: ComponentProps<typeof ShopScreen>['onBuy'];
  onBuyRouteTicket?: (biomeId: string) => void;
  onBuyCardStyle?: (styleId: string) => void;
  onEquipCardStyle?: (styleId: string) => void;
  onBuyTheme?: (themeId: string, useVoucher: boolean) => void;
  onEquipTheme?: (themeId: string) => void;
  onBuyStorageUpgrade?: () => void;
  onBuyBagUpgrade?: () => void;
  reducedMotion?: boolean;
  initialView?: 'inventory' | 'shop';
};

/** A single item destination; old saves with a Shop tab still open its shop view. */
export function ItemsScreen({ rootURL, state, onUseItem, onActivateXpDoubler, onBuy, onBuyRouteTicket, onBuyCardStyle, onEquipCardStyle, onBuyTheme, onEquipTheme, onBuyStorageUpgrade, onBuyBagUpgrade, reducedMotion, initialView = 'inventory' }: Props) {
  const [view, setView] = useState(initialView);
  const [shopView, setShopView] = useState<'items' | 'themes'>('items');
  return <div className="pkr-items-screen">
    <div className="pkr-items-navigation" role="group" aria-label="Bag and shop">
      <button type="button" aria-pressed={view === 'inventory'} onClick={() => setView('inventory')}>
        <GameIcon name="bag" size={20} /><span>My items</span>
      </button>
      <button type="button" aria-pressed={view === 'shop'} onClick={() => setView('shop')}>
        <GameIcon name="navShop" size={20} /><span>Shop</span>
      </button>
    </div>
    <div key={view} className="pkr-items-view pkr-panel-mount">
      {view === 'inventory'
        ? <BagScreen rootURL={rootURL} state={state} bag={state.bag} currency={state.currency} onUseItem={onUseItem} onActivateXpDoubler={onActivateXpDoubler} />
        : <>
          {onBuyTheme && onEquipTheme ? (
            <div className="pkr-items-navigation pkr-shop-tabs" role="group" aria-label="Shop sections">
              <button type="button" aria-pressed={shopView === 'items'} onClick={() => setShopView('items')}><span>Items</span></button>
              <button type="button" aria-pressed={shopView === 'themes'} onClick={() => setShopView('themes')}><span>Themes</span></button>
            </div>
          ) : null}
          {shopView === 'themes' && onBuyTheme && onEquipTheme ? (
            <ThemeShop currency={state.currency ?? 0} themesOwned={state.themesOwned} themeActive={state.themeActive} themeVouchers={state.themeVouchers} onBuyTheme={onBuyTheme} onEquipTheme={onEquipTheme} />
          ) : <>
          <ShopScreen rootURL={rootURL} currency={state.currency ?? 0} trainerLevel={state.trainerLevel ?? 1} bag={state.bag} bagRoom={bagRoom(state)} reducedMotion={reducedMotion} onBuy={onBuy} />
          {onBuyRouteTicket && onBuyCardStyle && onEquipCardStyle ? (
            <div className="mt-3 flex flex-col gap-3">
              <ShopExtras rootURL={rootURL} currency={state.currency ?? 0} routeTicket={state.routeTicket} ownedCardStyles={state.ownedCardStyles} trainerCardStyle={state.trainerCardStyle} onBuyRouteTicket={onBuyRouteTicket} onBuyCardStyle={onBuyCardStyle} onEquipCardStyle={onEquipCardStyle} capacity={{ storageUsed: state.storagePokemon.length, storageCap: storageCap(state), storagePrice: storageUpgradePrice(state), bagUsed: bagCount(state.bag), bagCap: bagCap(state), bagPrice: bagUpgradePrice(state) }} onBuyStorageUpgrade={onBuyStorageUpgrade} onBuyBagUpgrade={onBuyBagUpgrade} />
            </div>
          ) : null}
          </>}
        </>}
    </div>
  </div>;
}
