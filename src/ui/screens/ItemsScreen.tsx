import { useState, type ComponentProps } from 'react';
import type { PokeRemGameState } from '../../game/state/model';
import { BagScreen } from './BagScreen';
import { ShopScreen } from './ShopScreen';
import { ShopExtras } from './ShopExtras';
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
  reducedMotion?: boolean;
  initialView?: 'inventory' | 'shop';
};

/** A single item destination; old saves with a Shop tab still open its shop view. */
export function ItemsScreen({ rootURL, state, onUseItem, onActivateXpDoubler, onBuy, onBuyRouteTicket, onBuyCardStyle, onEquipCardStyle, reducedMotion, initialView = 'inventory' }: Props) {
  const [view, setView] = useState(initialView);
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
          <ShopScreen rootURL={rootURL} currency={state.currency ?? 0} trainerLevel={state.trainerLevel ?? 1} bag={state.bag} reducedMotion={reducedMotion} onBuy={onBuy} />
          {onBuyRouteTicket && onBuyCardStyle && onEquipCardStyle ? (
            <div className="mt-3 flex flex-col gap-3">
              <ShopExtras rootURL={rootURL} currency={state.currency ?? 0} routeTicket={state.routeTicket} ownedCardStyles={state.ownedCardStyles} trainerCardStyle={state.trainerCardStyle} onBuyRouteTicket={onBuyRouteTicket} onBuyCardStyle={onBuyCardStyle} onEquipCardStyle={onEquipCardStyle} />
            </div>
          ) : null}
        </>}
    </div>
  </div>;
}
