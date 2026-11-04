import { coinsSpoken, formatCoins, formatCoinsExact } from '../format/coins';
import { ROUTE_BIOMES, ROUTE_BIOME_BY_ID, ROUTE_TICKET_PRICE, ROUTE_TICKET_WILDS, TRAINER_CARD_STYLES } from '../../game/engine/sinks';
import { battleSceneImageUrl } from '../../game/engine/battleAmbience';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { CapacityMeter } from '../components/CapacityMeter';
import { BAG_UPGRADE_STEP, STORAGE_UPGRADE_STEP } from '../../game/engine/capacity';

/** Shop sections beyond items: route tickets and trainer card styles. */
export function ShopExtras({
  rootURL,
  currency,
  routeTicket,
  ownedCardStyles,
  trainerCardStyle,
  onBuyRouteTicket,
  onBuyCardStyle,
  onEquipCardStyle,
  capacity,
  onBuyStorageUpgrade,
  onBuyBagUpgrade,
}: {
  /** Current caps and next upgrade prices (null = maxed). */
  capacity?: { storageUsed: number; storageCap: number; storagePrice: number | null; bagUsed: number; bagCap: number; bagPrice: number | null };
  onBuyStorageUpgrade?: () => void;
  onBuyBagUpgrade?: () => void;
  rootURL: string | undefined;
  currency: number;
  routeTicket?: { biome: string; remaining: number } | null;
  ownedCardStyles?: string[];
  trainerCardStyle?: string;
  onBuyRouteTicket: (biomeId: string) => void;
  onBuyCardStyle: (styleId: string) => void;
  onEquipCardStyle: (styleId: string) => void;
}) {
  const active = routeTicket && routeTicket.remaining > 0 ? routeTicket : null;
  const activeBiome = active ? ROUTE_BIOME_BY_ID.get(active.biome) : undefined;
  const owned = new Set(['classic', ...(ownedCardStyles ?? [])]);
  const equipped = trainerCardStyle ?? 'classic';
  const upgradeRow = (o: { name: string; step: number; used: number; cap: number; price: number | null; onBuy?: () => void }) => (
    <li className="pkr-upgrade-row">
      <span className="pkr-upgrade-row__body">
        <strong>
          {o.name} +{o.step}
        </strong>
        <CapacityMeter label={o.name.split(' ')[0]!} used={o.used} cap={o.cap} />
      </span>
      {o.price == null ? (
        <span className="pkr-card-style__state">Maxed</span>
      ) : (
        <button
          type="button"
          className="pkr-game-btn pkr-ticket__buy"
          disabled={!o.onBuy || currency < o.price}
          aria-label={`Buy ${o.name} plus ${o.step} for ${coinsSpoken(o.price)}`}
          onClick={o.onBuy}
        >
          {formatCoins(o.price)}
        </button>
      )}
    </li>
  );
  return (
    <>
      {capacity ? (
        <Panel title="Capacity upgrades" icon={<GameIcon name="box" size={13} style={{ color: '#86efac' }} />} accent="#15803d">
          <p className="pkr-shop-extras-note">More room for Pokémon and items. Trainer levels add room too (every 5 levels).</p>
          <ul className="pkr-upgrade-list">
            {upgradeRow({ name: 'Storage Upgrade', step: STORAGE_UPGRADE_STEP, used: capacity.storageUsed, cap: capacity.storageCap, price: capacity.storagePrice, onBuy: onBuyStorageUpgrade })}
            {upgradeRow({ name: 'Bag Upgrade', step: BAG_UPGRADE_STEP, used: capacity.bagUsed, cap: capacity.bagCap, price: capacity.bagPrice, onBuy: onBuyBagUpgrade })}
          </ul>
        </Panel>
      ) : null}
      <Panel title="Route tickets" icon={<GameIcon name="key" size={13} style={{ color: '#7dd3fc' }} />} accent="#0284c7">
        <p className="pkr-shop-extras-note">
          {formatCoinsExact(ROUTE_TICKET_PRICE)} sends your next {ROUTE_TICKET_WILDS} wild Pokémon to one place, with its types more likely.
          {activeBiome ? (
            <strong className="pkr-ticket-active"> Active: {activeBiome.name} · {active!.remaining} wild{active!.remaining === 1 ? '' : 's'} left.</strong>
          ) : null}
        </p>
        <ul className="pkr-ticket-grid">
          {ROUTE_BIOMES.map((b) => {
            const blocked = !!active && active.biome !== b.id;
            const afford = currency >= ROUTE_TICKET_PRICE;
            return (
              <li key={b.id} className={`pkr-ticket${active?.biome === b.id ? ' pkr-ticket--active' : ''}`}>
                <span className="pkr-ticket__art" style={{ backgroundImage: `url(${battleSceneImageUrl(rootURL, b.scenes[0]!)})` }} aria-hidden="true" />
                <span className="pkr-ticket__body">
                  <strong>{b.name}</strong>
                  <span>{b.blurb}</span>
                </span>
                <button
                  type="button"
                  className="pkr-game-btn pkr-ticket__buy"
                  disabled={blocked || !afford}
                  title={blocked ? `Finish your ${activeBiome?.name} ticket first` : undefined}
                  aria-label={`${active?.biome === b.id ? 'Add 10 more wilds to' : 'Buy a ticket for'} ${b.name}, ${coinsSpoken(ROUTE_TICKET_PRICE)}`}
                  onClick={() => onBuyRouteTicket(b.id)}
                >
                  {active?.biome === b.id ? '+10' : formatCoins(ROUTE_TICKET_PRICE)}
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Trainer card styles" icon={<GameIcon name="starFilled" size={13} style={{ color: '#f0abfc' }} />} accent="#a21caf">
        <p className="pkr-shop-extras-note">A look for your trainer license on the Trainer screen.</p>
        <ul className="pkr-card-style-grid">
          {TRAINER_CARD_STYLES.map((st) => {
            const has = owned.has(st.id);
            const on = equipped === st.id;
            return (
              <li key={st.id} className={`pkr-card-style${on ? ' pkr-card-style--on' : ''}`}>
                <span className={`pkr-card-style__swatch pkr-trainer-identity--style-${st.id}`} aria-hidden="true">
                  <i />
                </span>
                <strong>{st.name}</strong>
                {on ? (
                  <span className="pkr-card-style__state">Equipped</span>
                ) : has ? (
                  <button type="button" className="pkr-game-btn pkr-card-style__btn" onClick={() => onEquipCardStyle(st.id)}>
                    Equip
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pkr-game-btn pkr-card-style__btn"
                    disabled={currency < st.price}
                    aria-label={`Buy ${st.name} card style for ${coinsSpoken(st.price)}`}
                    onClick={() => onBuyCardStyle(st.id)}
                  >
                    {formatCoins(st.price)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
