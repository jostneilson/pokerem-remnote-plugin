import type { CombatStrikeSnapshot } from '../../game/state/model';
import {
  effectivenessBattleSummaryPhrase,
  effectivenessTier,
  moveDisplayName,
} from '../../game/engine/combatExchange';

function EffectivenessLine({ eff }: { eff: number }) {
  const tier = effectivenessTier(eff);
  const phrase = effectivenessBattleSummaryPhrase(eff);
  return (
    <span
      className={`pkr-combat-eff-line pkr-eff-chip pkr-eff-chip--narr pkr-eff-chip--${tier}`}
      aria-label={`Type effectiveness: ${phrase}`}
    >
      {phrase}
    </span>
  );
}

function ExchangeRow({
  side,
  displayName,
  moveName,
  damage,
  eff,
}: {
  side: 'you' | 'foe';
  displayName: string;
  moveName: string;
  damage: number;
  eff: number;
}) {
  const dotClass = side === 'you' ? 'pkr-combat-exchange-log__dot--you' : 'pkr-combat-exchange-log__dot--foe';
  const sideLabel = side === 'you' ? 'Your Pokémon' : 'Opposing';

  return (
    <div className="pkr-combat-exchange-log__row">
      <div className="pkr-combat-exchange-log__rail" aria-hidden>
        <span className={`pkr-combat-exchange-log__dot ${dotClass}`} />
      </div>
      <div className="pkr-combat-exchange-log__body min-w-0">
        <div className="pkr-combat-exchange-log__meta">
          <span className="pkr-combat-exchange-log__side">{sideLabel}</span>
        </div>
        <div className="pkr-combat-exchange-log__action">
          <span className="pkr-combat-exchange-log__name">{displayName}</span>
          <span className="pkr-combat-exchange-log__used"> used </span>
          <span className="pkr-combat-exchange-log__move">{moveName}</span>
          {damage > 0 ? (
            <span className="pkr-combat-exchange-log__dmg tabular-nums">
              {' '}
              −{damage} HP
            </span>
          ) : null}
        </div>
        <div className="pkr-combat-exchange-log__eff-wrap">
          <EffectivenessLine eff={eff} />
        </div>
      </div>
    </div>
  );
}

/**
 * Rich recap of the last combat exchange: both attacks with type-effectiveness copy (including neutral).
 */
export function CombatExchangeLogBlock({
  strike,
  playerDisplayName,
  wildDisplayName,
}: {
  strike: CombatStrikeSnapshot;
  playerDisplayName: string;
  wildDisplayName: string;
}) {
  const pMove = moveDisplayName(strike.playerMoveId);
  const wMove = moveDisplayName(strike.wildMoveId);
  const pDmg = strike.playerDamage ?? 0;
  const wDmg = strike.wildDamage ?? 0;
  const pEff = strike.playerEffectiveness ?? 1;
  const wEff = strike.wildEffectiveness ?? 1;

  return (
    <div className="pkr-combat-exchange-log">
      <ExchangeRow side="you" displayName={playerDisplayName} moveName={pMove} damage={pDmg} eff={pEff} />
      <div className="pkr-combat-exchange-log__split" aria-hidden />
      <ExchangeRow side="foe" displayName={wildDisplayName} moveName={wMove} damage={wDmg} eff={wEff} />
    </div>
  );
}
