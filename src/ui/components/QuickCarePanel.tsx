import { ITEM_BY_ID } from '../../game/data/items';
import { REVIVE_SHOP_PRICE } from '../../game/engine/shop';
import type { PokeRemGameState } from '../../game/state/model';
import {
  activePokemon,
  bestPotionForLead,
  nextHealthyPartyMember,
  pokemonCenterCost,
  QUICK_BALL_COUNT,
} from '../../game/state/store';
import { gameCommand, type GameCommand } from '../../game/commands';

const HURT_RATIO = 0.5;

/** One-tap recovery on Play. Renders nothing while the team is healthy. */
export function QuickCarePanel({
  state,
  busy = false,
  onApply,
}: {
  state: PokeRemGameState;
  busy?: boolean;
  onApply: (command: GameCommand) => void;
}) {
  const lead = activePokemon(state);
  if (!lead || state.pendingCaughtMon || state.currentTrainerBattle?.phase === 'active') return null;
  const coins = state.currency ?? 0;
  const inWild = !!state.currentEncounter;
  const fainted = lead.currentHp <= 0;
  const hurt = !fainted && lead.currentHp / Math.max(1, lead.maxHp) <= HURT_RATIO;
  const anyBallLeft = ['poke-ball', 'great-ball', 'ultra-ball'].some((id) => (state.bag[id as keyof typeof state.bag] ?? 0) > 0);
  const needBalls = inWild && !anyBallLeft;
  const centerCost = pokemonCenterCost(state);
  const showCenter = !inWild && centerCost > 0 && (fainted || hurt);
  if (!fainted && !hurt && !needBalls) return null;

  const name = lead.nickname || lead.name;
  const reviveCount = state.bag.revive ?? 0;
  const next = fainted ? nextHealthyPartyMember(state) : null;
  const potion = hurt ? bestPotionForLead(state) : null;
  const ballPrice = ITEM_BY_ID.get('poke-ball')!.price;
  const canRevive = reviveCount > 0 || coins >= REVIVE_SHOP_PRICE;
  const stuck = fainted && !canRevive && !next && coins < centerCost;

  return (
    <section className={`pkr-care ${fainted ? 'pkr-care--fainted' : ''}`} aria-label="Quick care">
      <p className="pkr-care__title">
        {fainted ? `${name} fainted!` : needBalls && !hurt ? 'Out of Poké Balls!' : `${name} needs care`}
      </p>
      {stuck ? <p className="pkr-care__note">Not enough coins yet. Every flashcard you review earns more.</p> : null}
      <div className="pkr-care__actions">
        {fainted ? (
          <button type="button" className="pkr-btn-primary" disabled={busy || !canRevive} onClick={() => onApply(gameCommand('quickReviveLead'))}>
            {reviveCount > 0 ? `Revive (×${reviveCount})` : `Buy & Revive ₽${REVIVE_SHOP_PRICE}`}
          </button>
        ) : null}
        {next ? (
          <button type="button" className="pkr-btn-secondary" disabled={busy} onClick={() => onApply(gameCommand('switchActivePokemon', next.id))}>
            Send out {next.nickname || next.name}
          </button>
        ) : null}
        {potion ? (
          <button
            type="button"
            className="pkr-btn-primary"
            disabled={busy || (!potion.owned && coins < potion.price)}
            onClick={() => onApply(gameCommand('quickHealLead'))}
          >
            {potion.owned
              ? `Use ${ITEM_BY_ID.get(potion.id)!.name} (×${state.bag[potion.id] ?? 0})`
              : `Buy & use Potion ₽${potion.price}`}
          </button>
        ) : null}
        {showCenter ? (
          <button type="button" className="pkr-btn-secondary" disabled={busy || coins < centerCost} onClick={() => onApply(gameCommand('pokemonCenterHeal'))}>
            Heal team ₽{centerCost}
          </button>
        ) : null}
        {needBalls ? (
          <button type="button" className="pkr-btn-primary" disabled={busy || coins < ballPrice} onClick={() => onApply(gameCommand('quickBuyBalls'))}>
            Buy {QUICK_BALL_COUNT} Poké Balls · ₽{(ballPrice * QUICK_BALL_COUNT).toLocaleString()}
          </button>
        ) : null}
      </div>
    </section>
  );
}
