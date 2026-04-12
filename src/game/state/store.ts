import { ITEM_BY_ID, STARTING_BAG, type ItemId } from '../data/items';
import { SPECIES_BY_DEX } from '../data/species';
import { STARTER_DEX_ALL } from '../data/pokedex';
import {
  ACHIEVEMENT_DEFS,
  achievementItemBonus,
  achievementTrainerXpReward,
  deriveAchievements,
} from '../engine/achievements';
import { nextCatchBallForBag, spawnEncounter, tryCatch, wildCatchChancePreview } from '../engine/encounters';
import { checkLevelEvolution, applyEvolution } from '../engine/evolution';
import { checkLearnMoves, dedupeMoveIds, getInitialMoves, movesetForBattle, pickDefaultBattleMove } from '../engine/moveLearn';
import { CURRENCY_REWARDS, ULTRA_BALL_UNLOCK_LEVEL } from '../engine/shop';
import { getEffectiveness } from '../data/typeChart';
import { computeTrainerRank } from '../engine/trainerRank';
import { levelFromXp, maxHpFor, xpToNextLevel, XP_PER_LEVEL } from '../engine/progression';
import { xpFromPlayerAttack, xpFromTakingHit } from '../engine/combatXp';
import {
  clampStudyReviews,
  clampStudyWeight,
  STUDY_PRESET_DEFAULTS,
  type StudyDifficultyPreset,
} from '../engine/studyDifficulty';
import { REVIEWS_PER_ENCOUNTER, ROUTE_FIND_REVIEWS_DEFAULT, XP_ON_DEFEAT } from '../constants';
import { trainerLevelFromXp, TRAINER_XP_SOURCES, TRAINER_REWARDS } from '../engine/trainerLevel';
import { BATTLE_SCENE_COUNT, normalizeBattleSceneIndex } from '../engine/battleAmbience';
import { rollPostBattleScrap, rollTravelRouteFind, type RouteFindRollResult } from '../engine/routeFinds';
import {
  damageForMove,
  moveDisplayName,
  pickWildCounterMove,
} from '../engine/combatExchange';
import { MOVES } from '../data/moves';
import type {
  PokeRemGameState,
  BattleOutcomeKind,
  CombatStrikeSnapshot,
  EncounterPokemon,
  OwnedPokemon,
  SectionTab,
} from './model';

function sanitizeEncounterHp(enc: EncounterPokemon): EncounterPokemon {
  const maxHp = Math.max(1, Math.floor(enc.maxHp));
  let currentHp =
    typeof enc.currentHp === 'number' && Number.isFinite(enc.currentHp)
      ? Math.floor(enc.currentHp)
      : maxHp;
  currentHp = Math.max(0, Math.min(maxHp, currentHp));
  return { ...enc, maxHp, currentHp };
}

function uid(): string {
  return `pk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function cloneBagDefaults() {
  return { ...STARTING_BAG };
}

export function createInitialStateV3(): PokeRemGameState {
  return {
    schemaVersion: 3,
    lastUpdatedAt: 0,
    starterChosen: false,
    activePokemonId: null,
    party: [],
    storagePokemon: [],
    cardsReviewed: 0,
    encounterProgress: 0,
    currentEncounter: null,
    lastBattleLog: '',
    collectionDex: {},
    bag: cloneBagDefaults(),
    achievements: {
      firstCatch: false,
      firstLevelUp: false,
      reviewed25: false,
      reviewed100: false,
    },
    claimedAchievementIds: [],
    selectedTab: 'status',
    lastOutcomeKind: 'none',
    battleFeedbackSeq: 0,
    totalDefeated: 0,
    totalCaught: 0,
    totalRuns: 0,
    totalEvolutions: 0,
    currency: 0,
    totalCurrencyEarned: 0,
    totalShopPurchases: 0,
    lastStudyDate: '',
    currentStreak: 0,
    longestStreak: 0,
    trainerRank: 'Novice Trainer',
    trainerXp: 0,
    trainerLevel: 1,
    claimedRewardLevels: [],
    studyDifficultyPreset: 'medium',
    studyReviewsPerEncounter: REVIEWS_PER_ENCOUNTER,
    studyCardWeight: 1,
    studyDifficultyConfigured: false,
    battleSceneIndex: 0,
    dailyStats: undefined,
    wildReviewAccum: 0,
    pendingCaughtMon: null,
    routeFindProgress: 0,
    routeFindReviewAccum: 0,
    routeFindNoticeSeq: 0,
    routeFindNoticeAckSeq: 0,
    routeFindNotice: null,
    lastCombatStrike: null,
  };
}

/** @deprecated Prefer {@link createInitialStateV3}; kept for tests and older imports. */
export function createInitialStateV2(): PokeRemGameState {
  return createInitialStateV3();
}

const VALID_OUTCOMES: BattleOutcomeKind[] = [
  'none',
  'spawn',
  'catch_success',
  'catch_fail',
  'no_balls',
  'defeat',
  'combat',
  'faint',
  'run',
  'evolution',
];

function sanitizeOutcomeKind(raw: unknown): BattleOutcomeKind {
  return typeof raw === 'string' && (VALID_OUTCOMES as string[]).includes(raw)
    ? (raw as BattleOutcomeKind)
    : 'none';
}

function bumpBattleOutcome(
  base: PokeRemGameState,
  kind: BattleOutcomeKind,
  lastBattleLog: string,
  lastCombatStrike: CombatStrikeSnapshot | null = null,
): Pick<
  PokeRemGameState,
  'lastBattleLog' | 'lastOutcomeKind' | 'battleFeedbackSeq' | 'lastCombatStrike'
> {
  const seq = typeof base.battleFeedbackSeq === 'number' ? base.battleFeedbackSeq : 0;
  return {
    lastBattleLog,
    lastOutcomeKind: kind,
    battleFeedbackSeq: seq + 1,
    lastCombatStrike,
  };
}

function applyRouteFindToState(state: PokeRemGameState, roll: RouteFindRollResult): PokeRemGameState {
  const bag = { ...state.bag };
  bag[roll.itemId] = (bag[roll.itemId] ?? 0) + roll.quantity;
  return {
    ...state,
    bag,
    routeFindNoticeSeq: (state.routeFindNoticeSeq ?? 0) + 1,
    routeFindNotice: roll.notice,
  };
}

function normalizeOwned(mon: OwnedPokemon): OwnedPokemon {
  const species = SPECIES_BY_DEX.get(mon.dexNum);
  const level = mon.level || levelFromXp(mon.totalXp);
  const maxHp = mon.maxHp || maxHpFor(species?.baseHp ?? 40, level);
  return {
    ...mon,
    name: mon.name || species?.name || `#${mon.dexNum}`,
    types: mon.types?.length ? mon.types : species?.types ?? ['Normal'],
    level,
    maxHp,
    currentHp: Math.min(maxHp, Math.max(0, mon.currentHp ?? maxHp)),
    moves: mon.moves?.length ? dedupeMoveIds(mon.moves) : mon.moves,
    shiny: mon.shiny === true ? true : undefined,
  };
}

function normalizeCollectionDex(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const nk = Number(k);
    if (!Number.isFinite(nk)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[nk] = Math.max(0, Math.floor(v));
  }
  return out;
}

function normalizeDailyStats(raw: unknown): PokeRemGameState['dailyStats'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;
  const date = typeof d.date === 'string' ? d.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return {
    date,
    reviews: typeof d.reviews === 'number' && Number.isFinite(d.reviews) ? Math.max(0, Math.floor(d.reviews)) : 0,
    encounters:
      typeof d.encounters === 'number' && Number.isFinite(d.encounters) ? Math.max(0, Math.floor(d.encounters)) : 0,
    catches: typeof d.catches === 'number' && Number.isFinite(d.catches) ? Math.max(0, Math.floor(d.catches)) : 0,
  };
}

function normalizeCombatStrike(raw: unknown): CombatStrikeSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const p = o.playerMoveId;
  const w = o.wildMoveId;
  if (typeof p !== 'string' || typeof w !== 'string') return null;
  if (!MOVES[p] || !MOVES[w]) return null;
  const out: CombatStrikeSnapshot = { playerMoveId: p, wildMoveId: w };
  const pd = o.playerDamage;
  if (typeof pd === 'number' && Number.isFinite(pd)) out.playerDamage = Math.max(0, Math.floor(pd));
  const wd = o.wildDamage;
  if (typeof wd === 'number' && Number.isFinite(wd)) out.wildDamage = Math.max(0, Math.floor(wd));
  const pe = o.playerEffectiveness;
  if (typeof pe === 'number' && Number.isFinite(pe)) out.playerEffectiveness = pe;
  const we = o.wildEffectiveness;
  if (typeof we === 'number' && Number.isFinite(we)) out.wildEffectiveness = we;
  if (o.wildDefeated === true) out.wildDefeated = true;
  return out;
}

function normalizeRouteFindNotice(raw: unknown): PokeRemGameState['routeFindNotice'] {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Record<string, unknown>;
  const itemId = n.itemId;
  if (typeof itemId !== 'string' || !ITEM_BY_ID.has(itemId as ItemId)) return null;
  const qty = typeof n.quantity === 'number' ? Math.max(1, Math.floor(n.quantity)) : 1;
  const headline = typeof n.headline === 'string' ? n.headline.slice(0, 220) : '';
  const subline = typeof n.subline === 'string' ? n.subline.slice(0, 260) : '';
  const source = n.source === 'scrap' || n.source === 'travel' ? n.source : 'travel';
  if (!headline || !subline) return null;
  return { itemId: itemId as ItemId, quantity: qty, headline, subline, source };
}

function normalizeEncounter(raw: unknown): EncounterPokemon | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const dexNum = typeof e.dexNum === 'number' ? e.dexNum : 16;
  const species = SPECIES_BY_DEX.get(dexNum);
  const name =
    typeof e.name === 'string'
      ? e.name
      : typeof e.displayName === 'string'
        ? (e.displayName as string)
        : species?.name ?? '???';
  const level = typeof e.level === 'number' ? e.level : 2;
  const maxHp =
    typeof e.maxHp === 'number' ? e.maxHp : maxHpFor(species?.baseHp ?? 40, level);
  const currentHp = typeof e.currentHp === 'number' ? e.currentHp : maxHp;
  const types =
    Array.isArray(e.types) && (e.types as unknown[]).length
      ? (e.types as EncounterPokemon['types'])
      : species?.types ?? ['Normal'];
  const tier = typeof e.tier === 'string' ? e.tier : undefined;
  const shiny = e.shiny === true;
  return sanitizeEncounterHp({ dexNum, name, level, maxHp, currentHp, types, tier, shiny });
}

function migrateV1ToV2(v1: any): PokeRemGameState {
  const base = createInitialStateV3();
  const party = (Array.isArray(v1.party) ? v1.party : []).map((p: any) => {
    const species = SPECIES_BY_DEX.get(p.dexNum);
    const totalXp = typeof p.totalXp === 'number' ? p.totalXp : 0;
    const level = levelFromXp(totalXp);
    const maxHp = maxHpFor(species?.baseHp ?? 40, level);
    return normalizeOwned({
      id: p.id ?? uid(),
      dexNum: p.dexNum,
      name: p.displayName ?? species?.name ?? 'Pokemon',
      level,
      totalXp,
      currentHp: maxHp,
      maxHp,
      types: species?.types ?? ['Normal'],
    });
  });

  const collectionDex: Record<number, number> = {};
  for (const c of Array.isArray(v1.collection) ? v1.collection : []) {
    if (typeof c.dexNum === 'number') collectionDex[c.dexNum] = (collectionDex[c.dexNum] ?? 0) + 1;
  }

  return {
    ...base,
    lastUpdatedAt: typeof v1.lastUpdatedAt === 'number' ? v1.lastUpdatedAt : 0,
    starterChosen: !!v1.starterChosen,
    activePokemonId: typeof v1.activePokemonId === 'string' ? v1.activePokemonId : party[0]?.id ?? null,
    party,
    cardsReviewed: typeof v1.cardsReviewed === 'number' ? v1.cardsReviewed : 0,
    encounterProgress: typeof v1.encounterProgress === 'number' ? v1.encounterProgress : 0,
    currentEncounter: normalizeEncounter(v1.currentEncounter),
    collectionDex,
  };
}

function normalizeStudyDifficultyPreset(raw: unknown): StudyDifficultyPreset {
  if (raw === 'easy' || raw === 'medium' || raw === 'hard' || raw === 'custom') return raw;
  return 'medium';
}

function parseGameStateCore(o: any, legacySchema: number): PokeRemGameState {
  const base = createInitialStateV3();
  const claimedRaw = o.claimedAchievementIds;
  const claimedAchievementIds = Array.isArray(claimedRaw)
    ? (claimedRaw as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

  const state: PokeRemGameState = {
    ...base,
    ...o,
    party: Array.isArray(o.party) ? o.party.map(normalizeOwned) : [],
    storagePokemon: Array.isArray(o.storagePokemon) ? o.storagePokemon.map(normalizeOwned) : [],
    bag: { ...cloneBagDefaults(), ...(o.bag ?? {}) },
    achievements: { ...base.achievements, ...(o.achievements ?? {}) },
    claimedAchievementIds,
    selectedTab: (o.selectedTab ?? 'status') as SectionTab,
    lastBattleLog: typeof o.lastBattleLog === 'string' && o.lastBattleLog.length <= 200 ? o.lastBattleLog : '',
    lastOutcomeKind: sanitizeOutcomeKind(o.lastOutcomeKind),
    battleFeedbackSeq: typeof o.battleFeedbackSeq === 'number' ? o.battleFeedbackSeq : 0,
    lastCombatStrike: normalizeCombatStrike(o.lastCombatStrike),
    currentEncounter: normalizeEncounter(o.currentEncounter),
    trainerXp: typeof o.trainerXp === 'number' ? o.trainerXp : 0,
    trainerLevel: typeof o.trainerLevel === 'number' ? o.trainerLevel : trainerLevelFromXp(typeof o.trainerXp === 'number' ? o.trainerXp : 0),
    claimedRewardLevels: Array.isArray(o.claimedRewardLevels) ? o.claimedRewardLevels : [],
    studyDifficultyPreset: normalizeStudyDifficultyPreset(o.studyDifficultyPreset),
    studyReviewsPerEncounter: clampStudyReviews(
      typeof o.studyReviewsPerEncounter === 'number' ? o.studyReviewsPerEncounter : REVIEWS_PER_ENCOUNTER,
    ),
    studyCardWeight: clampStudyWeight(typeof o.studyCardWeight === 'number' ? o.studyCardWeight : 1),
    studyDifficultyConfigured: o.studyDifficultyConfigured === true,
    battleSceneIndex: normalizeBattleSceneIndex(o.battleSceneIndex),
    dailyStats: normalizeDailyStats(o.dailyStats),
    wildReviewAccum:
      typeof o.wildReviewAccum === 'number' && Number.isFinite(o.wildReviewAccum)
        ? Math.max(0, o.wildReviewAccum)
        : 0,
    pendingCaughtMon:
      o.pendingCaughtMon && typeof o.pendingCaughtMon === 'object'
        ? normalizeOwned(o.pendingCaughtMon as OwnedPokemon)
        : null,
    collectionDex: normalizeCollectionDex(o.collectionDex),
    routeFindProgress:
      typeof o.routeFindProgress === 'number' && Number.isFinite(o.routeFindProgress)
        ? Math.max(0, Math.floor(o.routeFindProgress))
        : 0,
    routeFindReviewAccum:
      typeof o.routeFindReviewAccum === 'number' && Number.isFinite(o.routeFindReviewAccum)
        ? Math.max(0, o.routeFindReviewAccum)
        : 0,
    routeFindNoticeSeq: typeof o.routeFindNoticeSeq === 'number' ? o.routeFindNoticeSeq : 0,
    routeFindNoticeAckSeq: typeof o.routeFindNoticeAckSeq === 'number' ? o.routeFindNoticeAckSeq : 0,
    routeFindNotice: normalizeRouteFindNotice(o.routeFindNotice),
    schemaVersion: 3,
  };
  if (state.selectedTab === 'battle') {
    state.selectedTab = 'status';
  }
  state.achievements = deriveAchievements(state);

  if (legacySchema === 2) {
    const unlockedIds = ACHIEVEMENT_DEFS.filter((d) => state.achievements[d.id]).map((d) => d.id);
    state.claimedAchievementIds = unlockedIds;
    state.studyDifficultyPreset = 'medium';
    state.studyReviewsPerEncounter = REVIEWS_PER_ENCOUNTER;
    state.studyCardWeight = 1;
    state.studyDifficultyConfigured = true;
  }

  return state;
}

export function parseGameState(raw: unknown): PokeRemGameState {
  if (!raw || typeof raw !== 'object') return createInitialStateV3();
  const o = raw as any;
  if (o.schemaVersion === 1) {
    let s = migrateV1ToV2(o);
    s.achievements = deriveAchievements(s);
    const unlockedIds = ACHIEVEMENT_DEFS.filter((d) => s.achievements[d.id]).map((d) => d.id);
    return {
      ...s,
      schemaVersion: 3,
      claimedAchievementIds: unlockedIds,
      studyDifficultyPreset: 'medium',
      studyReviewsPerEncounter: REVIEWS_PER_ENCOUNTER,
      studyCardWeight: 1,
      studyDifficultyConfigured: true,
    };
  }
  if (o.schemaVersion === 2) return parseGameStateCore(o, 2);
  if (o.schemaVersion === 3) return parseGameStateCore(o, 3);
  return createInitialStateV3();
}

function addTrainerXp(state: PokeRemGameState, amount: number): PokeRemGameState {
  const trainerXp = (state.trainerXp ?? 0) + amount;
  const trainerLevel = trainerLevelFromXp(trainerXp);
  return { ...state, trainerXp, trainerLevel };
}

function addBagQuantities(state: PokeRemGameState, delta: Partial<Record<ItemId, number>>): PokeRemGameState {
  const keys = Object.keys(delta);
  if (keys.length === 0) return state;
  const bag = { ...state.bag };
  for (const [id, q] of Object.entries(delta)) {
    if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) continue;
    const itemId = id as ItemId;
    if (!ITEM_BY_ID.has(itemId)) continue;
    bag[itemId] = (bag[itemId] ?? 0) + Math.floor(q);
  }
  return { ...state, bag };
}

function withTouch(state: PokeRemGameState): PokeRemGameState {
  const next: PokeRemGameState = { ...state, lastUpdatedAt: Date.now() };
  next.achievements = deriveAchievements(next);
  next.trainerLevel = trainerLevelFromXp(next.trainerXp ?? 0);
  next.trainerRank = computeTrainerRank(next);
  return next;
}

export function setTab(state: PokeRemGameState, tab: SectionTab): PokeRemGameState {
  return withTouch({ ...state, selectedTab: tab });
}

export function chooseStarter(state: PokeRemGameState, dexNum: number): PokeRemGameState {
  if (!(STARTER_DEX_ALL as readonly number[]).includes(dexNum)) return state;
  const species = SPECIES_BY_DEX.get(dexNum);
  if (!species) return state;
  const level = 1;
  const maxHp = maxHpFor(species.baseHp, level);
  const starter: OwnedPokemon = {
    id: uid(),
    dexNum,
    name: species.name,
    level,
    totalXp: 0,
    currentHp: maxHp,
    maxHp,
    types: species.types,
    moves: getInitialMoves(dexNum, level),
  };
  return withTouch({
    ...state,
    starterChosen: true,
    party: [starter],
    activePokemonId: starter.id,
    selectedTab: 'status',
  });
}

export function activePokemon(state: PokeRemGameState): OwnedPokemon | undefined {
  return state.party.find((p) => p.id === state.activePokemonId);
}

function ensureDailyStats(state: PokeRemGameState): PokeRemGameState {
  const today = new Date().toISOString().slice(0, 10);
  const d = state.dailyStats;
  if (!d || d.date !== today) {
    return { ...state, dailyStats: { date: today, reviews: 0, encounters: 0, catches: 0 } };
  }
  return state;
}

/** Options from plugin settings, read in pipeline (not stored in game state). */
export type QueueCardCompleteOptions = {
  /** When true (default), clear battle log on each new card if no encounter is active. */
  autoClearLog?: boolean;
  /**
   * 1 = every review increments wild progress; 2 = every 2nd review counts (slower encounters).
   * Future: RemNote may expose card grades for finer pacing.
   */
  encounterPacingModulo?: number;
  /**
   * Scales per-review Pokécoins, trainer XP, and (on pacing ticks) fractional wild progress.
   * RemNote 0.0.14 does not expose flashcard grades; use plugin settings until then.
   */
  reviewWeight?: number;
  /**
   * Reviews (on the same pacing ticks as wild progress) before a travel Route Find can trigger.
   * Pipeline derives this from encounter rate so finds stay rarer than wild battles.
   */
  routeFindReviewsNeeded?: number;
  /**
   * Wild + route-find progress only: list/enumeration cards count as multiple units when RemNote
   * reports more than one item in a single completion event.
   */
  encounterReviewMultiplier?: number;
};

export function clearBattleLog(state: PokeRemGameState): PokeRemGameState {
  if (!state.lastBattleLog) return state;
  return { ...state, lastBattleLog: '', lastOutcomeKind: 'none', lastCombatStrike: null };
}

/** Marks the current route-find banner as seen (synced). Call after dismiss or auto-hide. */
export function acknowledgeRouteFindNotice(state: PokeRemGameState): PokeRemGameState {
  const seq = state.routeFindNoticeSeq ?? 0;
  if (seq <= (state.routeFindNoticeAckSeq ?? 0)) return state;
  return withTouch({ ...state, routeFindNoticeAckSeq: seq });
}

function updateStreak(state: PokeRemGameState): PokeRemGameState {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastStudyDate === today) return state;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let currentStreak = state.currentStreak ?? 0;

  if (state.lastStudyDate === yesterday) {
    currentStreak += 1;
  } else if (!state.lastStudyDate) {
    currentStreak = 1;
  } else {
    currentStreak = 1;
  }

  const longestStreak = Math.max(state.longestStreak ?? 0, currentStreak);
  return addTrainerXp({ ...state, lastStudyDate: today, currentStreak, longestStreak }, TRAINER_XP_SOURCES.streakDay);
}

export function onQueueCardComplete(
  state: PokeRemGameState,
  enabledGens?: number[],
  encounterRate?: number,
  options?: QueueCardCompleteOptions,
): PokeRemGameState {
  const reviewed = state.cardsReviewed + 1;
  let working = ensureDailyStats(state);
  const d0 = working.dailyStats!;
  working = { ...working, dailyStats: { ...d0, reviews: d0.reviews + 1 } };

  if (!working.starterChosen || !working.activePokemonId) {
    return withTouch({ ...working, cardsReviewed: reviewed });
  }

  // Update daily streak (only after starter)
  working = updateStreak(working);

  const autoClear = options?.autoClearLog !== false;
  const clearedLog =
    autoClear && !working.currentEncounter ? clearBattleLog(working) : working;

  if (working.currentEncounter) {
    const withLead = applyLeadStudyXpOnCard(clearedLog, reviewed);
    return withTouch({ ...withLead, cardsReviewed: reviewed });
  }

  const modulo = typeof options?.encounterPacingModulo === 'number' && options.encounterPacingModulo >= 2
    ? Math.floor(options.encounterPacingModulo)
    : 1;
  const countsTowardWild = modulo <= 1 || reviewed % modulo === 0;
  const rwRaw = options?.reviewWeight;
  const reviewWeight =
    typeof rwRaw === 'number' && Number.isFinite(rwRaw) ? Math.max(0, Math.min(2, rwRaw)) : 1;

  const ermRaw = options?.encounterReviewMultiplier;
  const encounterReviewMultiplier =
    typeof ermRaw === 'number' && Number.isFinite(ermRaw) ? Math.max(1, Math.min(50, Math.floor(ermRaw))) : 1;
  /** Wild/route units per counted completion — not scaled by reviewWeight (XP/coins still are). */
  const wildRouteUnits = encounterReviewMultiplier;

  let encounterProgress = clearedLog.encounterProgress;
  if (countsTowardWild) {
    encounterProgress += wildRouteUnits;
  }

  const currencyEarned = Math.round(CURRENCY_REWARDS.review * reviewWeight);
  const trainerXpCard = Math.round(TRAINER_XP_SOURCES.cardReview * reviewWeight);
  let next: PokeRemGameState = addTrainerXp({
    ...clearedLog,
    cardsReviewed: reviewed,
    encounterProgress,
    wildReviewAccum: 0,
    currency: (clearedLog.currency ?? 0) + currencyEarned,
    totalCurrencyEarned: (clearedLog.totalCurrencyEarned ?? 0) + currencyEarned,
  }, trainerXpCard);
  next = applyLeadStudyXpOnCard(next, reviewed);

  const effectiveRate = encounterRate ?? REVIEWS_PER_ENCOUNTER;
  const leadForWild = activePokemon(next);
  const leadBattleReady = !!leadForWild && leadForWild.currentHp > 0;
  const willSpawnWild = encounterProgress >= effectiveRate && leadBattleReady;

  if (encounterProgress >= effectiveRate) {
    const lead = activePokemon(next);
    if (!lead || lead.currentHp <= 0) {
      next = {
        ...next,
        encounterProgress: 0,
        ...bumpBattleOutcome(
          next,
          'none',
          lead && lead.currentHp <= 0
            ? `${lead.nickname || lead.name} can’t battle — wild Pokémon stayed away. Heal your lead or switch party!`
            : '',
        ),
      };
    } else {
      const rarityBonus = Math.max(0, effectiveRate - REVIEWS_PER_ENCOUNTER);
      const enc = spawnEncounter(next.party, next.cardsReviewed, enabledGens, rarityBonus);
      const tierLabel = enc.tier && enc.tier !== 'Common' ? ` (${enc.tier})` : '';
      const narr = `Wild ${enc.name}${tierLabel} appeared!`;
      const bgNext = ((next.battleSceneIndex ?? 0) + 1) % BATTLE_SCENE_COUNT;
      const ds = next.dailyStats!;
      next = {
        ...next,
        encounterProgress: 0,
        currentEncounter: enc,
        selectedTab: 'status',
        battleSceneIndex: bgNext,
        dailyStats: { ...ds, encounters: ds.encounters + 1 },
        ...bumpBattleOutcome(next, 'spawn', narr),
      };
    }
  }

  /** Route Finds — travel discoveries; paused while a wild is active or the same tick would spawn one. */
  if (!next.currentEncounter && !willSpawnWild) {
    const rfNeeded =
      typeof options?.routeFindReviewsNeeded === 'number' && options.routeFindReviewsNeeded >= 4
        ? Math.floor(options.routeFindReviewsNeeded)
        : ROUTE_FIND_REVIEWS_DEFAULT;
    let rfProg = next.routeFindProgress ?? 0;
    if (countsTowardWild) {
      rfProg += wildRouteUnits;
    }
    while (rfProg >= rfNeeded) {
      rfProg -= rfNeeded;
      next = applyRouteFindToState(next, rollTravelRouteFind(next));
    }
    next = { ...next, routeFindProgress: rfProg, routeFindReviewAccum: 0 };
  }

  if (!next.currentEncounter) {
    next = applyStudyRegen(next);
  }

  return withTouch(next);
}

/** Slow passive heal for the lead while studying (no wild active on this tick). */
function applyStudyRegen(state: PokeRemGameState): PokeRemGameState {
  const aid = state.activePokemonId;
  if (!aid) return state;
  const party = state.party.map((p) => {
    if (p.id !== aid) return p;
    if (p.currentHp <= 0 || p.currentHp >= p.maxHp) return p;
    const missing = p.maxHp - p.currentHp;
    const heal = Math.max(1, Math.round(missing * 0.2));
    return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + heal) };
  });
  return { ...state, party };
}

/** Consume one Catch Scope and write an in-battle odds readout (next throw, same math as catch). */
export function consumeCatchScopeScan(state: PokeRemGameState): PokeRemGameState {
  const enc = state.currentEncounter;
  if (!enc) return state;
  const n = state.bag['catch-scope'] ?? 0;
  if (n <= 0) return state;
  const ball = nextCatchBallForBag(state.bag);
  const act = activePokemon(state);
  const chance = wildCatchChancePreview(enc, act, ball);
  const pct = Math.round(chance * 100);
  const ballName = ball === 'ultra-ball' ? 'Ultra Ball' : ball === 'great-ball' ? 'Great Ball' : 'Poké Ball';
  const vibe =
    pct >= 70
      ? 'Your next throw looks strong!'
      : pct >= 40
        ? 'Decent odds—weaken it more if you can.'
        : 'Tough catch—consider weakening it or upgrading balls.';
  const bag = { ...state.bag, 'catch-scope': Math.max(0, n - 1) };
  return withTouch({
    ...state,
    bag,
    ...bumpBattleOutcome(state, 'none', `Scope reading: ~${pct}% with your next ${ballName}. ${vibe}`),
  });
}

function addCaughtToRoster(state: PokeRemGameState, mon: OwnedPokemon): PokeRemGameState {
  if (state.party.length < 6) return { ...state, party: [...state.party, mon] };
  return { ...state, storagePokemon: [...state.storagePokemon, mon] };
}

export function catchEncounter(state: PokeRemGameState, ball: 'poke-ball' | 'great-ball' | 'ultra-ball' = 'poke-ball'): PokeRemGameState {
  if (!state.currentEncounter) return state;
  const count = state.bag[ball] ?? 0;
  if (count <= 0) {
    return withTouch({
      ...state,
      ...bumpBattleOutcome(state, 'no_balls', 'No balls left!'),
    });
  }

  const ballBonus = ball === 'ultra-ball' ? 0.4 : ball === 'great-ball' ? 0.2 : 0;
  const enc = state.currentEncounter;
  const baseCatchRate = SPECIES_BY_DEX.get(enc.dexNum)?.baseCatchRate;

  const activeP = activePokemon(state);
  let typeBonus = 0;
  if (activeP && enc.types.length > 0) {
    for (const aType of activeP.types) {
      if (getEffectiveness(aType, enc.types) >= 2) { typeBonus = 0.15; break; }
    }
  }

  const hpRatio = enc.maxHp > 0 ? enc.currentHp / enc.maxHp : 1;
  const success = tryCatch(ballBonus + typeBonus, baseCatchRate, hpRatio);
  const decremented = { ...state.bag, [ball]: Math.max(0, count - 1) };
  if (!success) {
    return withTouch({
      ...state,
      bag: decremented,
      ...bumpBattleOutcome(
        state,
        'catch_fail',
        `${enc.name} broke free!`,
      ),
    });
  }

  const mon: OwnedPokemon = {
    id: uid(),
    dexNum: enc.dexNum,
    name: enc.name,
    level: enc.level,
    totalXp: (enc.level - 1) * 100,
    currentHp: enc.maxHp,
    maxHp: enc.maxHp,
    types: enc.types,
    moves: getInitialMoves(enc.dexNum, enc.level),
    shiny: enc.shiny === true,
  };

  const collectionDex = { ...state.collectionDex, [enc.dexNum]: (state.collectionDex[enc.dexNum] ?? 0) + 1 };
  const pre = ensureDailyStats({ ...state, collectionDex, bag: decremented });
  const ds0 = pre.dailyStats!;

  if (state.party.length >= 6) {
    return withTouch(
      addTrainerXp(
        {
          ...pre,
          currentEncounter: null,
          pendingCaughtMon: mon,
          selectedTab: 'party',
          totalCaught: (state.totalCaught ?? 0) + 1,
          currency: (state.currency ?? 0) + CURRENCY_REWARDS.catch,
          totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + CURRENCY_REWARDS.catch,
          dailyStats: { ...ds0, catches: ds0.catches + 1 },
          ...bumpBattleOutcome(
            state,
            'catch_success',
            `Caught ${enc.name}! Party is full — choose who goes to storage.`,
          ),
        },
        TRAINER_XP_SOURCES.catch,
      ),
    );
  }

  const withRoster = addCaughtToRoster(pre, mon);
  const ds1 = ensureDailyStats(withRoster).dailyStats!;
  return withTouch(
    addTrainerXp(
      {
        ...withRoster,
        currentEncounter: null,
        selectedTab: 'status',
        totalCaught: (state.totalCaught ?? 0) + 1,
        currency: (state.currency ?? 0) + CURRENCY_REWARDS.catch,
        totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + CURRENCY_REWARDS.catch,
        dailyStats: { ...ds1, catches: ds1.catches + 1 },
        ...bumpBattleOutcome(state, 'catch_success', `Caught ${enc.name}!`),
      },
      TRAINER_XP_SOURCES.catch,
    ),
  );
}

/** After full-party catch: swap `replacePartyPokemonId` out to storage for `pendingCaughtMon`. */
export function resolvePendingCaughtReplace(state: PokeRemGameState, replacePartyPokemonId: string): PokeRemGameState {
  const incoming = state.pendingCaughtMon;
  if (!incoming) return state;
  const idx = state.party.findIndex((p) => p.id === replacePartyPokemonId);
  if (idx < 0) return state;
  const outgoing = state.party[idx]!;
  const party = [...state.party];
  party[idx] = incoming;
  const storagePokemon = [...state.storagePokemon, outgoing];
  let activePokemonId = state.activePokemonId;
  if (activePokemonId === replacePartyPokemonId) {
    activePokemonId = incoming.id;
  }
  const outName = outgoing.nickname || outgoing.name;
  const inName = incoming.nickname || incoming.name;
  return withTouch({
    ...state,
    party,
    storagePokemon,
    activePokemonId,
    pendingCaughtMon: null,
    selectedTab: 'status',
    ...bumpBattleOutcome(state, 'catch_success', `${inName} is in your party. ${outName} → storage.`),
  });
}

/** Send pending caught Pokémon to storage without swapping (user declined to replace). */
export function cancelPendingCaught(state: PokeRemGameState): PokeRemGameState {
  const incoming = state.pendingCaughtMon;
  if (!incoming) return state;
  const name = incoming.nickname || incoming.name;
  return withTouch({
    ...state,
    pendingCaughtMon: null,
    storagePokemon: [...state.storagePokemon, incoming],
    selectedTab: 'status',
    ...bumpBattleOutcome(state, 'none', `${name} was sent to storage (party stayed full).`),
  });
}

function growPokemonWithXp(mon: OwnedPokemon, xpDelta: number): {
  pokemon: OwnedPokemon;
  leveledUp: boolean;
  evolvedMon: OwnedPokemon | null;
  evolvedFromName: string;
} {
  if (xpDelta <= 0) {
    return { pokemon: mon, leveledUp: false, evolvedMon: null, evolvedFromName: '' };
  }
  const totalXp = mon.totalXp + xpDelta;
  const level = levelFromXp(totalXp);
  const maxHp = maxHpFor(SPECIES_BY_DEX.get(mon.dexNum)?.baseHp ?? 40, level);
  const prevLevel = mon.level;
  let updated: OwnedPokemon = {
    ...mon,
    totalXp,
    level,
    maxHp,
    currentHp: Math.min(maxHp, mon.currentHp + (level > prevLevel ? 10 : 0)),
  };
  let leveledUp = level > prevLevel;
  let evolvedMon: OwnedPokemon | null = null;
  let evolvedFromName = '';
  if (leveledUp) {
    const { updated: withMoves } = checkLearnMoves(updated, prevLevel);
    updated = withMoves;
    const evoResult = checkLevelEvolution(updated);
    if (evoResult) {
      evolvedFromName = updated.nickname || updated.name;
      updated = applyEvolution(updated, evoResult);
      evolvedMon = updated;
    }
  }
  return { pokemon: updated, leveledUp, evolvedMon, evolvedFromName };
}

/** +1 or +2 XP on the lead for each completed flashcard (alternates by review count). */
function applyLeadStudyXpOnCard(state: PokeRemGameState, cardsReviewed: number): PokeRemGameState {
  const aid = state.activePokemonId;
  if (!aid) return state;
  const idx = state.party.findIndex((p) => p.id === aid);
  if (idx < 0) return state;
  const mon = state.party[idx]!;
  if (mon.currentHp <= 0) return state;
  const delta = 1 + (cardsReviewed % 2);
  const { pokemon } = growPokemonWithXp(mon, delta);
  const party = [...state.party];
  party[idx] = pokemon;
  return { ...state, party };
}

function computeDefeatXp(state: PokeRemGameState): number {
  const enc = state.currentEncounter;
  if (!enc) return XP_ON_DEFEAT;
  const activeP = activePokemon(state);
  let xp = 10 + enc.level * 2;
  const tierMult = enc.tier === 'Mythical' ? 5 : enc.tier === 'Legendary' ? 3 : enc.tier === 'Ultra' ? 2 : 1;
  xp = Math.round(xp * tierMult);

  if (activeP && enc.types.length > 0) {
    for (const aType of activeP.types) {
      if (getEffectiveness(aType, enc.types) >= 2) {
        xp = Math.round(xp * 1.45);
        break;
      }
    }
  }

  if (activeP) {
    const gap = Math.max(0, enc.level - activeP.level);
    xp = Math.round(xp * (1 + Math.min(0.55, gap * 0.045)));
  }

  return Math.max(8, xp);
}

/**
 * One combat exchange: player move (damage wild), then wild counter (damage player, min 1 HP).
 * If wild HP hits 0, delegates to {@link defeatEncounter} for XP / evolution.
 */
export function applyCombatTurn(state: PokeRemGameState, moveId?: string): PokeRemGameState {
  const enc0 = state.currentEncounter;
  if (!enc0) return state;
  const enc = sanitizeEncounterHp(enc0);

  let aid = state.activePokemonId;
  if (!aid && state.party.length > 0) {
    return applyCombatTurn({ ...state, activePokemonId: state.party[0]!.id }, moveId);
  }
  if (!aid) return state;

  const activeIdx = state.party.findIndex((p) => p.id === aid);
  if (activeIdx < 0) return state;
  const active = state.party[activeIdx]!;
  if (active.currentHp <= 0) return state;

  const legalMoves = movesetForBattle(active);
  if (legalMoves.length === 0) return state;

  let chosen: string;
  if (moveId) {
    if (!legalMoves.includes(moveId)) return state;
    chosen = moveId;
  } else {
    const pick = pickDefaultBattleMove(legalMoves);
    if (!pick) return state;
    chosen = pick;
  }

  const pDmg = damageForMove(active.level, chosen, active.types, enc.types);
  const wHp = Math.max(0, enc.currentHp - pDmg);
  const atkXp = xpFromPlayerAttack({ damage: pDmg, moveId: chosen, defenderTypes: enc.types });

  if (wHp <= 0) {
    const partyAfterAtk = state.party.map((p, i) =>
      i === activeIdx ? growPokemonWithXp(p, atkXp).pokemon : p,
    );
    const pEff = MOVES[chosen] ? getEffectiveness(MOVES[chosen]!.type, enc.types) : 1;
    return defeatEncounter(
      {
        ...state,
        party: partyAfterAtk,
        currentEncounter: { ...enc, currentHp: 0 },
      },
      {
        finisher: {
          moveId: chosen,
          displayName: moveDisplayName(chosen),
          damage: pDmg,
          effectiveness: pEff,
        },
      },
    );
  }

  const wildMove = pickWildCounterMove(enc.dexNum, enc.level);
  const wDmg = damageForMove(enc.level, wildMove, enc.types, active.types);
  const nextPlayerHp = Math.floor(active.currentHp - wDmg);
  const takeXp = xpFromTakingHit({ damage: wDmg, wildMoveId: wildMove, playerTypes: active.types });
  const combatXp = atkXp + takeXp;

  const pName = moveDisplayName(chosen);
  const wName = moveDisplayName(wildMove);
  const effNote = pDmg === 0 && (MOVES[chosen]?.power ?? 0) <= 0 ? ' No effect on foe.' : '';

  const pEff = MOVES[chosen] ? getEffectiveness(MOVES[chosen]!.type, enc.types) : 1;
  const wMoveData = MOVES[wildMove];
  const wEff =
    wMoveData && wMoveData.power > 0 ? getEffectiveness(wMoveData.type, active.types) : 1;
  const strikeSnap: CombatStrikeSnapshot = {
    playerMoveId: chosen,
    wildMoveId: wildMove,
    playerDamage: pDmg,
    wildDamage: wDmg,
    playerEffectiveness: pEff,
    wildEffectiveness: wEff,
  };

  if (nextPlayerHp <= 0) {
    const partyChip = state.party.map((p, i) => {
      if (i !== activeIdx) return p;
      return growPokemonWithXp(p, combatXp).pokemon;
    });
    const partyFaint = partyChip.map((p, i) => (i === activeIdx ? { ...p, currentHp: 0 } : p));
    const narr =
      `${active.nickname || active.name} used ${pName}!${effNote}${pDmg > 0 ? ` −${pDmg} HP` : ''} · ${enc.name} used ${wName}! ${active.nickname || active.name} fainted! The wild Pokémon fled.`;
    return withTouch({
      ...state,
      party: partyFaint,
      currentEncounter: null,
      selectedTab: 'status',
      ...bumpBattleOutcome(state, 'faint', narr, strikeSnap),
    });
  }

  const grown = growPokemonWithXp(active, combatXp);
  const party = state.party.map((p, i) => {
    if (i !== activeIdx) return p;
    return { ...grown.pokemon, currentHp: nextPlayerHp };
  });

  const narr =
    `${active.nickname || active.name} used ${pName}!${effNote}${pDmg > 0 ? ` −${pDmg} HP` : ''} · ${enc.name} used ${wName}! −${wDmg} HP`;

  return withTouch({
    ...state,
    party,
    currentEncounter: { ...enc, currentHp: wHp },
    ...bumpBattleOutcome(state, 'combat', narr, strikeSnap),
  });
}

export type DefeatFinisher = {
  moveId: string;
  displayName: string;
  damage: number;
  effectiveness: number;
};

export function defeatEncounter(
  state: PokeRemGameState,
  opts?: { finisher?: DefeatFinisher },
): PokeRemGameState {
  if (!state.currentEncounter) return state;
  const finisher = opts?.finisher;
  const wildName = state.currentEncounter.name;
  if (!state.activePokemonId) {
    return withTouch({
      ...state,
      currentEncounter: null,
      selectedTab: 'status',
      totalDefeated: (state.totalDefeated ?? 0) + 1,
      ...bumpBattleOutcome(
        state,
        'defeat',
        `${wildName} fled — no active lead.`,
      ),
    });
  }
  const xpGain = computeDefeatXp(state);
  let leveledUp = false;
  let evolvedMon: OwnedPokemon | null = null;
  let evolvedFromName = '';
  const party = state.party.map((p) => {
    if (p.id !== state.activePokemonId) return p;
    const grown = growPokemonWithXp(p, xpGain);
    if (grown.leveledUp) leveledUp = true;
    if (grown.evolvedMon) {
      evolvedMon = grown.evolvedMon;
      evolvedFromName = grown.evolvedFromName;
    }
    return grown.pokemon;
  });

  let narr: string;
  let outcome: BattleOutcomeKind = 'defeat';
  if (evolvedMon) {
    narr = `${evolvedFromName} evolved into ${(evolvedMon as OwnedPokemon).name}!`;
    outcome = 'evolution';
  } else if (leveledUp) {
    narr = `${wildName} defeated! +${xpGain} XP — level up!`;
  } else {
    narr = `${wildName} defeated! +${xpGain} XP`;
  }

  if (finisher && outcome === 'defeat') {
    const effBit =
      finisher.effectiveness >= 2
        ? 'Super! '
        : finisher.effectiveness > 0 && finisher.effectiveness < 1
          ? 'Resisted. '
          : finisher.effectiveness <= 0
            ? 'No effect. '
            : '';
    narr = `${effBit}${finisher.displayName} −${finisher.damage} HP · ${narr}`;
  }

  const strikeForBump: CombatStrikeSnapshot | null =
    finisher && outcome === 'defeat'
      ? {
          playerMoveId: finisher.moveId,
          wildMoveId: finisher.moveId,
          playerDamage: finisher.damage,
          playerEffectiveness: finisher.effectiveness,
          wildDefeated: true,
        }
      : null;

  let trainerXpGain = TRAINER_XP_SOURCES.defeat;
  if (leveledUp) trainerXpGain += TRAINER_XP_SOURCES.levelUp;
  if (evolvedMon) trainerXpGain += TRAINER_XP_SOURCES.evolution;

  let afterDefeat: PokeRemGameState = {
    ...state,
    party,
    currentEncounter: null,
    selectedTab: 'status',
    totalDefeated: (state.totalDefeated ?? 0) + 1,
    totalEvolutions: (state.totalEvolutions ?? 0) + (evolvedMon ? 1 : 0),
    currency: (state.currency ?? 0) + CURRENCY_REWARDS.defeat,
    totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + CURRENCY_REWARDS.defeat,
    ...bumpBattleOutcome(state, outcome, narr, strikeForBump),
    achievements: { ...state.achievements, firstLevelUp: state.achievements.firstLevelUp || leveledUp },
  };

  const scrap = rollPostBattleScrap(afterDefeat);
  if (scrap) afterDefeat = applyRouteFindToState(afterDefeat, scrap);

  return withTouch(addTrainerXp(afterDefeat, trainerXpGain));
}

export function runFromEncounter(state: PokeRemGameState): PokeRemGameState {
  if (!state.currentEncounter) return state;
  const name = state.currentEncounter.name;
  return withTouch(addTrainerXp({
    ...state,
    currentEncounter: null,
    selectedTab: 'status',
    totalRuns: (state.totalRuns ?? 0) + 1,
    currency: (state.currency ?? 0) + CURRENCY_REWARDS.run,
    totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + CURRENCY_REWARDS.run,
    ...bumpBattleOutcome(state, 'run', `Ran from ${name}.`),
  }, TRAINER_XP_SOURCES.run));
}

export function switchActivePokemon(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  const found = state.party.some((p) => p.id === pokemonId);
  if (!found) return state;
  return withTouch({ ...state, activePokemonId: pokemonId, selectedTab: 'status' });
}

const EXP_CANDY_S_XP = 45;

export function useHealingItem(state: PokeRemGameState, itemId: string): PokeRemGameState {
  const activeId = state.activePokemonId;
  if (!activeId) return state;
  const count = state.bag[itemId as keyof typeof state.bag] ?? 0;
  if (count <= 0) return state;

  const item = ITEM_BY_ID.get(itemId as any);
  if (!item || item.kind !== 'heal') return state;

  const idx = state.party.findIndex((p) => p.id === activeId);
  if (idx < 0) return state;
  const mon = state.party[idx]!;

  if (item.id === 'revive') {
    if (mon.currentHp > 0) return state;
    const newHp = Math.max(1, Math.floor(mon.maxHp * 0.5));
    const party = state.party.map((p, i) => (i === idx ? { ...p, currentHp: Math.min(p.maxHp, newHp) } : p));
    const bag = { ...state.bag, [itemId]: Math.max(0, count - 1) };
    return withTouch({ ...state, bag, party });
  }

  if (mon.currentHp <= 0) return state;

  const healBy = item.id === 'max-potion' ? 9999 : (item.power ?? 0);
  if (healBy <= 0) return state;
  const party = state.party.map((p, i) =>
    i === idx ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + healBy) } : p,
  );
  const bag = { ...state.bag, [itemId]: Math.max(0, count - 1) };
  return withTouch({ ...state, bag, party });
}

/** Rare Candy / Exp. Candy S on the lead Pokémon (consumes one from the bag). */
export function useLeadUtilityItem(state: PokeRemGameState, itemId: string): PokeRemGameState {
  const activeId = state.activePokemonId;
  if (!activeId) return state;
  const id = itemId as ItemId;
  const count = state.bag[id] ?? 0;
  if (count <= 0) return state;
  const item = ITEM_BY_ID.get(id);
  if (!item || item.kind !== 'utility') return state;
  if (itemId !== 'rare-candy' && itemId !== 'exp-candy-s') return state;

  const idx = state.party.findIndex((p) => p.id === activeId);
  if (idx < 0) return state;
  const mon = state.party[idx]!;

  if (itemId === 'rare-candy') {
    if (mon.level >= 100) return state;
    const newLevel = Math.min(100, mon.level + 1);
    const targetTotalXp = (newLevel - 1) * XP_PER_LEVEL;
    const delta = targetTotalXp - mon.totalXp;
    const grown = growPokemonWithXp(mon, delta);
    const party = state.party.map((p, i) => (i === idx ? grown.pokemon : p));
    const bag = { ...state.bag, [id]: Math.max(0, count - 1) };
    return withTouch({ ...state, bag, party });
  }

  const grown = growPokemonWithXp(mon, EXP_CANDY_S_XP);
  const party = state.party.map((p, i) => (i === idx ? grown.pokemon : p));
  const bag = { ...state.bag, [id]: Math.max(0, count - 1) };
  return withTouch({ ...state, bag, party });
}

export function forgetMoveAction(state: PokeRemGameState, pokemonId: string, moveId: string): PokeRemGameState {
  const party = state.party.map((p) => {
    if (p.id !== pokemonId) return p;
    return { ...p, moves: (p.moves ?? []).filter((m) => m !== moveId) };
  });
  return withTouch({ ...state, party });
}

export function renamePokemon(state: PokeRemGameState, pokemonId: string, nickname: string): PokeRemGameState {
  const party = state.party.map((p) => p.id === pokemonId ? { ...p, nickname: nickname || undefined } : p);
  const storagePokemon = state.storagePokemon.map((p) => p.id === pokemonId ? { ...p, nickname: nickname || undefined } : p);
  return withTouch({ ...state, party, storagePokemon });
}

export function releasePokemon(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  if (state.party.length <= 1 && state.party.some((p) => p.id === pokemonId)) return state;
  const party = state.party.filter((p) => p.id !== pokemonId);
  const storagePokemon = state.storagePokemon.filter((p) => p.id !== pokemonId);
  let activePokemonId = state.activePokemonId;
  if (activePokemonId === pokemonId) {
    activePokemonId = party[0]?.id ?? null;
  }
  return withTouch({ ...state, party, storagePokemon, activePokemonId });
}

export function moveToStorage(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  if (state.party.length <= 1) return state;
  const mon = state.party.find((p) => p.id === pokemonId);
  if (!mon) return state;
  const remaining = state.party.filter((p) => p.id !== pokemonId);
  let activePokemonId = state.activePokemonId;
  if (pokemonId === state.activePokemonId) {
    activePokemonId = remaining[0]?.id ?? null;
  }
  return withTouch({
    ...state,
    activePokemonId,
    party: remaining,
    storagePokemon: [...state.storagePokemon, mon],
  });
}

export function moveToParty(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  if (state.party.length >= 6) return state;
  const mon = state.storagePokemon.find((p) => p.id === pokemonId);
  if (!mon) return state;
  return withTouch({
    ...state,
    party: [...state.party, mon],
    storagePokemon: state.storagePokemon.filter((p) => p.id !== pokemonId),
  });
}

/** Swap one party slot for a Pokémon from storage (party stays same size). */
export function swapPartyWithStorage(
  state: PokeRemGameState,
  storagePokemonId: string,
  replacePartyPokemonId: string,
): PokeRemGameState {
  const incoming = state.storagePokemon.find((p) => p.id === storagePokemonId);
  const idx = state.party.findIndex((p) => p.id === replacePartyPokemonId);
  if (!incoming || idx < 0) return state;
  const outgoing = state.party[idx]!;
  const party = [...state.party];
  party[idx] = incoming;
  const storagePokemon = [...state.storagePokemon.filter((p) => p.id !== storagePokemonId), outgoing];
  let activePokemonId = state.activePokemonId;
  if (activePokemonId === replacePartyPokemonId) {
    activePokemonId = incoming.id;
  }
  return withTouch({ ...state, party, storagePokemon, activePokemonId });
}

export function claimAchievement(state: PokeRemGameState, id: string): PokeRemGameState {
  const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
  if (!def || !state.achievements[id]) return state;
  const claimed = state.claimedAchievementIds ?? [];
  if (claimed.includes(id)) return state;
  let next: PokeRemGameState = {
    ...state,
    claimedAchievementIds: [...claimed, id],
    lastUpdatedAt: Date.now(),
  };
  next = addTrainerXp(next, achievementTrainerXpReward(def));
  next = addBagQuantities(next, achievementItemBonus(def));
  next.trainerLevel = trainerLevelFromXp(next.trainerXp ?? 0);
  next.trainerRank = computeTrainerRank(next);
  next.achievements = deriveAchievements(next);
  return next;
}

export function configureStudyDifficulty(
  state: PokeRemGameState,
  preset: StudyDifficultyPreset,
  custom?: { reviews?: number; weight?: number },
): PokeRemGameState {
  if (preset === 'custom') {
    const reviews = clampStudyReviews(custom?.reviews ?? state.studyReviewsPerEncounter);
    const weight = clampStudyWeight(custom?.weight ?? state.studyCardWeight);
    return withTouch({
      ...state,
      studyDifficultyPreset: 'custom',
      studyReviewsPerEncounter: reviews,
      studyCardWeight: weight,
      studyDifficultyConfigured: true,
    });
  }
  const d = STUDY_PRESET_DEFAULTS[preset];
  return withTouch({
    ...state,
    studyDifficultyPreset: preset,
    studyReviewsPerEncounter: d.reviews,
    studyCardWeight: d.weight,
    studyDifficultyConfigured: true,
  });
}

export function claimTrainerReward(state: PokeRemGameState, level: number): PokeRemGameState {
  const reward = TRAINER_REWARDS.find((r) => r.level === level);
  if (!reward) return state;
  if ((state.trainerLevel ?? 1) < level) return state;
  const claimed = state.claimedRewardLevels ?? [];
  if (claimed.includes(level)) return state;

  let next = { ...state, claimedRewardLevels: [...claimed, level] };
  if (reward.items) {
    const bag = { ...next.bag };
    for (const [itemId, qty] of Object.entries(reward.items)) {
      bag[itemId as keyof typeof bag] = ((bag as any)[itemId] ?? 0) + (qty as number);
    }
    next = { ...next, bag };
  }
  if (reward.trainerRankTitle) {
    next = { ...next, trainerRank: reward.trainerRankTitle };
  }
  return withTouch(next);
}

export function buyItem(state: PokeRemGameState, itemId: string, price: number): PokeRemGameState {
  if ((state.currency ?? 0) < price) return state;
  if (itemId === 'ultra-ball' && (state.trainerLevel ?? 1) < ULTRA_BALL_UNLOCK_LEVEL) return state;
  const bag = { ...state.bag, [itemId]: (state.bag[itemId as keyof typeof state.bag] ?? 0) + 1 };
  return withTouch({
    ...state,
    bag,
    currency: (state.currency ?? 0) - price,
    totalShopPurchases: (state.totalShopPurchases ?? 0) + 1,
  });
}

export function xpProgressPercent(mon: OwnedPokemon): number {
  const need = xpToNextLevel(mon.totalXp);
  const span = 100;
  return Math.max(0, Math.min(100, ((span - need) / span) * 100));
}
