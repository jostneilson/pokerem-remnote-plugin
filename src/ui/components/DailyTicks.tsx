import { dailyToday } from '../../game/engine/daily';
import type { PokeRemGameState } from '../../game/state/model';
import { GameIcon } from './GameIcon';

/** "Today: ☐ First catch ☐ First defeat" plus the study streak (SPEC U14). Each first pays ×3 XP and ₽500. */
export function DailyTicks({ state }: { state: Pick<PokeRemGameState, 'daily' | 'currentStreak' | 'starterChosen'> }) {
  if (!state.starterChosen) return null;
  const d = dailyToday(state);
  const tick = (done: boolean, label: string) => (
    <span className={`pkr-daily-tick${done ? ' is-done' : ''}`} aria-label={`${label}: ${done ? 'done' : 'not yet'}`}>
      <i aria-hidden="true">{done ? '✓' : ''}</i>
      {label}
    </span>
  );
  const streak = state.currentStreak ?? 0;
  return (
    <div className="pkr-daily-ticks" title="Your first catch and first defeat each day pay ×3 XP and ₽500. Every 7 days in a row pays ₽5k and a Rare XP Doubler.">
      <span className="pkr-daily-ticks__label">Today:</span>
      {tick(d.firstCatch, 'First catch')}
      {tick(d.firstDefeat, 'First defeat')}
      {streak > 0 ? (
        <span className="pkr-daily-streak">
          <GameIcon name="flame" size={11} /> {streak} day{streak === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}
