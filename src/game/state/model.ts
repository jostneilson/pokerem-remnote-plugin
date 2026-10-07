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

export type MainNoticeKind = 'achievement_unlock' | 'trainer_reward' | 'trainer_battle_result';

/** Dismissible main-UI notice (synced); reward remains claimable in Progress / Rewards. */
export interface MainNoticeItem {
  kind: MainNoticeKind;
  id: string;
  title: string;
  subtitle: string;
}

// ── v4 additions ────────────────────────────────────────────────────────────

/** Tier of an XP Doubler consumable; controls how many cards of x2 XP it grants. */
export type XpDoublerTier = 'common' | 'rare' | 'legendary';

/** A single XP Doubler instance — either active (counting down) or queued. */
export interface XpDoublerEntry {
  tier: XpDoublerTier;
  /** Cards of XP-paying review remaining for this doubler. */
  cardsRemaining: number;
  /** Total cards this doubler was created with (for progress display). */
  cardsTotal: number;
}

/** Trainer battle phases — drives UI gating in `BattleReviewSurface`. */
export type TrainerBattlePhase = 'team_select' | 'active' | 'post_win' | 'post_loss';

export type TrainerTier = 'standard' | 'elite';

/** A trainer's identity card — display + flavor + theme. */
export interface TrainerIdentity {
  /** Stable archetype id (e.g. `bug_catcher`, `gym_leader_psychic`). */
  archetypeId: string;
  /** Display name of the trainer class (e.g. "Bug Catcher", "Psychic Adept"). */
  className: string;
  /** Optional short proper-name flair (e.g. "Wes", "Linda"). */
  displayName?: string;
  /** Theme types — used for elite glow tinting and flavor only. */
  themeTypes: PokemonType[];
  /** Short pre-battle taunt line. */
  taunt: string;
  /** Short on-defeat (player wins) line. */
  defeatLine: string;
  /** Short on-victory (player loses) line. */
  victoryLine: string;
}

/** One enemy slot in a trainer battle. Mirrors `EncounterPokemon` shape but adds `defeated`. */
export interface TrainerEnemyMon {
  dexNum: number;
  name: string;
  level: number;
  maxHp: number;
  currentHp: number;
  types: PokemonType[];
  /** Move ids the enemy can use — chosen at generation time. */
  moves: string[];
  /** Set true after this enemy is KO'd. */
  defeated?: boolean;
}

/** Reward bundle granted on trainer battle victory (mirrored on `rewardSnapshot`). */
export interface TrainerRewardSnapshot {
  coins: number;
  trainerXp: number;
  /** Bag items (count per id) added on victory. */
  items: Partial<Record<string, number>>;
  /** XP Doubler tier granted on victory, if any (rolled separately from `items`). */
  xpDoublerTier?: XpDoublerTier;
  /** Headline summary string for the post-win banner. */
  headline: string;
}

/** Persisted trainer battle state — exists only while a trainer battle is in progress. */
export interface TrainerBattleState {
  /** Stable id for this battle instance — used for notice de-dupe. */
  id: string;
  phase: TrainerBattlePhase;
  tier: TrainerTier;
  trainer: TrainerIdentity;
  /** Always 3 enemies, in send-out order. */
  enemies: TrainerEnemyMon[];
  /** Index into `enemies` of the active opposing Pokémon. */
  activeEnemyIndex: number;
  /** Locked-in party Pokémon ids (3) — set during `team_select` lock-in. */
  selectedPartyIds: string[];
  /** Party ids that fainted in this trainer battle (no switching back in). */
  faintedSelectedIds: string[];
  /** True after the player wins; false otherwise. Drives the catch offer. */
  catchOfferActive: boolean;
  /** True once the catch attempt has been made (success or fail). */
  catchOfferClaimed: boolean;
  /** Reward summary, populated on victory. */
  rewardSnapshot?: TrainerRewardSnapshot;
  /** Last short combat narration line specific to this battle. */
  lastLog?: string;
  /** Bumped on each turn so UI can animate damage / KOs. */
  feedbackSeq: number;
}

/** Aggregate trainer-battle stats — drives identity overlay + achievements. */
export interface TrainerBattleStats {
  standardWon: number;
  standardLost: number;
  eliteWon: number;
  eliteLost: number;
  totalWon: number;
  /** Consecutive wins without a loss (resets on any loss). */
  currentWinStreak: number;
  /** Best-ever consecutive trainer-battle win streak. */
  longestWinStreak: number;
}

/** Persisted game state. User-facing product name: PokéRem (`BRAND.wordmark` in `designTokens.ts`). */
export interface PokeRemGameState {
  schemaVersion: 4;
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
  // ── v4 (1.2.0) additions — all optional with safe defaults in `parseGameStateCore` ──
  /** Active XP Doubler counting down — null when no booster is active. */
  xpBoosterActive?: XpDoublerEntry | null;
  /** Queued XP Doublers — pulled into `xpBoosterActive` when the active one expires. */
  xpBoosterQueue?: XpDoublerEntry[];
  /** Cards reviewed since last trainer battle (only ticks when starter + difficulty configured). */
  trainerBattleCounter?: number;
  /** Active trainer battle — null when no trainer battle is in progress. */
  currentTrainerBattle?: TrainerBattleState | null;
  /** Aggregate trainer-battle stats; used by identity overlay + achievements. */
  trainerBattleStats?: TrainerBattleStats;
  /** Earned prestige badges (e.g. `gen1_complete`, `all_gens_complete`). String-only for forward-compat. */
  prestigeBadges?: string[];
  /** Most recent PokéRem version the user has acknowledged in the in-plugin "What's New" card. */
  whatsNewSeenVersion?: string;
}
