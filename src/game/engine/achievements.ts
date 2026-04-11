import type { ItemId } from '../data/items';
import { ITEM_BY_ID } from '../data/items';
import type { PokeRemGameState } from '../state/model';

/** Drives trainer XP on unlock; rarer goals grant bigger bonuses. */
export type AchievementTier = 'common' | 'uncommon' | 'rare' | 'epic';

export const ACHIEVEMENT_TIER_TRAINER_XP: Record<AchievementTier, number> = {
  common: 15,
  uncommon: 35,
  rare: 75,
  epic: 150,
};

export const ACHIEVEMENT_TIER_LABEL: Record<AchievementTier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
};

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: 'review' | 'collection' | 'battle' | 'pokemon' | 'economy' | 'streak';
  tier: AchievementTier;
  /** Extra bag items granted once when unlocked (on top of tier trainer XP). */
  bonusItems?: Partial<Record<ItemId, number>>;
  /** If set, replaces tier-based trainer XP for this achievement. */
  trainerXpOverride?: number;
  check: (state: PokeRemGameState) => boolean;
  progress?: (state: PokeRemGameState) => { current: number; target: number };
}

export function achievementTrainerXpReward(def: AchievementDef): number {
  return def.trainerXpOverride ?? ACHIEVEMENT_TIER_TRAINER_XP[def.tier];
}

export function achievementItemBonus(def: AchievementDef): Partial<Record<ItemId, number>> {
  return def.bonusItems ? { ...def.bonusItems } : {};
}

/** One-line summary for Progress / tooltips. */
export function achievementRewardSummary(def: AchievementDef): string {
  const xp = achievementTrainerXpReward(def);
  const items = achievementItemBonus(def);
  const parts: string[] = [`+${xp} trainer XP`];
  for (const [id, n] of Object.entries(items)) {
    if (!n || n <= 0) continue;
    const meta = ITEM_BY_ID.get(id as ItemId);
    parts.push(`${n}× ${meta?.name ?? id}`);
  }
  return parts.join(' · ');
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Review milestones
  { id: 'review25', name: 'Getting Started', description: 'Review 25 cards', category: 'review', tier: 'common',
    check: (s) => s.cardsReviewed >= 25, progress: (s) => ({ current: Math.min(s.cardsReviewed, 25), target: 25 }) },
  { id: 'review100', name: 'Dedicated Student', description: 'Review 100 cards', category: 'review', tier: 'common',
    check: (s) => s.cardsReviewed >= 100, progress: (s) => ({ current: Math.min(s.cardsReviewed, 100), target: 100 }) },
  { id: 'review250', name: 'Study Machine', description: 'Review 250 cards', category: 'review', tier: 'uncommon',
    check: (s) => s.cardsReviewed >= 250, progress: (s) => ({ current: Math.min(s.cardsReviewed, 250), target: 250 }) },
  { id: 'review500', name: 'Knowledge Seeker', description: 'Review 500 cards', category: 'review', tier: 'uncommon',
    check: (s) => s.cardsReviewed >= 500, progress: (s) => ({ current: Math.min(s.cardsReviewed, 500), target: 500 }) },
  { id: 'review1000', name: 'Scholar', description: 'Review 1000 cards', category: 'review', tier: 'rare',
    check: (s) => s.cardsReviewed >= 1000, progress: (s) => ({ current: Math.min(s.cardsReviewed, 1000), target: 1000 }) },
  { id: 'review2500', name: 'Bookworm', description: 'Review 2500 cards', category: 'review', tier: 'rare',
    check: (s) => s.cardsReviewed >= 2500, progress: (s) => ({ current: Math.min(s.cardsReviewed, 2500), target: 2500 }) },
  { id: 'review5000', name: 'Academic', description: 'Review 5000 cards', category: 'review', tier: 'epic',
    check: (s) => s.cardsReviewed >= 5000, progress: (s) => ({ current: Math.min(s.cardsReviewed, 5000), target: 5000 }) },
  { id: 'review10000', name: 'Professor', description: 'Review 10000 cards', category: 'review', tier: 'epic',
    bonusItems: { 'rare-candy': 2 },
    check: (s) => s.cardsReviewed >= 10000, progress: (s) => ({ current: Math.min(s.cardsReviewed, 10000), target: 10000 }) },

  // Collection
  { id: 'catch1', name: 'First Catch', description: 'Catch your first Pokemon', category: 'collection', tier: 'common',
    check: (s) => uniqueCaught(s) >= 1 },
  { id: 'catch5', name: 'Beginner Collector', description: 'Catch 5 unique species', category: 'collection', tier: 'uncommon',
    check: (s) => uniqueCaught(s) >= 5, progress: (s) => ({ current: Math.min(uniqueCaught(s), 5), target: 5 }) },
  { id: 'catch25', name: 'Pokemon Collector', description: 'Catch 25 unique species', category: 'collection', tier: 'uncommon',
    check: (s) => uniqueCaught(s) >= 25, progress: (s) => ({ current: Math.min(uniqueCaught(s), 25), target: 25 }) },
  { id: 'catch50', name: 'Avid Collector', description: 'Catch 50 unique species', category: 'collection', tier: 'rare',
    check: (s) => uniqueCaught(s) >= 50, progress: (s) => ({ current: Math.min(uniqueCaught(s), 50), target: 50 }) },
  { id: 'catch100', name: 'Master Collector', description: 'Catch 100 unique species', category: 'collection', tier: 'rare',
    check: (s) => uniqueCaught(s) >= 100, progress: (s) => ({ current: Math.min(uniqueCaught(s), 100), target: 100 }) },
  { id: 'catch151', name: 'Kanto Complete', description: 'Catch 151 unique species', category: 'collection', tier: 'epic',
    bonusItems: { 'rare-candy': 1, 'ultra-ball': 3 },
    check: (s) => uniqueCaught(s) >= 151, progress: (s) => ({ current: Math.min(uniqueCaught(s), 151), target: 151 }) },
  { id: 'catch500', name: 'Living Pokedex', description: 'Catch 500 unique species', category: 'collection', tier: 'epic',
    bonusItems: { 'rare-candy': 3 },
    check: (s) => uniqueCaught(s) >= 500, progress: (s) => ({ current: Math.min(uniqueCaught(s), 500), target: 500 }) },

  // Battle
  { id: 'defeat10', name: 'Battler', description: 'Defeat 10 wild Pokemon', category: 'battle', tier: 'common',
    check: (s) => (s.totalDefeated ?? 0) >= 10, progress: (s) => ({ current: Math.min(s.totalDefeated ?? 0, 10), target: 10 }) },
  { id: 'defeat50', name: 'Fighter', description: 'Defeat 50 wild Pokemon', category: 'battle', tier: 'uncommon',
    check: (s) => (s.totalDefeated ?? 0) >= 50, progress: (s) => ({ current: Math.min(s.totalDefeated ?? 0, 50), target: 50 }) },
  { id: 'defeat100', name: 'Warrior', description: 'Defeat 100 wild Pokemon', category: 'battle', tier: 'rare',
    check: (s) => (s.totalDefeated ?? 0) >= 100, progress: (s) => ({ current: Math.min(s.totalDefeated ?? 0, 100), target: 100 }) },
  { id: 'defeat500', name: 'Champion Fighter', description: 'Defeat 500 wild Pokemon', category: 'battle', tier: 'epic',
    bonusItems: { 'great-ball': 5 },
    check: (s) => (s.totalDefeated ?? 0) >= 500, progress: (s) => ({ current: Math.min(s.totalDefeated ?? 0, 500), target: 500 }) },

  // Pokemon milestones
  { id: 'firstLevelUp', name: 'First Level Up', description: 'Level up a Pokemon for the first time', category: 'pokemon', tier: 'common',
    check: (s) => s.party.some((p) => p.level > 5) },
  { id: 'level25', name: 'Experienced Trainer', description: 'Reach Lv25 with any Pokemon', category: 'pokemon', tier: 'uncommon',
    check: (s) => s.party.some((p) => p.level >= 25) },
  { id: 'level50', name: 'Veteran Trainer', description: 'Reach Lv50 with any Pokemon', category: 'pokemon', tier: 'rare',
    check: (s) => s.party.some((p) => p.level >= 50) },
  { id: 'level100', name: 'Max Level', description: 'Reach Lv100 with any Pokemon', category: 'pokemon', tier: 'epic',
    bonusItems: { 'rare-candy': 2 },
    check: (s) => s.party.some((p) => p.level >= 100) },
  { id: 'fullParty', name: 'Full Party', description: 'Fill all 6 party slots', category: 'pokemon', tier: 'uncommon',
    check: (s) => s.party.length >= 6 },
  { id: 'firstEvolution', name: 'Evolution!', description: 'Evolve a Pokemon for the first time', category: 'pokemon', tier: 'uncommon',
    check: (s) => (s.totalEvolutions ?? 0) >= 1 },
  { id: 'storage10', name: 'Pokemon Hoarder', description: 'Have 10+ Pokemon in storage', category: 'pokemon', tier: 'uncommon',
    check: (s) => s.storagePokemon.length >= 10 },

  // Economy
  { id: 'earn1000', name: 'First Savings', description: 'Earn 1000 Poke Dollars total', category: 'economy', tier: 'common',
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 1000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 1000), target: 1000 }) },
  { id: 'earn5000', name: 'Well Off', description: 'Earn 5000 Poke Dollars total', category: 'economy', tier: 'uncommon',
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 5000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 5000), target: 5000 }) },
  { id: 'earn25000', name: 'Wealthy Trainer', description: 'Earn 25000 Poke Dollars total', category: 'economy', tier: 'rare',
    bonusItems: { 'ultra-ball': 5 },
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 25000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 25000), target: 25000 }) },
  { id: 'shop10', name: 'Shopaholic', description: 'Buy 10 items from the shop', category: 'economy', tier: 'common',
    check: (s) => (s.totalShopPurchases ?? 0) >= 10, progress: (s) => ({ current: Math.min(s.totalShopPurchases ?? 0, 10), target: 10 }) },

  // Streak
  { id: 'streak3', name: 'On a Roll', description: '3-day study streak', category: 'streak', tier: 'common',
    check: (s) => (s.longestStreak ?? 0) >= 3 },
  { id: 'streak7', name: 'Weekly Warrior', description: '7-day study streak', category: 'streak', tier: 'uncommon',
    check: (s) => (s.longestStreak ?? 0) >= 7 },
  { id: 'streak14', name: 'Two Week Streak', description: '14-day study streak', category: 'streak', tier: 'uncommon',
    check: (s) => (s.longestStreak ?? 0) >= 14 },
  { id: 'streak30', name: 'Monthly Master', description: '30-day study streak', category: 'streak', tier: 'rare',
    check: (s) => (s.longestStreak ?? 0) >= 30 },
  { id: 'streak100', name: 'Legendary Streak', description: '100-day study streak', category: 'streak', tier: 'epic',
    bonusItems: { 'rare-candy': 1 },
    check: (s) => (s.longestStreak ?? 0) >= 100 },
];

function uniqueCaught(s: PokeRemGameState): number {
  const dex = s.collectionDex;
  if (!dex || typeof dex !== 'object') return 0;
  return Object.values(dex).filter((n) => typeof n === 'number' && n > 0).length;
}

export interface AchievementState {
  [key: string]: boolean;
}

export function deriveAchievements(state: PokeRemGameState): AchievementState {
  const result: AchievementState = { ...(state.achievements ?? {}) };
  for (const def of ACHIEVEMENT_DEFS) {
    if (!result[def.id]) {
      result[def.id] = def.check(state);
    }
  }
  // Keep legacy fields for backwards compat
  result.firstCatch = result.firstCatch || result.catch1 || false;
  result.firstLevelUp = result.firstLevelUp || false;
  result.reviewed25 = result.reviewed25 || result.review25 || false;
  result.reviewed100 = result.reviewed100 || result.review100 || false;
  return result;
}

/** Locked achievement with progress — highest fill ratio first (what to push on next). */
/** Achievements whose condition is met but rewards not yet claimed. */
export function getUnclaimedAchievements(state: PokeRemGameState): AchievementDef[] {
  const claimed = new Set(state.claimedAchievementIds ?? []);
  return ACHIEVEMENT_DEFS.filter((d) => state.achievements[d.id] && !claimed.has(d.id));
}

/** Every catalog achievement is unlocked and its reward has been claimed (Progress tab attention can turn off). */
export function allAchievementRewardsClaimed(state: PokeRemGameState): boolean {
  const claimed = new Set(state.claimedAchievementIds ?? []);
  for (const d of ACHIEVEMENT_DEFS) {
    if (!state.achievements[d.id]) return false;
    if (!claimed.has(d.id)) return false;
  }
  return true;
}

export function getClosestAchievementGoal(state: PokeRemGameState): {
  def: AchievementDef;
  current: number;
  target: number;
  ratio: number;
} | null {
  let best: { def: AchievementDef; current: number; target: number; ratio: number } | null = null;
  for (const def of ACHIEVEMENT_DEFS) {
    if (state.achievements[def.id]) continue;
    if (!def.progress) continue;
    const p = def.progress(state);
    if (p.target <= 0) continue;
    const ratio = Math.min(1, p.current / p.target);
    if (ratio >= 1) continue;
    if (!best || ratio > best.ratio) {
      best = { def, current: p.current, target: p.target, ratio };
    }
  }
  return best;
}
