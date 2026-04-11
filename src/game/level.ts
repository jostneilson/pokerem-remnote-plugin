export function levelFromTotalXp(totalXp: number): number {
  return Math.min(99, 1 + Math.floor(totalXp / 100));
}

export function xpToNextLevel(totalXp: number): number {
  const lvl = levelFromTotalXp(totalXp);
  const threshold = lvl * 100;
  return Math.max(0, threshold - totalXp);
}
