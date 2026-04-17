import type { ItemId } from '../data/items';
import type { PokemonType } from '../data/species';
import type { StudyDifficultyPreset } from '../engine/studyDifficulty';

/** Shown in battle HUD when a Route Find triggers (travel discovery or post-battle scrap). */
export type RouteFindSource = 'travel' | 'scrap';

export interface RouteFindNoticePayload {
  itemId: ItemId;
  quantity: number;
  headline: string;
  subline: string;
  source: RouteFindSource;
}

export type SectionTab = 'status' | 'battle' | 'party' | 'bag' | 'shop' | 'dex' | 'progress' | 'types' | 'rewards';

/** Last explicit battle UX result (spawn, catch, run, combat exchange, etc.). */
export type BattleOutcomeKind =
  | 'none'
  | 'spawn'
  | 'catch_success'
  | 'catch_fail'
  | 'no_balls'
  | 'defeat'
  | 'combat'
  | 'faint'
  | 'run'
  | 'evolution';

/**
 * Last exchange in turn-based combat — strike VFX, damage floats, effectiveness chips, and log accent.
 * Extra fields are optional for older saves; normalized in {@link parseGameState}.
 */
export interface CombatStrikeSnapshot {
  playerMoveId: string;
  wildMoveId: string;
  playerDamage?: number;
  wildDamage?: number;
  /** Raw type-chart multiplier vs defender (0 = immune, 0.5 = resist, 1, 2, 4). */
  playerEffectiveness?: number;
  wildEffectiveness?: number;
  /** True when the player’s attack ended the wild encounter (KO — no wild counter). */
  wildDefeated?: boolean;
}

export interface OwnedPokemon {
  id: string;
  dexNum: number;
  name: string;
  nickname?: string;
  level: number;
  totalXp: number;
  currentHp: number;
  maxHp: number;
  types: PokemonType[];
  moves?: string[];
  everstone?: boolean;
  shiny?: boolean;
}

export interface EncounterPokemon {
  dexNum: number;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  types: PokemonType[];
  tier?: string;
  /** Rare palette swap (~1/1000). */
  shiny?: boolean;
}

export interface AchievementState {
  [key: string]: boolean;
}

export type MainNoticeKind = 'achievement_unlock' | 'trainer_reward';

/** Dismissible main-UI notice (synced); reward remains claimable in Progress / Rewards. */
export interface MainNoticeItem {
  kind: MainNoticeKind;
  id: string;
  title: string;
  subtitle: string;
}

/** Persisted game state. User-facing product name: PokéRem (`BRAND.wordmark` in `designTokens.ts`). */
export interface PokeRemGameState {
  schemaVersion: 3;
  lastUpdatedAt: number;
  starterChosen: boolean;
  activePokemonId: string | null;
  party: OwnedPokemon[];
  storagePokemon: OwnedPokemon[];
  cardsReviewed: number;
  encounterProgress: number;
  currentEncounter: EncounterPokemon | null;
  /** Short feedback line after spawn / catch miss / catch / defeat / run (simplified encounters). */
  lastBattleLog: string;
  /** Drives outcome styling + animation ticks in the review battle UI. */
  lastOutcomeKind: BattleOutcomeKind;
  /** Increments on each outcome-changing battle event so UI can animate without string compare. */
  battleFeedbackSeq: number;
  /**
   * Latest combat exchange metadata (`combat` / `faint` / KO `defeat` with finisher). Cleared on other outcomes.
   * Optional fields on the snapshot may be absent in older saves; normalized on load.
   */
  lastCombatStrike: CombatStrikeSnapshot | null;
  collectionDex: Record<number, number>;
  bag: Record<ItemId, number>;
  achievements: AchievementState;
  /** Achievement IDs whose trainer XP / bag rewards have been claimed (see {@link claimAchievement}). */
  claimedAchievementIds: string[];
  selectedTab: SectionTab;
  totalDefeated: number;
  totalCaught: number;
  totalRuns: number;
  totalEvolutions: number;
  currency: number;
  totalCurrencyEarned: number;
  totalShopPurchases: number;
  lastStudyDate: string;
  currentStreak: number;
  longestStreak: number;
  trainerRank: string;
  trainerXp: number;
  trainerLevel: number;
  claimedRewardLevels: number[];
  /**
   * Study pacing: after onboarding, these drive encounter rate + per-review XP/coins (see pipeline).
   * When `studyDifficultyConfigured` is false, the pipeline falls back to RemNote plugin settings.
   */
  studyDifficultyPreset: StudyDifficultyPreset;
  studyReviewsPerEncounter: number;
  studyCardWeight: number;
  studyDifficultyConfigured: boolean;
  /** Team Aqua battle background index; advances each new encounter (see BATTLE_SCENE_COUNT). */
  battleSceneIndex: number;
  /** Resets by calendar day (UTC); used for “today” recap in Status. */
  dailyStats?: {
    date: string;
    reviews: number;
    encounters: number;
    catches: number;
  };
  /**
   * Fractional progress toward the next wild encounter when review weight is below 1 (see
   * plugin setting). Whole units roll into encounter progress.
   */
  wildReviewAccum?: number;
  /**
   * After a successful catch with a full party (6/6), the new Pokémon waits here until
   * the player picks a party member to send to storage.
   */
  pendingCaughtMon?: OwnedPokemon | null;
  /**
   * Route Finds — hidden progress toward an exploration item drop while reviewing (no wild active).
   * Separate from {@link encounterProgress}; typically needs more reviews per trigger.
   */
  routeFindProgress?: number;
  /** Fractional route-find progress when review weight &lt; 1 (mirrors wildReviewAccum). */
  routeFindReviewAccum?: number;
  /** Increments on each Route Find for HUD animation. */
  routeFindNoticeSeq?: number;
  /** Last banner/toast sequence the user dismissed or auto-cleared (synced; survives tab remounts). */
  routeFindNoticeAckSeq?: number;
  /** Latest find banner payload (replaced each new find). */
  routeFindNotice?: RouteFindNoticePayload | null;
  /**
   * Fractional passive heal carry per party index (aligned with `party` order).
   * Used so per-card healing matches encounter cadence (see `applyStudyHealFromCard`).
   */
  studyHealCarries?: number[];
  /** Main battle chrome — achievement / trainer reward prompts (dismiss hides only this banner). */
  mainNoticeQueue?: MainNoticeItem[];
}
