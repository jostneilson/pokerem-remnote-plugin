import type { OwnedPokemon } from '../state/model';

/**
 * Minimum total XP needed to **reach** this level (1-based).
 * Level 1 is reachable at 0 XP; level 2 starts at the first threshold, etc.
 * Curve: early levels are cheap, later levels require progressively more XP per step.
 */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(40 * Math.pow(level - 1, 1.65));
}

export function levelFromXp(totalXp: number): number {
  const x = Math.max(0, totalXp);
  let level = 1;
  for (let L = 2; L <= 100; L++) {
    if (x < xpThresholdForLevel(L)) break;
    level = L;
  }
  return level;
}

export function xpToNextLevel(totalXp: number): number {
  const level = levelFromXp(totalXp);
  if (level >= 100) return 0;
  return Math.max(0, xpThresholdForLevel(level + 1) - totalXp);
}

/** XP accumulated within the current level band (for UI). */
export function xpIntoCurrentLevel(totalXp: number): number {
  const level = levelFromXp(totalXp);
  return Math.max(0, totalXp - xpThresholdForLevel(level));
}

/** Width of the current level's XP segment (0 at max level). */
export function xpSpanForCurrentLevel(totalXp: number): number {
  const level = levelFromXp(totalXp);
  if (level >= 100) return 1;
  const hi = xpThresholdForLevel(level + 1);
  const lo = xpThresholdForLevel(level);
  return Math.max(1, hi - lo);
}

export function maxHpFor(baseHp: number, level: number): number {
  return Math.max(10, Math.floor(baseHp + level * 3));
}

export function healAmount(mon: OwnedPokemon, amount: number): OwnedPokemon {
  return { ...mon, currentHp: Math.min(mon.maxHp, mon.currentHp + amount) };
}
