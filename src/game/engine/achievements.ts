import { formatCoins } from '../../ui/format/coins';
import { BALANCE } from '../balance';
import type { ItemId } from '../data/items';
import { ITEM_BY_ID } from '../data/items';
import type { OwnedPokemon, PokeRemGameState } from '../state/model';
import { isPerfectIVs } from './pokemonStats';
import { SPECIES_LIST } from '../data/species';

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

export type AchievementBucket = 'daily' | 'milestone' | 'prestige';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category:
    | 'review' | 'collection' | 'battle' | 'pokemon'
    | 'economy' | 'streak' | 'trainer' | 'generation' | 'prestige';
  tier: AchievementTier;
  /** Grouping bucket for ProgressScreen. Derived from tier if absent. */
  bucket?: AchievementBucket;
  /** Optional prestige badge id awarded on claim (persisted in `state.prestigeBadges`). */
  prestigeBadgeId?: string;
  /** Extra bag items granted once when unlocked (on top of tier trainer XP). */
  bonusItems?: Partial<Record<ItemId, number>>;
  /** If set, replaces tier-based trainer XP for this achievement. */
  trainerXpOverride?: number;
  check: (state: PokeRemGameState) => boolean;
  progress?: (state: PokeRemGameState) => { current: number; target: number };
}

export function achievementBucket(def: AchievementDef): AchievementBucket {
  if (def.bucket) return def.bucket;
  if (def.tier === 'epic') return 'prestige';
  if (def.tier === 'common') return 'daily';
  return 'milestone';
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
  const parts: string[] = [`+${formatCoins(achievementCoinReward(def))}`, `+${xp} trainer XP`];
  for (const [id, n] of Object.entries(items)) {
    if (!n || n <= 0) continue;
    const meta = ITEM_BY_ID.get(id as ItemId);
    parts.push(`${n}× ${meta?.name ?? id}`);
  }
  return parts.join(' · ');
}

/** Eight badges for trainer-battle wins; names follow their gym's type. */
export const GYM_BADGES: { name: string; wins: number }[] = [
  { name: 'Pebble', wins: 1 },
  { name: 'Ripple', wins: 3 },
  { name: 'Spark', wins: 6 },
  { name: 'Bloom', wins: 10 },
  { name: 'Toxin', wins: 15 },
  { name: 'Mind', wins: 21 },
  { name: 'Ember', wins: 28 },
  { name: 'Quake', wins: 36 },
];

/** Galarian bird species registered in the Pokédex. */
const birdCount = (s: PokeRemGameState) => [10169, 10170, 10171].filter((d) => (s.collectionDex?.[d] ?? 0) > 0).length;
/** Level of your starter (Buddy), or 0. */
const buddyLevel = (s: PokeRemGameState) =>
  s.starterId ? ([...s.party, ...s.storagePokemon].find((p) => p.id === s.starterId)?.level ?? 0) : 0;

/** Coins for claiming an achievement (by tier). */
export function achievementCoinReward(def: AchievementDef): number {
  return BALANCE.achievementCoins[def.tier];
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
    check: (s) => ownedCount(s) >= 2 },
  { id: 'catch5', name: 'Beginner Collector', description: 'Register 5 species in your Pokédex', category: 'collection', tier: 'uncommon',
    check: (s) => uniqueCaught(s) >= 5, progress: (s) => ({ current: Math.min(uniqueCaught(s), 5), target: 5 }) },
  { id: 'catch25', name: 'Pokemon Collector', description: 'Register 25 species in your Pokédex', category: 'collection', tier: 'uncommon',
    check: (s) => uniqueCaught(s) >= 25, progress: (s) => ({ current: Math.min(uniqueCaught(s), 25), target: 25 }) },
  { id: 'catch50', name: 'Avid Collector', description: 'Register 50 species in your Pokédex', category: 'collection', tier: 'rare',
    check: (s) => uniqueCaught(s) >= 50, progress: (s) => ({ current: Math.min(uniqueCaught(s), 50), target: 50 }) },
  { id: 'catch100', name: 'Master Collector', description: 'Register 100 species in your Pokédex', category: 'collection', tier: 'rare',
    check: (s) => uniqueCaught(s) >= 100, progress: (s) => ({ current: Math.min(uniqueCaught(s), 100), target: 100 }) },
  { id: 'catch151', name: 'Kanto Complete', description: 'Register 151 species in your Pokédex', category: 'collection', tier: 'epic',
    bonusItems: { 'rare-candy': 1, 'ultra-ball': 3 },
    check: (s) => uniqueCaught(s) >= 151, progress: (s) => ({ current: Math.min(uniqueCaught(s), 151), target: 151 }) },
  { id: 'catch500', name: 'Living Pokedex', description: 'Register 500 species in your Pokédex', category: 'collection', tier: 'epic',
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
    check: (s) => ownedMons(s).some((p) => p.level >= 25) },
  { id: 'level50', name: 'Veteran Trainer', description: 'Reach Lv50 with any Pokemon', category: 'pokemon', tier: 'rare',
    check: (s) => ownedMons(s).some((p) => p.level >= 50) },
  { id: 'level100', name: 'Max Level', description: 'Reach Lv100 with any Pokemon', category: 'pokemon', tier: 'epic',
    bonusItems: { 'rare-candy': 2 },
    check: (s) => ownedMons(s).some((p) => p.level >= 100) },
  { id: 'fullParty', name: 'Full Party', description: 'Fill all 6 party slots', category: 'pokemon', tier: 'uncommon',
    check: (s) => s.party.length >= 6 },
  { id: 'firstEvolution', name: 'Evolution!', description: 'Evolve a Pokemon for the first time', category: 'pokemon', tier: 'uncommon',
    check: (s) => (s.totalEvolutions ?? 0) >= 1 },
  { id: 'storage10', name: 'Pokemon Hoarder', description: 'Have 10+ Pokemon in storage', category: 'pokemon', tier: 'uncommon',
    check: (s) => s.storagePokemon.length >= 10 },

  // Economy
  // Money milestones re-targeted to the 1.6.0 income (SPEC B5). Unlocks are sticky, so anyone past the old
  // thresholds keeps them.
  { id: 'earn1000', name: 'First Savings', description: 'Earn ₽5,000 total', category: 'economy', tier: 'common',
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 5000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 5000), target: 5000 }) },
  { id: 'earn5000', name: 'Well Off', description: 'Earn ₽25,000 total', category: 'economy', tier: 'uncommon',
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 25_000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 25_000), target: 25_000 }) },
  { id: 'earn25000', name: 'Wealthy Trainer', description: 'Earn ₽100,000 total', category: 'economy', tier: 'rare',
    bonusItems: { 'ultra-ball': 5 },
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 100_000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 100_000), target: 100_000 }) },
  { id: 'earn100k', name: 'High Roller', description: 'Earn ₽400,000 total', category: 'economy', tier: 'rare',
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 400_000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 400_000), target: 400_000 }) },
  { id: 'earn1m', name: 'Pokémon Tycoon', description: 'Earn ₽1,000,000 total', category: 'economy', tier: 'epic',
    bonusItems: { 'gold-bottle-cap': 1 },
    check: (s) => (s.totalCurrencyEarned ?? 0) >= 1_000_000, progress: (s) => ({ current: Math.min(s.totalCurrencyEarned ?? 0, 1_000_000), target: 1_000_000 }) },
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

  // Trainer battles
  { id: 'trainer_first_win', name: 'First Trainer Down', description: 'Win your first trainer battle', category: 'trainer', tier: 'common',
    check: (s) => (s.trainerBattleStats?.totalWon ?? 0) >= 1 },
  { id: 'trainer_win5', name: 'Battle Regular', description: 'Win 5 trainer battles', category: 'trainer', tier: 'uncommon',
    bonusItems: { 'xp-doubler-common': 1 },
    check: (s) => (s.trainerBattleStats?.totalWon ?? 0) >= 5,
    progress: (s) => ({ current: Math.min(s.trainerBattleStats?.totalWon ?? 0, 5), target: 5 }) },
  { id: 'trainer_win25', name: 'Ace Challenger', description: 'Win 25 trainer battles', category: 'trainer', tier: 'rare',
    bonusItems: { 'xp-doubler-rare': 1 },
    check: (s) => (s.trainerBattleStats?.totalWon ?? 0) >= 25,
    progress: (s) => ({ current: Math.min(s.trainerBattleStats?.totalWon ?? 0, 25), target: 25 }) },
  { id: 'trainer_elite3', name: 'Elite Slayer', description: 'Defeat 3 elite trainers', category: 'trainer', tier: 'rare',
    bonusItems: { 'ultra-ball': 3 },
    check: (s) => (s.trainerBattleStats?.eliteWon ?? 0) >= 3,
    progress: (s) => ({ current: Math.min(s.trainerBattleStats?.eliteWon ?? 0, 3), target: 3 }) },
  { id: 'trainer_streak5', name: 'On Fire', description: 'Win 5 trainer battles in a row', category: 'trainer', tier: 'rare',
    check: (s) => (s.trainerBattleStats?.longestWinStreak ?? 0) >= 5,
    progress: (s) => ({ current: Math.min(s.trainerBattleStats?.longestWinStreak ?? 0, 5), target: 5 }) },
  { id: 'trainer_champion', name: 'Champion Scholar', description: 'Win 100 trainer battles total', category: 'trainer', tier: 'epic',
    bucket: 'prestige', prestigeBadgeId: 'champion_scholar',
    bonusItems: { 'xp-doubler-legendary': 1 },
    check: (s) => (s.trainerBattleStats?.totalWon ?? 0) >= 100,
    progress: (s) => ({ current: Math.min(s.trainerBattleStats?.totalWon ?? 0, 100), target: 100 }) },

  // Generation completion (rewarding prestige)
  { id: 'gen1_complete', name: 'Kanto Champion', description: 'Catch every Pokémon in Gen 1', category: 'generation', tier: 'epic',
    bucket: 'prestige', prestigeBadgeId: 'gen1_complete',
    bonusItems: { 'xp-doubler-legendary': 1, 'ultra-ball': 5 },
    check: (s) => generationCompleted(s, 1),
    progress: (s) => generationProgress(s, 1) },
  { id: 'gen2_complete', name: 'Johto Champion', description: 'Catch every Pokémon in Gen 2', category: 'generation', tier: 'epic',
    bucket: 'prestige', prestigeBadgeId: 'gen2_complete',
    bonusItems: { 'xp-doubler-legendary': 1, 'ultra-ball': 5 },
    check: (s) => generationCompleted(s, 2),
    progress: (s) => generationProgress(s, 2) },
  { id: 'gen3_complete', name: 'Hoenn Champion', description: 'Catch every Pokémon in Gen 3', category: 'generation', tier: 'epic',
    bucket: 'prestige', prestigeBadgeId: 'gen3_complete',
    bonusItems: { 'xp-doubler-legendary': 1, 'ultra-ball': 5 },
    check: (s) => generationCompleted(s, 3),
    progress: (s) => generationProgress(s, 3) },
  { id: 'all_gens_complete', name: 'Living Legend', description: 'Complete every enabled generation', category: 'generation', tier: 'epic',
    bucket: 'prestige', prestigeBadgeId: 'all_gens_complete',
    bonusItems: { 'xp-doubler-legendary': 2, 'ultra-ball': 10 },
    check: (s) => allEnabledGenerationsCompleted(s) },

  // Trainer-level prestige
  { id: 'trainer_level25', name: 'Trainer Lv25', description: 'Reach trainer level 25', category: 'prestige', tier: 'uncommon',
    check: (s) => (s.trainerLevel ?? 1) >= 25,
    progress: (s) => ({ current: Math.min(s.trainerLevel ?? 1, 25), target: 25 }) },
  { id: 'trainer_level50', name: 'Trainer Lv50', description: 'Reach trainer level 50', category: 'prestige', tier: 'rare',
    bonusItems: { 'xp-doubler-rare': 1 },
    check: (s) => (s.trainerLevel ?? 1) >= 50,
    progress: (s) => ({ current: Math.min(s.trainerLevel ?? 1, 50), target: 50 }) },
  // The trainer level cap is 50, so the old "Lv100" goal is now the end-game legend goal (same id and badge).
  { id: 'trainer_level100', name: 'Pokémon Legend', description: 'Reach trainer Lv50 with six Pokémon at Lv50 or higher', category: 'prestige', tier: 'epic',
    bucket: 'prestige', prestigeBadgeId: 'trainer_level100',
    bonusItems: { 'xp-doubler-legendary': 1 },
    check: (s) => (s.trainerLevel ?? 1) >= 50 && ownedMons(s).filter((p) => p.level >= 50).length >= 6,
    progress: (s) => ({ current: Math.min(6, ownedMons(s).filter((p) => p.level >= 50).length), target: 6 }) },

  // Collection goals beyond the Dex
  { id: 'shiny1', name: 'Something Sparkly', description: 'Own a shiny Pokémon', category: 'collection', tier: 'rare',
    check: (s) => shinyCount(s) >= 1, progress: (s) => ({ current: Math.min(shinyCount(s), 1), target: 1 }) },
  { id: 'shiny5', name: 'Shiny Hunter', description: 'Own 5 shiny Pokémon', category: 'collection', tier: 'epic',
    bonusItems: { 'ultra-ball': 5 },
    check: (s) => shinyCount(s) >= 5, progress: (s) => ({ current: Math.min(shinyCount(s), 5), target: 5 }) },
  { id: 'perfect1', name: 'Hundo!', description: 'Own a Pokémon with perfect IVs', category: 'collection', tier: 'uncommon',
    check: (s) => perfectCount(s) >= 1, progress: (s) => ({ current: Math.min(perfectCount(s), 1), target: 1 }) },
  { id: 'perfect10', name: 'Perfectionist', description: 'Own 10 Pokémon with perfect IVs', category: 'collection', tier: 'rare',
    bonusItems: { 'rare-candy': 1 },
    check: (s) => perfectCount(s) >= 10, progress: (s) => ({ current: Math.min(perfectCount(s), 10), target: 10 }) },
  // 1.6.0: Team Rocket, transfers, themes, Galarian birds and your Buddy
  { id: 'rocket_grunt1', name: 'Rocket Buster', description: 'Beat a Team Rocket grunt', category: 'trainer', tier: 'uncommon',
    check: (s) => (s.rocket?.totalGruntWins ?? 0) >= 1, progress: (s) => ({ current: Math.min(s.rocket?.totalGruntWins ?? 0, 1), target: 1 }) },
  { id: 'rocket_grunt18', name: 'Rocket Sweeper', description: 'Beat 18 Team Rocket grunts', category: 'trainer', tier: 'rare',
    check: (s) => (s.rocket?.totalGruntWins ?? 0) >= 18, progress: (s) => ({ current: Math.min(s.rocket?.totalGruntWins ?? 0, 18), target: 18 }) },
  { id: 'rocket_leader', name: 'Rocket Badge', description: 'Beat the Rocket Leader', category: 'trainer', tier: 'rare',
    prestigeBadgeId: 'rocket_badge',
    check: (s) => (s.rocket?.leaderWins ?? 0) >= 1, progress: (s) => ({ current: Math.min(s.rocket?.leaderWins ?? 0, 1), target: 1 }) },
  { id: 'transfer1', name: 'Professor’s Helper', description: 'Transfer a Pokémon', category: 'pokemon', tier: 'common',
    check: (s) => (s.totalTransferred ?? 0) >= 1, progress: (s) => ({ current: Math.min(s.totalTransferred ?? 0, 1), target: 1 }) },
  { id: 'transfer100', name: 'Bulk Shipper', description: 'Transfer 100 Pokémon', category: 'pokemon', tier: 'rare',
    check: (s) => (s.totalTransferred ?? 0) >= 100, progress: (s) => ({ current: Math.min(s.totalTransferred ?? 0, 100), target: 100 }) },
  { id: 'theme1', name: 'Fresh Look', description: 'Buy a type theme', category: 'economy', tier: 'uncommon',
    check: (s) => (s.themesOwned?.length ?? 0) >= 1, progress: (s) => ({ current: Math.min(s.themesOwned?.length ?? 0, 1), target: 1 }) },
  { id: 'theme18', name: 'Every Colour', description: 'Own all 18 type themes', category: 'economy', tier: 'epic',
    check: (s) => (s.themesOwned?.length ?? 0) >= 18, progress: (s) => ({ current: Math.min(s.themesOwned?.length ?? 0, 18), target: 18 }) },
  { id: 'bird1', name: 'Galarian Sighting', description: 'Catch a Galarian legendary bird', category: 'collection', tier: 'rare',
    check: (s) => birdCount(s) >= 1, progress: (s) => ({ current: Math.min(birdCount(s), 1), target: 1 }) },
  { id: 'bird3', name: 'Trio of Legends', description: 'Register all three Galarian birds', category: 'collection', tier: 'epic',
    check: (s) => birdCount(s) >= 3, progress: (s) => ({ current: Math.min(birdCount(s), 3), target: 3 }) },
  { id: 'buddy50', name: 'Best Buddies', description: 'Raise your Buddy to Lv50', category: 'pokemon', tier: 'rare',
    check: (s) => buddyLevel(s) >= 50, progress: (s) => ({ current: Math.min(buddyLevel(s), 50), target: 50 }) },
  { id: 'type_specialist', name: 'Type Specialist', description: 'Register 30 species of one type', category: 'collection', tier: 'rare',
    check: (s) => bestTypeCount(s) >= 30, progress: (s) => ({ current: Math.min(bestTypeCount(s), 30), target: 30 }) },

  // Gym badges: trainer-battle milestones
  ...GYM_BADGES.map((b, i): AchievementDef => ({
    id: `badge_${i + 1}`, name: `${b.name} Badge`, description: `Win ${b.wins} trainer battle${b.wins === 1 ? '' : 's'}`,
    category: 'trainer', tier: i < 2 ? 'common' : i < 5 ? 'uncommon' : i < 7 ? 'rare' : 'epic',
    bucket: i === 7 ? 'prestige' : 'milestone', prestigeBadgeId: `badge_${i + 1}`,
    bonusItems: i === 7 ? { 'rare-candy': 2 } : undefined,
    check: (s) => trainerWins(s) >= b.wins,
    progress: (s) => ({ current: Math.min(trainerWins(s), b.wins), target: b.wins }),
  })),
];

function ownedMons(s: PokeRemGameState): OwnedPokemon[] {
  return [...(s.party ?? []), ...(s.storagePokemon ?? [])];
}

function shinyCount(s: PokeRemGameState): number {
  return ownedMons(s).filter((p) => p.shiny).length;
}

function perfectCount(s: PokeRemGameState): number {
  return ownedMons(s).filter((p) => isPerfectIVs(p.ivs)).length;
}

function trainerWins(s: PokeRemGameState): number {
  return s.trainerBattleStats?.totalWon ?? 0;
}

function bestTypeCount(s: PokeRemGameState): number {
  const counts = new Map<string, number>();
  for (const sp of SPECIES_LIST) {
    if ((s.collectionDex?.[sp.dexNum] ?? 0) <= 0) continue;
    for (const t of sp.types) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

function speciesCountForGen(gen: number): number {
  return SPECIES_LIST.filter((sp) => sp.generation === gen).length;
}

function caughtCountForGen(state: PokeRemGameState, gen: number): number {
  const dex = state.collectionDex ?? {};
  let n = 0;
  for (const sp of SPECIES_LIST) {
    if (sp.generation !== gen) continue;
    if ((dex[sp.dexNum] ?? 0) > 0) n++;
  }
  return n;
}

export function generationProgress(state: PokeRemGameState, gen: number): { current: number; target: number } {
  const target = speciesCountForGen(gen);
  return { current: Math.min(caughtCountForGen(state, gen), target), target };
}

export function generationCompleted(state: PokeRemGameState, gen: number): boolean {
  const total = speciesCountForGen(gen);
  if (total <= 0) return false;
  return caughtCountForGen(state, gen) >= total;
}

function enabledGensFromState(state: PokeRemGameState): number[] {
  const raw = (state as unknown as { enabledGenerations?: number[] }).enabledGenerations;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  return [1];
}

export function allEnabledGenerationsCompleted(state: PokeRemGameState): boolean {
  const gens = enabledGensFromState(state);
  return gens.every((g) => generationCompleted(state, g));
}

/** Pokémon you own. The starter is the only one you don't catch, so a second means a first catch. */
function ownedCount(s: PokeRemGameState): number {
  return (s.party?.length ?? 0) + (s.storagePokemon?.length ?? 0) + (s.pendingCaughtMon ? 1 : 0);
}

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
