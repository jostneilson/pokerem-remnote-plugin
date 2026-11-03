import { ROUTE_BIOMES, ROUTE_BIOME_BY_ID, ROUTE_TICKET_PRICE, ROUTE_TICKET_WILDS, TRAINER_CARD_STYLES } from '../../game/engine/sinks';
import { battleSceneImageUrl } from '../../game/engine/battleAmbience';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';

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
}: {
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
  return (
    <>
      <Panel title="Route tickets" icon={<GameIcon name="key" size={13} style={{ color: '#7dd3fc' }} />} accent="#0284c7">
        <p className="pkr-shop-extras-note">
          ₽{ROUTE_TICKET_PRICE.toLocaleString()} sends your next {ROUTE_TICKET_WILDS} wild Pokémon to one place, with its types more likely.
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
                  aria-label={`${active?.biome === b.id ? 'Add 10 more wilds to' : 'Buy a ticket for'} ${b.name}, ${ROUTE_TICKET_PRICE} Poké Dollars`}
                  onClick={() => onBuyRouteTicket(b.id)}
                >
                  {active?.biome === b.id ? '+10' : `₽${(ROUTE_TICKET_PRICE / 1000).toFixed(0)}k`}
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
                    aria-label={`Buy ${st.name} card style for ${st.price} Poké Dollars`}
                    onClick={() => onBuyCardStyle(st.id)}
                  >
                    ₽{st.price >= 1000 ? `${st.price / 1000}k` : st.price}
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
