export interface TrainerReward {
  level: number;
  title: string;
  description: string;
  items?: Record<string, number>;
  unlockShopItem?: string;
  trainerRankTitle?: string;
}

export const TRAINER_REWARDS: TrainerReward[] = [
  { level: 2, title: 'First Steps', description: '3x Poke Balls', items: { 'poke-ball': 3 } },
  { level: 3, title: 'Ball Upgrade', description: 'Great Ball unlocked in shop', unlockShopItem: 'great-ball' },
  { level: 5, title: 'Pokemon Trainer', description: '5x Potions + new title', items: { 'potion': 5 }, trainerRankTitle: 'Pokemon Trainer' },
  { level: 7, title: 'Ultra Access', description: 'Ultra Ball unlocked in shop', unlockShopItem: 'ultra-ball' },
  { level: 10, title: 'Ace Trainer', description: 'Rare Candy + new title', items: { 'rare-candy': 1 }, trainerRankTitle: 'Ace Trainer' },
  { level: 12, title: 'Stocked Up', description: '5x Great Balls', items: { 'great-ball': 5 } },
  { level: 15, title: 'Veteran', description: 'Super Potion unlocked + new title', unlockShopItem: 'super-potion', trainerRankTitle: 'Veteran' },
  { level: 18, title: 'Medicine Kit', description: '3x Super Potions', items: { 'super-potion': 3 } },
  { level: 20, title: 'Expert', description: 'Max Potion unlocked + new title', unlockShopItem: 'max-potion', trainerRankTitle: 'Expert' },
  { level: 25, title: 'Pokemon Master', description: '3x Rare Candies + new title', items: { 'rare-candy': 3 }, trainerRankTitle: 'Pokemon Master' },
  { level: 30, title: 'Champion', description: '5x Ultra Balls + new title', items: { 'ultra-ball': 5 }, trainerRankTitle: 'Champion' },
  { level: 35, title: 'Elite Reserve', description: '5x Rare Candies', items: { 'rare-candy': 5 } },
  { level: 40, title: 'Grand Champion', description: 'New title + 3x Moon Stones', items: { 'moon-stone': 3 }, trainerRankTitle: 'Grand Champion' },
  { level: 45, title: 'Legendary Trainer', description: '3x Fire Stones', items: { 'fire-stone': 3 }, trainerRankTitle: 'Legendary Trainer' },
  { level: 50, title: 'Pokemon Legend', description: 'Ultimate title', trainerRankTitle: 'Pokemon Legend' },
];

/**
 * Per-action trainer XP. Achievement unlocks use tiered amounts from
 * `ACHIEVEMENT_TIER_TRAINER_XP` in `achievements.ts` (typically +15 … +150).
 */
export const TRAINER_XP_SOURCES = {
  cardReview: 5,
  catch: 25,
  defeat: 15,
  evolution: 50,
  levelUp: 10,
  streakDay: 20,
  run: 2,
} as const;

export const MAX_TRAINER_LEVEL = 50;

export function trainerXpForLevel(level: number): number {
  return Math.floor(50 * level * (1 + level * 0.1));
}

export function trainerLevelFromXp(totalXp: number): number {
  let level = 1;
  let cumulative = 0;
  while (level < MAX_TRAINER_LEVEL) {
    const needed = trainerXpForLevel(level);
    if (cumulative + needed > totalXp) break;
    cumulative += needed;
    level++;
  }
  return level;
}

export function trainerXpProgress(totalXp: number): { current: number; needed: number; percent: number } {
  let level = 1;
  let cumulative = 0;
  while (level < MAX_TRAINER_LEVEL) {
    const needed = trainerXpForLevel(level);
    if (cumulative + needed > totalXp) {
      const current = totalXp - cumulative;
      return { current, needed, percent: Math.min(100, (current / needed) * 100) };
    }
    cumulative += needed;
    level++;
  }
  return { current: 0, needed: 0, percent: 100 };
}

export function getUnclaimedRewards(trainerLevel: number, claimedLevels: number[]): TrainerReward[] {
  return TRAINER_REWARDS.filter((r) => r.level <= trainerLevel && !claimedLevels.includes(r.level));
}

/** Next milestone reward tier above current trainer level (for “what’s next” UI). */
export function getNextTrainerRewardGate(currentLevel: number): TrainerReward | null {
  const upcoming = TRAINER_REWARDS.filter((r) => r.level > currentLevel).sort((a, b) => a.level - b.level);
  return upcoming[0] ?? null;
}
