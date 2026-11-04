import { describe, expect, it, vi } from 'vitest';
import { catchCoins, defeatCoins, rollBounty } from '../balance';
import { seededRng } from '../sim/simulate';
import type { PokeRemGameState } from './model';
import { catchEncounter, chooseStarter, createInitialStateV4, defeatEncounter, onQueueCardComplete, parseGameState } from './store';
import { DAILY_FIRST_COINS, STREAK_BONUS_COINS, todayKey } from '../engine/daily';

const withWild = (bounty?: number): PokeRemGameState => ({
  ...chooseStarter(createInitialStateV4(), 4),
  currency: 0,
  totalCurrencyEarned: 0,
  bag: { ...createInitialStateV4().bag, 'poke-ball': 5 },
  currentEncounter: { dexNum: 25, name: 'Pikachu', level: 10, maxHp: 80, currentHp: 80, types: ['Electric'], ...(bounty ? { bounty } : {}) }
});

describe('bounties (SPEC B2)', () => {
  it('about 1 in 40 wilds carries ₽1.5–4k, in ₽100 steps', () => {
    const rng = seededRng(7);
    const rolls: number[] = [];
    for (let i = 0; i < 40000; i++) {
      const b = rollBounty(rng);
      if (b) rolls.push(b);
    }
    expect(rolls.length / 40000).toBeGreaterThan(0.021);
    expect(rolls.length / 40000).toBeLessThan(0.029);
    for (const b of rolls) {
      expect(b).toBeGreaterThanOrEqual(1500);
      expect(b).toBeLessThanOrEqual(4000);
      expect(b % 100).toBe(0);
    }
  });

  it('is paid on defeat and on catch, and survives a save round-trip', () => {
    const done = { daily: { day: todayKey(), firstCatch: true, firstDefeat: true } };
    expect(defeatEncounter({ ...withWild(2400), ...done }).currency).toBe(defeatCoins(10, 25) + 2400);
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const caught = catchEncounter({ ...withWild(2400), ...done }, 'poke-ball');
    spy.mockRestore();
    expect(caught.currency).toBe(catchCoins(10, 25) + 2400);
    expect(caught.lastBattleResult?.bounty).toBe(2400);
    expect(parseGameState(JSON.parse(JSON.stringify(withWild(2400)))).currentEncounter?.bounty).toBe(2400);
  });
});

describe('daily firsts and the streak (SPEC B3)', () => {
  it('the first defeat of the day pays ×3 XP and ₽500, the second does not', () => {
    const fresh = { ...withWild(), daily: { day: '2001-01-01', firstCatch: true, firstDefeat: true } };
    const first = defeatEncounter(fresh);
    expect(first.currency).toBe(defeatCoins(10, 25) + DAILY_FIRST_COINS);
    expect(first.daily).toEqual({ day: todayKey(), firstCatch: false, firstDefeat: true });
    const second = defeatEncounter({ ...withWild(), daily: first.daily });
    expect(second.currency).toBe(defeatCoins(10, 25));
    const xp = (s: PokeRemGameState) => s.party[0]!.totalXp - withWild().party[0]!.totalXp;
    expect(xp(first)).toBeGreaterThanOrEqual(xp(second) * 3 - 3);
  });

  it('the first catch of the day pays ₽500 extra', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const caught = catchEncounter(withWild(), 'poke-ball');
    spy.mockRestore();
    expect(caught.currency).toBe(catchCoins(10, 25) + DAILY_FIRST_COINS);
    expect(caught.daily?.firstCatch).toBe(true);
  });

  it('day 7 of a streak pays ₽5k and a Rare XP Doubler', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const base = { ...withWild(), currentEncounter: null, lastStudyDate: yesterday, currentStreak: 6 };
    const doublers = base.bag['xp-doubler-rare'] ?? 0;
    const next = onQueueCardComplete(base, [1], 999, {});
    expect(next.currentStreak).toBe(7);
    expect(next.bag['xp-doubler-rare']).toBe(doublers + 1);
    expect(next.currency - base.currency).toBeGreaterThanOrEqual(STREAK_BONUS_COINS);
    expect(next.mainNoticeQueue?.some((n) => n.id.startsWith('streak-'))).toBe(true);
  });
});
