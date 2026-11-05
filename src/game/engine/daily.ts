import type { PokeRemGameState } from '../state/model';

/*
 * Daily firsts and the study streak bonus (SPEC B3). The first catch and the first defeat each day pay ×3 XP
 * and ₽500; every 7th day in a row of studying pays ₽5k and a Rare XP Doubler. Days are UTC, like `dailyStats`.
 */

export const DAILY_FIRST_COINS = 500;
export const DAILY_FIRST_XP_MULT = 3;
export const STREAK_BONUS_EVERY = 7;
export const STREAK_BONUS_COINS = 5000;

export type DailyState = NonNullable<PokeRemGameState['daily']>;
export type DailyFirst = 'firstCatch' | 'firstDefeat';

export function todayKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Today's ticks (a stale or missing record reads as nothing done yet). */
export function dailyToday(state: Pick<PokeRemGameState, 'daily'>, now: number = Date.now()): DailyState {
  const day = todayKey(now);
  const d = state.daily;
  return d && d.day === day ? d : { day, firstCatch: false, firstDefeat: false };
}

export function isDailyFirst(state: Pick<PokeRemGameState, 'daily'>, kind: DailyFirst): boolean {
  return !dailyToday(state)[kind];
}

export function markDaily(state: Pick<PokeRemGameState, 'daily'>, kind: DailyFirst): DailyState {
  return { ...dailyToday(state), [kind]: true };
}

/** A streak of `days` earns the bonus on every 7th day. */
export function streakBonusDue(days: number): boolean {
  return days > 0 && days % STREAK_BONUS_EVERY === 0;
}

export function normalizeDaily(raw: unknown): DailyState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Partial<DailyState>;
  if (typeof o.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.day)) return undefined;
  return { day: o.day, firstCatch: o.firstCatch === true, firstDefeat: o.firstDefeat === true };
}
