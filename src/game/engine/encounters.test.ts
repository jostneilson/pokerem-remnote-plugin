import { describe, expect, it, vi } from 'vitest';
import { averagePartyLevel, computeCatchChance, tryCatch } from './encounters';
import type { OwnedPokemon } from '../state/model';

function mon(level: number): OwnedPokemon {
  return {
    id: 'x',
    dexNum: 1,
    name: 'A',
    level,
    totalXp: 0,
    currentHp: 10,
    maxHp: 10,
    types: ['Normal'],
  };
}

describe('computeCatchChance', () => {
  it('matches tryCatch roll threshold', () => {
    const c = computeCatchChance(0.2, 255, 1);
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValueOnce(c - 0.001);
    expect(tryCatch(0.2, 255, 1)).toBe(true);
    spy.mockReturnValueOnce(c + 0.001);
    expect(tryCatch(0.2, 255, 1)).toBe(false);
    spy.mockRestore();
  });
});

describe('averagePartyLevel', () => {
  it('returns 1 for empty party', () => {
    expect(averagePartyLevel([])).toBe(1);
  });

  it('rounds mean and clamps to 1', () => {
    expect(averagePartyLevel([mon(1), mon(2), mon(3)])).toBe(2);
    expect(averagePartyLevel([mon(1), mon(1)])).toBe(1);
  });

  it('caps at 100', () => {
    expect(averagePartyLevel([mon(100), mon(100)])).toBe(100);
  });
});
