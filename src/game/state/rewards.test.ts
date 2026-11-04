import { describe, expect, it, vi } from 'vitest';
import { catchCoins, defeatCoins, rollBounty } from '../balance';
import { seededRng } from '../sim/simulate';
import type { PokeRemGameState } from './model';
import { catchEncounter, chooseStarter, createInitialStateV4, defeatEncounter, parseGameState } from './store';

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
    expect(defeatEncounter(withWild(2400)).currency).toBe(defeatCoins(10, 25) + 2400);
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const caught = catchEncounter(withWild(2400), 'poke-ball');
    spy.mockRestore();
    expect(caught.currency).toBe(catchCoins(10, 25) + 2400);
    expect(caught.lastBattleResult?.bounty).toBe(2400);
    expect(parseGameState(JSON.parse(JSON.stringify(withWild(2400)))).currentEncounter?.bounty).toBe(2400);
  });
});
