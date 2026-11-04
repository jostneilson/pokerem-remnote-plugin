import { useEffect, useState } from 'react';
import type { EncounterPokemon, OwnedPokemon } from '../../game/state/model';
import { itemIconUrl } from '../../game/sprites';
import type { CatchBall } from '../../game/engine/encounters';
import { GameIcon } from '../components/GameIcon';
import { TypedLine } from './TypedLine';
import { CATCH_BALL_STOCK, type BusyAction } from './battleSurfaceUtils';

export type BallChip = {
  key: CatchBall;
  icon: string;
  label: string;
  n: number;
  pct: number | null;
};

/** "What will X do?" with Catch / Fight / Run, auto attack, the ball picker and Catch Scope. */
export function BattleCommandMenu({
  rootURL,
  active,
  wild,
  canCatch,
  battleBusy,
  busyAction,
  canFight,
  hoverLift,
  reducedMotion,
  suggestedBall,
  suggestedPct,
  guaranteedCatch,
  ballChips,
  catchScopeCount,
  autoAttacking,
  autoAttackMessage,
  onThrow,
  onFight,
  onRun,
  onToggleAutoAttack,
  onCatchScope,
  onStorageFull,
}: {
  /** Set when storage is full and this wild can't go over the cap: Catch opens the transfer grid instead. */
  onStorageFull?: () => void;
  rootURL: string | undefined;
  active: OwnedPokemon;
  wild: EncounterPokemon | null;
  canCatch: boolean;
  battleBusy: boolean;
  busyAction: BusyAction;
  canFight: boolean;
  hoverLift: string;
  reducedMotion?: boolean;
  suggestedBall: CatchBall;
  suggestedPct: number | null;
  guaranteedCatch: boolean;
  ballChips: BallChip[];
  catchScopeCount: number;
  autoAttacking: boolean;
  autoAttackMessage?: string;
  onThrow: (ball: CatchBall) => void;
  onFight: () => void;
  /** `giveUpPrize` is set once the player confirms giving up the Rocket Leader's prize. */
  onRun: (giveUpPrize?: boolean) => void;
  onToggleAutoAttack?: () => void;
  onCatchScope?: () => void;
}) {
  const busy = (a: BusyAction) => battleBusy && busyAction === a;
  const lead = active.nickname || active.name;
  const isPrize = wild?.pendingPrize === true;
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  useEffect(() => setConfirmGiveUp(false), [wild?.dexNum, wild?.pendingPrize]);
  return (
    <div className="space-y-2">
      <div className={`pkr-battle-prompt${wild?.shiny ? ' pkr-battle-prompt--shiny' : ''}`}>
        <TypedLine
          text={
            confirmGiveUp
              ? 'Give up the prize? It won’t come back.'
              : isPrize
                ? `THE LEADER’S PRIZE: ${wild!.shiny ? '✦ shiny ' : ''}${wild!.name}! What will ${lead} do?`
                : wild?.shiny
                  ? `✦ A shiny ${wild.name} appeared! What will ${lead} do?`
                  : `What will ${lead} do?`
          }
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="flex min-h-[58px] flex-row items-stretch gap-2">
        <button
          type="button"
          disabled={onStorageFull ? battleBusy : !canCatch || battleBusy}
          onClick={() => (onStorageFull ? onStorageFull() : onThrow(suggestedBall))}
          aria-label={
            onStorageFull
              ? 'Storage full. Open Transfer to make room'
              : suggestedPct != null
              ? `Catch with ${CATCH_BALL_STOCK.find((b) => b.key === suggestedBall)?.label}, ${suggestedPct}% chance`
              : 'Catch'
          }
          className={`pkr-game-btn pkr-battle-cmd-side pkr-cmd pkr-cmd--catch flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-center ${hoverLift}`}
        >
          <GameIcon name="pokeball" size={15} className="shrink-0" />
          <div className="pkr-cmd__label whitespace-nowrap uppercase leading-none">
            {busy('catch') ? '…' : onStorageFull ? 'Storage full' : 'Catch'}
          </div>
          {onStorageFull ? (
            <div className="pkr-catch-odds">· Transfer</div>
          ) : suggestedPct != null ? (
            <div className="pkr-catch-odds">
              {guaranteedCatch ? 'Sure catch!' : `${suggestedPct}%`}
            </div>
          ) : null}
        </button>
        <button
          type="button"
          disabled={battleBusy || !canFight}
          onClick={onFight}
          className={`pkr-game-btn pkr-battle-cmd-fight pkr-cmd pkr-cmd--fight group relative flex min-h-[58px] min-w-[38%] flex-[1.2] flex-col items-center justify-center gap-1 px-1.5 py-1.5 text-center ${hoverLift}`}
        >
          <GameIcon name="swords" size={18} className="shrink-0" />
          <div className="pkr-cmd__label pkr-cmd__label--main whitespace-nowrap uppercase leading-none">
            {busy('fight') ? '…' : 'Fight'}
          </div>
        </button>
        <button
          type="button"
          disabled={battleBusy}
          onClick={() => {
            if (!isPrize) return onRun();
            if (!confirmGiveUp) return setConfirmGiveUp(true);
            setConfirmGiveUp(false);
            onRun(true);
          }}
          onBlur={() => setConfirmGiveUp(false)}
          aria-label={isPrize ? (confirmGiveUp ? 'Confirm: give up the prize' : 'Run (gives up the prize)') : 'Run'}
          className={`pkr-game-btn pkr-battle-cmd-side pkr-cmd pkr-cmd--run flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-center ${hoverLift}`}
        >
          <GameIcon name="flee" size={15} className="shrink-0" />
          <div className="pkr-cmd__label whitespace-nowrap uppercase leading-none">
            {busy('run') ? '…' : confirmGiveUp ? 'Give up' : 'Run'}
          </div>
        </button>
      </div>
      {onToggleAutoAttack ? (
        <div className="pkr-auto-attack">
          <button
            type="button"
            className="pkr-game-btn w-full px-3 py-2"
            aria-pressed={autoAttacking}
            disabled={!autoAttacking && (battleBusy || active.currentHp <= 0)}
            onClick={onToggleAutoAttack}
          >
            {autoAttacking ? 'Stop auto attack' : 'Auto attack'}
          </button>
          <p role="status" className="mt-1 text-center pkr-lead">
            {autoAttackMessage || 'Weakens the wild Pokémon, then stops for Catch.'}
          </p>
        </div>
      ) : null}
      {ballChips.length > 0 ? (
        <div className="pkr-ball-picker" role="group" aria-label="Throw a ball">
          {ballChips.map((row) => (
            <button
              key={row.key}
              type="button"
              disabled={!canCatch || battleBusy}
              onClick={() => onThrow(row.key)}
              aria-label={
                row.pct != null
                  ? `Throw ${row.label}, ${row.pct}% chance, ${row.n} left`
                  : `${row.label}, ${row.n} left`
              }
              title={row.label}
              className={`pkr-ball-chip${row.key === suggestedBall ? ' pkr-ball-chip--suggested' : ''}`}
            >
              <img
                src={itemIconUrl(rootURL, row.icon)}
                alt=""
                width={16}
                height={16}
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="pkr-ball-chip-count">×{row.n}</span>
              {row.pct != null ? <span className="pkr-ball-chip-odds">{row.pct}%</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {catchScopeCount > 0 && onCatchScope ? (
        <button
          type="button"
          disabled={battleBusy}
          onClick={onCatchScope}
          className="mt-1 w-full rounded-md border px-2 py-1 pkr-fine font-black uppercase tracking-wide active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: 'rgba(147,197,253,0.5)',
            background: 'linear-gradient(180deg, rgba(30,58,138,0.5) 0%, rgba(15,23,42,0.85) 100%)',
            color: '#bfdbfe',
            boxShadow: '0 0 10px rgba(59,130,246,0.25)',
          }}
        >
          Catch Scope ×{catchScopeCount}
        </button>
      ) : null}
    </div>
  );
}
