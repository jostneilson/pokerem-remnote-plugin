import { describe, expect, it } from 'vitest';
import { levelFromXp, xpThresholdForLevel, xpToNextLevel } from './progression';

describe('progression curve', () => {
  it('keeps thresholds strictly increasing up to level 100', () => {
    let prev = xpThresholdForLevel(1);
    for (let L = 2; L <= 100; L++) {
      const t = xpThresholdForLevel(L);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });

  it('makes early levels cheaper than the old flat 100 XP step', () => {
    expect(xpThresholdForLevel(3) - xpThresholdForLevel(2)).toBeLessThan(100);
  });

  it('levelFromXp and xpToNextLevel stay consistent', () => {
    const samples = [0, 39, 40, 5000, xpThresholdForLevel(99)];
    for (const x of samples) {
      const L = levelFromXp(x);
      expect(L).toBeGreaterThanOrEqual(1);
      expect(L).toBeLessThanOrEqual(100);
      const need = xpToNextLevel(x);
      if (L >= 100) {
        expect(need).toBe(0);
      } else {
        expect(x + need).toBe(xpThresholdForLevel(L + 1));
      }
    }
  });
});
