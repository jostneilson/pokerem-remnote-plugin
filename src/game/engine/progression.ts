import type { OwnedPokemon } from '../state/model';

export const XP_PER_LEVEL = 100;

export function levelFromXp(totalXp: number): number {
  return Math.min(100, 1 + Math.floor(totalXp / XP_PER_LEVEL));
}

export function xpToNextLevel(totalXp: number): number {
  const level = levelFromXp(totalXp);
  return Math.max(0, level * XP_PER_LEVEL - totalXp);
}

export function maxHpFor(baseHp: number, level: number): number {
  return Math.max(10, Math.floor(baseHp + level * 3));
}

export function healAmount(mon: OwnedPokemon, amount: number): OwnedPokemon {
  return { ...mon, currentHp: Math.min(mon.maxHp, mon.currentHp + amount) };
}
