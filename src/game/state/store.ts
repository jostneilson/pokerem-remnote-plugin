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
import {
  checkLearnMoves,
  dedupeMoveIds,
  getInitialMoves,
  getUnlockedLearnsetMoveIds,
  movesetForBattle,
  pickDefaultBattleMove,
} from '../engine/moveLearn';
import { isMoveTypeLegalForSpecies } from '../data/learnsetRules';
import { MOVES } from '../data/moves';
import { CURRENCY_REWARDS, ULTRA_BALL_UNLOCK_LEVEL } from '../engine/shop';
import { getEffectiveness } from '../data/typeChart';
import { computeTrainerRank } from '../engine/trainerRank';
import {
  levelFromXp,
  maxHpFor,
  xpIntoCurrentLevel,
  xpSpanForCurrentLevel,
  xpThresholdForLevel,
  xpToNextLevel,
} from '../engine/progression';
import { xpFromPlayerAttack, xpFromTakingHit } from '../engine/combatXp';
import {
  clampStudyReviews,
  clampStudyWeight,
  STUDY_PRESET_DEFAULTS,
  type StudyDifficultyPreset,
} from '../engine/studyDifficulty';
import { REVIEWS_PER_ENCOUNTER, ROUTE_FIND_REVIEWS_DEFAULT, XP_ON_DEFEAT } from '../constants';
import { trainerLevelFromXp, TRAINER_XP_SOURCES, TRAINER_REWARDS } from '../engine/trainerLevel';
import {
  applyXpDoublerMultiplier,
  isXpDoublerActive,
  isXpDoublerItemId,
  makeXpDoublerEntry,
  xpDoublerItemForTier,
  xpDoublerTierForItem,
  XP_DOUBLER_QUEUE_MAX,
} from '../engine/xpDoublers';
import {
  averageOwnedPartyLevel,
  generateTrainer,
  generateTrainerRewards,
  rollTrainerBattleReplacement,
  trainerCatchChance,
  trainerEnemyAsEncounter,
  DEFAULT_TRAINER_FREQUENCY,
  isTrainerFrequencyEnabled,
  parseTrainerFrequencyKey,
  type TrainerFrequencyKey,
} from '../engine/trainerBattles';
import { BATTLE_SCENE_COUNT, normalizeBattleSceneIndex } from '../engine/battleAmbience';
import { rollPostBattleScrap, rollTravelRouteFind, type RouteFindRollResult } from '../engine/routeFinds';
import {
  damageForMove,
  moveDisplayName,
  pickWildCounterMove,
} from '../engine/combatExchange';
import type {
  PokeRemGameState,
  AchievementState,
  BattleOutcomeKind,
  CombatStrikeSnapshot,
  EncounterPokemon,
  MainNoticeItem,
  OwnedPokemon,
  SectionTab,
  TrainerBattleState,
  TrainerBattleStats,
  TrainerEnemyMon,
  TrainerIdentity,
  TrainerRewardSnapshot,
  TrainerTier,
  XpDoublerEntry,
  XpDoublerTier,
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

export function createInitialStateV4(): PokeRemGameState {
  return {
    schemaVersion: 4,
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
    studyHealCarries: [],
    mainNoticeQueue: [],
    xpBoosterActive: null,
    xpBoosterQueue: [],
    trainerBattleCounter: 0,
    currentTrainerBattle: null,
    trainerBattleStats: createInitialTrainerBattleStats(),
    prestigeBadges: [],
    whatsNewSeenVersion: undefined,
  };
}

/** @deprecated Prefer {@link createInitialStateV4}; kept for legacy imports/tests. */
export function createInitialStateV3(): PokeRemGameState {
  return createInitialStateV4();
}

/** @deprecated Prefer {@link createInitialStateV4}; kept for tests and older imports. */
export function createInitialStateV2(): PokeRemGameState {
  return createInitialStateV4();
}

export function createInitialTrainerBattleStats(): TrainerBattleStats {
  return {
    standardWon: 0,
    standardLost: 0,
    eliteWon: 0,
    eliteLost: 0,
    totalWon: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
  };
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
  const base = createInitialStateV4();
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

function normalizeMainNoticeQueue(raw: unknown, max: number): MainNoticeItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MainNoticeItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const kind = o.kind;
    const id = o.id;
    const title = o.title;
    const subtitle = o.subtitle;
    if (
      kind !== 'achievement_unlock' &&
      kind !== 'trainer_reward' &&
      kind !== 'trainer_battle_result'
    )
      continue;
    if (typeof id !== 'string' || id.length === 0 || id.length > 80) continue;
    if (typeof title !== 'string' || title.length === 0 || title.length > 120) continue;
    if (typeof subtitle !== 'string' || subtitle.length > 220) continue;
    out.push({
      kind: kind as MainNoticeItem['kind'],
      id,
      title: title.slice(0, 120),
      subtitle: subtitle.slice(0, 220),
    });
    if (out.length >= max) break;
  }
  return out;
}

function normalizeStudyHealCarriesSlice(raw: unknown, partyLen: number): number[] {
  const n = Math.max(0, Math.min(6, Math.floor(partyLen)));
  return Array.from({ length: n }, (_, i) => {
    if (!Array.isArray(raw) || typeof raw[i] !== 'number' || !Number.isFinite(raw[i])) return 0;
    return Math.max(0, raw[i]!);
  });
}

function isXpDoublerTier(v: unknown): v is XpDoublerTier {
  return v === 'common' || v === 'rare' || v === 'legendary';
}

function normalizeXpDoublerEntry(raw: unknown): XpDoublerEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (!isXpDoublerTier(e.tier)) return null;
  const totalRaw = e.cardsTotal;
  const remRaw = e.cardsRemaining;
  const total =
    typeof totalRaw === 'number' && Number.isFinite(totalRaw)
      ? Math.max(1, Math.floor(totalRaw))
      : null;
  const rem =
    typeof remRaw === 'number' && Number.isFinite(remRaw)
      ? Math.max(0, Math.floor(remRaw))
      : null;
  if (total == null) return null;
  const cardsRemaining = rem == null ? total : Math.min(total, rem);
  if (cardsRemaining <= 0) return null;
  return { tier: e.tier, cardsTotal: total, cardsRemaining };
}

function normalizeXpDoublerQueue(raw: unknown, max: number): XpDoublerEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: XpDoublerEntry[] = [];
  for (const r of raw) {
    const e = normalizeXpDoublerEntry(r);
    if (e) out.push(e);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeTrainerBattleStats(raw: unknown): TrainerBattleStats {
  const base = createInitialTrainerBattleStats();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const intField = (k: keyof TrainerBattleStats) => {
    const v = o[k as string];
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : base[k];
  };
  return {
    standardWon: intField('standardWon'),
    standardLost: intField('standardLost'),
    eliteWon: intField('eliteWon'),
    eliteLost: intField('eliteLost'),
    totalWon: intField('totalWon'),
    currentWinStreak: intField('currentWinStreak'),
    longestWinStreak: intField('longestWinStreak'),
  };
}

function normalizeTrainerEnemyMon(raw: unknown): TrainerEnemyMon | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const dexNum = typeof e.dexNum === 'number' ? e.dexNum : null;
  if (dexNum == null) return null;
  const species = SPECIES_BY_DEX.get(dexNum);
  const name =
    typeof e.name === 'string' && e.name.length > 0 ? e.name : species?.name ?? `#${dexNum}`;
  const level =
    typeof e.level === 'number' && Number.isFinite(e.level) ? Math.max(1, Math.floor(e.level)) : 5;
  const maxHp =
    typeof e.maxHp === 'number' && Number.isFinite(e.maxHp)
      ? Math.max(1, Math.floor(e.maxHp))
      : maxHpFor(species?.baseHp ?? 40, level);
  const currentHpRaw =
    typeof e.currentHp === 'number' && Number.isFinite(e.currentHp)
      ? Math.floor(e.currentHp)
      : maxHp;
  const currentHp = Math.max(0, Math.min(maxHp, currentHpRaw));
  const types =
    Array.isArray(e.types) && (e.types as unknown[]).length
      ? (e.types as TrainerEnemyMon['types'])
      : species?.types ?? ['Normal'];
  const moves = Array.isArray(e.moves)
    ? (e.moves as unknown[]).filter((m): m is string => typeof m === 'string' && !!MOVES[m])
    : [];
  const defeated = e.defeated === true || currentHp <= 0;
  return { dexNum, name, level, maxHp, currentHp, types, moves, defeated };
}

function normalizeTrainerIdentity(raw: unknown): TrainerIdentity | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const archetypeId = typeof t.archetypeId === 'string' ? t.archetypeId.slice(0, 60) : '';
  const className = typeof t.className === 'string' ? t.className.slice(0, 60) : '';
  if (!archetypeId || !className) return null;
  return {
    archetypeId,
    className,
    displayName:
      typeof t.displayName === 'string' && t.displayName.length > 0
        ? t.displayName.slice(0, 40)
        : undefined,
    themeTypes: Array.isArray(t.themeTypes)
      ? (t.themeTypes as TrainerIdentity['themeTypes'])
      : [],
    taunt: typeof t.taunt === 'string' ? t.taunt.slice(0, 200) : '',
    defeatLine: typeof t.defeatLine === 'string' ? t.defeatLine.slice(0, 200) : '',
    victoryLine: typeof t.victoryLine === 'string' ? t.victoryLine.slice(0, 200) : '',
  };
}

function normalizeTrainerRewardSnapshot(raw: unknown): TrainerRewardSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const items: Partial<Record<string, number>> = {};
  if (r.items && typeof r.items === 'object') {
    for (const [k, v] of Object.entries(r.items as Record<string, unknown>)) {
      if (!ITEM_BY_ID.has(k as ItemId)) continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
      items[k] = Math.max(0, Math.floor(v));
    }
  }
  return {
    coins:
      typeof r.coins === 'number' && Number.isFinite(r.coins) ? Math.max(0, Math.floor(r.coins)) : 0,
    trainerXp:
      typeof r.trainerXp === 'number' && Number.isFinite(r.trainerXp)
        ? Math.max(0, Math.floor(r.trainerXp))
        : 0,
    items,
    xpDoublerTier: isXpDoublerTier(r.xpDoublerTier) ? r.xpDoublerTier : undefined,
    headline: typeof r.headline === 'string' ? r.headline.slice(0, 220) : '',
  };
}

function normalizeTrainerBattleState(raw: unknown): TrainerBattleState | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const trainer = normalizeTrainerIdentity(t.trainer);
  if (!trainer) return null;
  const enemiesRaw = Array.isArray(t.enemies) ? (t.enemies as unknown[]).slice(0, 3) : [];
  const enemies = enemiesRaw
    .map(normalizeTrainerEnemyMon)
    .filter((e): e is TrainerEnemyMon => e !== null);
  if (enemies.length !== 3) return null;
  const phase: TrainerBattleState['phase'] =
    t.phase === 'team_select' ||
    t.phase === 'active' ||
    t.phase === 'post_win' ||
    t.phase === 'post_loss'
      ? t.phase
      : 'team_select';
  const tier: TrainerTier = t.tier === 'elite' ? 'elite' : 'standard';
  const activeEnemyIndex =
    typeof t.activeEnemyIndex === 'number' && Number.isFinite(t.activeEnemyIndex)
      ? Math.max(0, Math.min(2, Math.floor(t.activeEnemyIndex)))
      : 0;
  const selectedPartyIds = Array.isArray(t.selectedPartyIds)
    ? (t.selectedPartyIds as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 3)
    : [];
  const faintedSelectedIds = Array.isArray(t.faintedSelectedIds)
    ? (t.faintedSelectedIds as unknown[])
        .filter((x): x is string => typeof x === 'string')
        .slice(0, 3)
    : [];
  return {
    id: typeof t.id === 'string' && t.id.length > 0 ? t.id.slice(0, 64) : `tb_${Date.now()}`,
    phase,
    tier,
    trainer,
    enemies,
    activeEnemyIndex,
    selectedPartyIds,
    faintedSelectedIds,
    catchOfferActive: t.catchOfferActive === true,
    catchOfferClaimed: t.catchOfferClaimed === true,
    rewardSnapshot: normalizeTrainerRewardSnapshot(t.rewardSnapshot),
    lastLog: typeof t.lastLog === 'string' ? t.lastLog.slice(0, 220) : undefined,
    feedbackSeq:
      typeof t.feedbackSeq === 'number' && Number.isFinite(t.feedbackSeq)
        ? Math.max(0, Math.floor(t.feedbackSeq))
        : 0,
  };
}

function normalizePrestigeBadges(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string' || v.length === 0 || v.length > 60) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= 32) break;
  }
  return out;
}

function parseGameStateCore(o: any, legacySchema: number): PokeRemGameState {
  const base = createInitialStateV4();
  const claimedRaw = o.claimedAchievementIds;
  const claimedAchievementIds = Array.isArray(claimedRaw)
    ? (claimedRaw as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

  const party = Array.isArray(o.party) ? o.party.map(normalizeOwned) : [];

  const state: PokeRemGameState = {
    ...base,
    ...o,
    party,
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
    studyHealCarries: normalizeStudyHealCarriesSlice((o as { studyHealCarries?: unknown }).studyHealCarries, party.length),
    mainNoticeQueue: normalizeMainNoticeQueue((o as { mainNoticeQueue?: unknown }).mainNoticeQueue, 12),
    xpBoosterActive: normalizeXpDoublerEntry((o as { xpBoosterActive?: unknown }).xpBoosterActive),
    xpBoosterQueue: normalizeXpDoublerQueue((o as { xpBoosterQueue?: unknown }).xpBoosterQueue, 8),
    trainerBattleCounter:
      typeof o.trainerBattleCounter === 'number' && Number.isFinite(o.trainerBattleCounter)
        ? Math.max(0, Math.floor(o.trainerBattleCounter))
        : 0,
    currentTrainerBattle: normalizeTrainerBattleState(
      (o as { currentTrainerBattle?: unknown }).currentTrainerBattle,
    ),
    trainerBattleStats: normalizeTrainerBattleStats(
      (o as { trainerBattleStats?: unknown }).trainerBattleStats,
    ),
    prestigeBadges: normalizePrestigeBadges((o as { prestigeBadges?: unknown }).prestigeBadges),
    whatsNewSeenVersion:
      typeof o.whatsNewSeenVersion === 'string' && o.whatsNewSeenVersion.length <= 20
        ? o.whatsNewSeenVersion
        : undefined,
    schemaVersion: 4,
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
  if (!raw || typeof raw !== 'object') return createInitialStateV4();
  const o = raw as any;
  if (o.schemaVersion === 1) {
    let s = migrateV1ToV2(o);
    s.achievements = deriveAchievements(s);
    const unlockedIds = ACHIEVEMENT_DEFS.filter((d) => s.achievements[d.id]).map((d) => d.id);
    return {
      ...s,
      schemaVersion: 4,
      claimedAchievementIds: unlockedIds,
      studyDifficultyPreset: 'medium',
      studyReviewsPerEncounter: REVIEWS_PER_ENCOUNTER,
      studyCardWeight: 1,
      studyDifficultyConfigured: true,
    };
  }
  if (o.schemaVersion === 2) return parseGameStateCore(o, 2);
  if (o.schemaVersion === 3 || o.schemaVersion === 4) {
    return parseGameStateCore(o, o.schemaVersion);
  }
  return createInitialStateV4();
}

function addTrainerXp(state: PokeRemGameState, amount: number): PokeRemGameState {
  const trainerXp = (state.trainerXp ?? 0) + amount;
  return { ...state, trainerXp };
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

function appendMainNoticesIfNeeded(
  state: PokeRemGameState,
  preAch: AchievementState,
  preTrainerLevel: number,
): PokeRemGameState {
  const queue = [...(state.mainNoticeQueue ?? [])];
  const claimedA = new Set(state.claimedAchievementIds ?? []);
  const claimedR = new Set(state.claimedRewardLevels ?? []);

  for (const def of ACHIEVEMENT_DEFS) {
    if (!state.achievements[def.id] || preAch[def.id]) continue;
    if (claimedA.has(def.id)) continue;
    if (queue.some((n) => n.kind === 'achievement_unlock' && n.id === def.id)) continue;
    queue.push({
      kind: 'achievement_unlock',
      id: def.id,
      title: def.name,
      subtitle: 'Open Progress to claim your reward.',
    });
  }

  const newLv = state.trainerLevel ?? 1;
  if (newLv > preTrainerLevel) {
    for (let lv = preTrainerLevel + 1; lv <= newLv; lv++) {
      const r = TRAINER_REWARDS.find((x) => x.level === lv);
      if (!r || claimedR.has(lv)) continue;
      const nid = `reward-${lv}`;
      if (queue.some((n) => n.kind === 'trainer_reward' && n.id === nid)) continue;
      queue.push({
        kind: 'trainer_reward',
        id: nid,
        title: `Trainer Lv ${lv} — ${r.title}`,
        subtitle: r.description,
      });
    }
  }

  return { ...state, mainNoticeQueue: queue.slice(0, 12) };
}

function withTouch(state: PokeRemGameState): PokeRemGameState {
  const preAch = { ...(state.achievements ?? {}) };
  const preTrainerLevel = state.trainerLevel ?? 1;
  const next: PokeRemGameState = { ...state, lastUpdatedAt: Date.now() };
  next.achievements = deriveAchievements(next);
  next.trainerLevel = trainerLevelFromXp(next.trainerXp ?? 0);
  next.trainerRank = computeTrainerRank(next);
  return appendMainNoticesIfNeeded(next, preAch, preTrainerLevel);
}

/** Remove one main notice by id (dismiss); does not affect claim state. */
export function dismissMainNotice(state: PokeRemGameState, id: string): PokeRemGameState {
  const q = state.mainNoticeQueue ?? [];
  const filtered = q.filter((n) => n.id !== id);
  if (filtered.length === q.length) return state;
  return withTouch({ ...state, mainNoticeQueue: filtered });
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
  /**
   * Trainer battle frequency setting. When a wild encounter is due AND the trainer counter has
   * met the threshold, the wild spawn is replaced by a trainer battle. Default `'normal'`.
   */
  trainerFrequency?: TrainerFrequencyKey;
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

  if (working.currentEncounter || working.currentTrainerBattle) {
    // Pause progression while a wild encounter or trainer battle is on screen — XP and doubler
    // ticks still apply (study reward), but we don't add to wild progress or trainer counter.
    const withXp = applyPartyStudyXpOnCard(clearedLog, Math.random);
    const withTick = tickXpDoublerOnCard(withXp);
    return withTouch({ ...withTick, cardsReviewed: reviewed });
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

  const trainerFreq: TrainerFrequencyKey = parseTrainerFrequencyKey(
    options?.trainerFrequency ?? DEFAULT_TRAINER_FREQUENCY,
  );
  const trainerCounter =
    (clearedLog.trainerBattleCounter ?? 0) + (countsTowardWild ? 1 : 0);

  const currencyEarned = Math.round(CURRENCY_REWARDS.review * reviewWeight);
  const trainerXpCard = Math.round(TRAINER_XP_SOURCES.cardReview * reviewWeight);
  let next: PokeRemGameState = addTrainerXp({
    ...clearedLog,
    cardsReviewed: reviewed,
    encounterProgress,
    wildReviewAccum: 0,
    trainerBattleCounter: trainerCounter,
    currency: (clearedLog.currency ?? 0) + currencyEarned,
    totalCurrencyEarned: (clearedLog.totalCurrencyEarned ?? 0) + currencyEarned,
  }, trainerXpCard);
  next = applyPartyStudyXpOnCard(next, Math.random);
  next = tickXpDoublerOnCard(next);

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
            ? `${lead.nickname || lead.name} can’t battle — wild Pokémon stayed away. Revive or heal your lead, or switch party!`
            : '',
        ),
      };
    } else {
      // Trainer battle replacement: when due AND the player has at least 1 battle-ready party
      // member, the wild spawn is consumed and a trainer battle starts in `team_select` instead.
      const trainerTier =
        isTrainerFrequencyEnabled(trainerFreq) && next.party.some((p) => p.currentHp > 0)
          ? rollTrainerBattleReplacement(next, trainerFreq)
          : null;
      if (trainerTier) {
        next = {
          ...next,
          encounterProgress: 0,
        };
        next = startTrainerBattle(next, trainerTier, enabledGens ?? [1], Math.random);
      } else {
        const rarityBonus = Math.max(0, effectiveRate - REVIEWS_PER_ENCOUNTER);
        const enc = spawnEncounter(next.party, next.cardsReviewed, enabledGens, rarityBonus, {
          collectionDex: next.collectionDex ?? {},
        });
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
    next = applyStudyHealFromCard(next, effectiveRate, countsTowardWild);
  }

  return withTouch(next);
}

/** Lead study XP roll: 40% →3, 40% →4, 20% →5 */
function rollLeadStudyXp(rng: () => number): number {
  const r = rng();
  if (r < 0.4) return 3;
  if (r < 0.8) return 4;
  return 5;
}

/** Bench study XP roll: 40% →1, 40% →2, 20% →3 */
function rollBenchStudyXp(rng: () => number): number {
  const r = rng();
  if (r < 0.4) return 1;
  if (r < 0.8) return 2;
  return 3;
}

function applyPartyStudyXpOnCard(state: PokeRemGameState, rng: () => number): PokeRemGameState {
  const aid = state.activePokemonId;
  if (!aid) return state;
  const leadIdx = state.party.findIndex((p) => p.id === aid);
  if (leadIdx < 0) return state;
  const party = state.party.map((p, i) => {
    const baseDelta = i === leadIdx ? rollLeadStudyXp(rng) : rollBenchStudyXp(rng);
    const delta = applyXpDoublerMultiplier(state, baseDelta);
    if (delta <= 0) return p;
    const { pokemon } = growPokemonWithXp(p, delta);
    return pokemon;
  });
  return { ...state, party };
}

/**
 * Activate an XP Doubler from the bag. If one is already active, queue the new one
 * (oldest-first). Consumes one unit of the doubler's bag count. Returns state unchanged
 * if the queue is full or the bag has none of the requested doubler.
 */
export function activateXpDoubler(
  state: PokeRemGameState,
  tier: XpDoublerTier,
): PokeRemGameState {
  const itemId = xpDoublerItemForTier(tier);
  const have = state.bag?.[itemId] ?? 0;
  if (have <= 0) return state;
  const queue = Array.isArray(state.xpBoosterQueue) ? [...state.xpBoosterQueue] : [];
  const active = state.xpBoosterActive;
  if (active && active.cardsRemaining > 0 && queue.length >= XP_DOUBLER_QUEUE_MAX) {
    return state;
  }
  const bag: Record<ItemId, number> = { ...state.bag };
  bag[itemId] = Math.max(0, have - 1);
  const entry = makeXpDoublerEntry(tier);
  if (!active || active.cardsRemaining <= 0) {
    return withTouch({ ...state, bag, xpBoosterActive: entry, xpBoosterQueue: queue });
  }
  queue.push(entry);
  return withTouch({ ...state, bag, xpBoosterActive: active, xpBoosterQueue: queue });
}

/**
 * Tick the active XP doubler down by one card. When it expires, pull the next from the queue.
 * Pure helper — safe to call once per reviewed card. Skips work when no doubler is active.
 */
export function tickXpDoublerOnCard(state: PokeRemGameState): PokeRemGameState {
  const active = state.xpBoosterActive;
  if (!active || active.cardsRemaining <= 0) {
    if (state.xpBoosterQueue && state.xpBoosterQueue.length > 0) {
      const queue = [...state.xpBoosterQueue];
      const next = queue.shift();
      return { ...state, xpBoosterActive: next ?? null, xpBoosterQueue: queue };
    }
    return state;
  }
  const remaining = Math.max(0, active.cardsRemaining - 1);
  if (remaining > 0) {
    return { ...state, xpBoosterActive: { ...active, cardsRemaining: remaining } };
  }
  const queue = Array.isArray(state.xpBoosterQueue) ? [...state.xpBoosterQueue] : [];
  const next = queue.shift();
  return { ...state, xpBoosterActive: next ?? null, xpBoosterQueue: queue };
}

/**
 * Passive heal while reviewing with no active wild — spread so lead recovers ~50% max HP
 * and each bench slot ~25% max HP across `encounterRate` qualifying cards.
 *
 * Carries track the fractional HP "saved up" between cards so healing stays smooth when the
 * per-card increment isn't a whole number. IMPORTANT: carries are reset whenever a Pokémon is
 * at full HP (or fainted), otherwise they would accumulate during long stretches of healthy
 * studying and then dump a massive lump-heal on the very first card after the next battle,
 * making HP appear to "jump to the top" instead of trickling back across the encounter gap.
 */
function applyStudyHealFromCard(
  state: PokeRemGameState,
  encounterRate: number,
  countsTowardWild: boolean,
): PokeRemGameState {
  if (!countsTowardWild) return state;
  const rate = Math.max(1, Math.floor(encounterRate));
  const aid = state.activePokemonId;
  if (!aid) return state;
  const leadIdx = state.party.findIndex((p) => p.id === aid);
  if (leadIdx < 0) return state;

  const carries = normalizeStudyHealCarriesSlice(state.studyHealCarries, state.party.length);
  const party = state.party.map((p, i) => {
    if (p.currentHp <= 0) {
      // Fainted — heals are blocked until revived; reset carry so nothing "stacks up".
      carries[i] = 0;
      return p;
    }
    if (p.currentHp >= p.maxHp) {
      // Already full — don't accumulate future heals while topped off. Reset carry so that
      // the next time this Pokémon takes damage, healing resumes fresh over the next batch
      // of cards instead of snapping to full on card #1.
      carries[i] = 0;
      return p;
    }
    const inc = i === leadIdx ? (p.maxHp * 0.5) / rate : (p.maxHp * 0.25) / rate;
    // Cap the running carry so it can never add up to more than a single card's worth of
    // heal on top of the current increment. This keeps per-card gains smooth even if some
    // edge case somehow sneaks a large value into the carry.
    const prevCarry = Math.min(carries[i] ?? 0, inc);
    let c = prevCarry + inc;
    const heal = Math.floor(c);
    c -= heal;
    carries[i] = c;
    return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + heal) };
  });
  return { ...state, party, studyHealCarries: carries };
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
    totalXp: xpThresholdForLevel(enc.level),
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
  const atkXpBase = xpFromPlayerAttack({ damage: pDmg, moveId: chosen, defenderTypes: enc.types });
  const atkXp = applyXpDoublerMultiplier(state, atkXpBase);

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
  const takeXp = applyXpDoublerMultiplier(
    state,
    xpFromTakingHit({ damage: wDmg, wildMoveId: wildMove, playerTypes: active.types }),
  );
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
  const xpGain = applyXpDoublerMultiplier(state, computeDefeatXp(state));
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
  if (isTrainerBattleActive(state)) return state;
  const found = state.party.some((p) => p.id === pokemonId);
  if (!found) return state;
  return withTouch({ ...state, activePokemonId: pokemonId, selectedTab: 'status' });
}

// ── Trainer battle reducers (1.2.0) ─────────────────────────────────────────

/** True while a trainer battle is in the `active` combat phase (no items/heal/switch). */
export function isTrainerBattleActive(state: PokeRemGameState): boolean {
  return state.currentTrainerBattle?.phase === 'active';
}

/** True whenever any trainer battle (any phase) is open. */
export function hasTrainerBattle(state: PokeRemGameState): boolean {
  return !!state.currentTrainerBattle;
}

/**
 * Spawn a trainer battle in `team_select` phase. Generates archetype, identity, and 3 enemies
 * scaled to the player's average party level; respects enabled generations.
 *
 * Idempotent: returns state unchanged if a trainer battle is already in progress, a wild encounter
 * is active, or the player hasn't picked a starter yet.
 */
export function startTrainerBattle(
  state: PokeRemGameState,
  tier: TrainerTier,
  enabledGens: number[],
  rng: () => number = Math.random,
): PokeRemGameState {
  if (state.currentTrainerBattle || state.currentEncounter) return state;
  if (!state.starterChosen || state.party.length === 0) return state;
  const avgLevel = averageOwnedPartyLevel(state.party);
  const { identity, enemies } = generateTrainer({
    tier,
    enabledGens: enabledGens && enabledGens.length > 0 ? enabledGens : [1],
    averageLevel: avgLevel,
    rng,
  });
  const battle: TrainerBattleState = {
    id: `tb_${Date.now()}_${Math.floor(rng() * 1e6)}`,
    phase: 'team_select',
    tier,
    trainer: identity,
    enemies,
    activeEnemyIndex: 0,
    selectedPartyIds: [],
    faintedSelectedIds: [],
    catchOfferActive: false,
    catchOfferClaimed: false,
    feedbackSeq: 0,
  };
  return withTouch({
    ...state,
    currentTrainerBattle: battle,
    trainerBattleCounter: 0,
    selectedTab: 'status',
    ...bumpBattleOutcome(
      state,
      'spawn',
      `${identity.className}${identity.displayName ? ' ' + identity.displayName : ''} challenges you!`,
    ),
  });
}

/**
 * Lock in three party Pokémon for the trainer battle and transition to `active`. Validates that
 * each id is in the party and not fainted; auto-fills with available battle-ready party members
 * if fewer than 3 valid ids are supplied (ensures the fight always starts).
 */
export function lockTrainerTeam(
  state: PokeRemGameState,
  ids: string[],
): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'team_select') return state;
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const mon = state.party.find((p) => p.id === id);
    if (!mon || mon.currentHp <= 0) continue;
    seen.add(id);
    picked.push(id);
    if (picked.length === 3) break;
  }
  if (picked.length < 3) {
    for (const p of state.party) {
      if (picked.length >= 3) break;
      if (seen.has(p.id) || p.currentHp <= 0) continue;
      seen.add(p.id);
      picked.push(p.id);
    }
  }
  if (picked.length === 0) return state;
  while (picked.length < 3) picked.push(picked[picked.length - 1]!);
  const lead = picked[0]!;
  return withTouch({
    ...state,
    activePokemonId: lead,
    currentTrainerBattle: {
      ...battle,
      phase: 'active',
      selectedPartyIds: picked,
      activeEnemyIndex: 0,
      feedbackSeq: battle.feedbackSeq + 1,
      lastLog: `${battle.trainer.className} sent out ${battle.enemies[0]?.name ?? 'their first Pokémon'}!`,
    },
  });
}

/** Find next non-fainted, selected party id (cycles forward from current lead). */
function nextSelectedPartyId(
  battle: TrainerBattleState,
  party: OwnedPokemon[],
  startId: string | null,
): string | null {
  const order = battle.selectedPartyIds;
  if (order.length === 0) return null;
  const startIdx = startId ? order.indexOf(startId) : -1;
  for (let i = 1; i <= order.length; i++) {
    const id = order[(startIdx + i + order.length) % order.length]!;
    if (battle.faintedSelectedIds.includes(id)) continue;
    const mon = party.find((p) => p.id === id);
    if (!mon || mon.currentHp <= 0) continue;
    return id;
  }
  return null;
}

/**
 * One trainer-battle combat exchange: player chosen mon strikes the active enemy; if it survives,
 * the enemy strikes back. Drives KOs, enemy advancement, party fainting (no switching back),
 * and final win/loss resolution.
 */
export function applyTrainerCombatTurn(
  state: PokeRemGameState,
  moveId?: string,
): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'active') return state;

  let aid = state.activePokemonId;
  if (!aid || !battle.selectedPartyIds.includes(aid)) {
    const next = nextSelectedPartyId(battle, state.party, null);
    if (!next) return resolveTrainerBattle(state, 'loss');
    aid = next;
  }
  const activeIdx = state.party.findIndex((p) => p.id === aid);
  if (activeIdx < 0) return resolveTrainerBattle(state, 'loss');
  const active = state.party[activeIdx]!;
  if (active.currentHp <= 0) {
    return continueAfterPartyFaint(state, battle, aid!);
  }

  const enemy = battle.enemies[battle.activeEnemyIndex];
  if (!enemy || enemy.defeated || enemy.currentHp <= 0) {
    return advanceEnemyOrFinish(state, battle);
  }

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

  const pDmg = damageForMove(active.level, chosen, active.types, enemy.types);
  const wHp = Math.max(0, enemy.currentHp - pDmg);
  const atkXp = applyXpDoublerMultiplier(
    state,
    xpFromPlayerAttack({ damage: pDmg, moveId: chosen, defenderTypes: enemy.types }),
  );

  // Apply player's attack XP up front (always); HP damage propagates below.
  let party = state.party.map((p, i) =>
    i === activeIdx ? growPokemonWithXp(p, atkXp).pokemon : p,
  );

  if (wHp <= 0) {
    // Enemy KO'd — apply defeat XP, mark defeated, then either advance or finish.
    const defeatXp = applyXpDoublerMultiplier(
      state,
      Math.max(8, Math.floor(XP_ON_DEFEAT * (1 + Math.max(0, enemy.level - active.level) * 0.05))),
    );
    party = party.map((p, i) =>
      i === activeIdx ? growPokemonWithXp(p, defeatXp).pokemon : p,
    );
    const enemies = battle.enemies.map((e, i) =>
      i === battle.activeEnemyIndex ? { ...e, currentHp: 0, defeated: true } : e,
    );
    const log = `${active.nickname || active.name} defeated ${enemy.name}!`;
    const next: TrainerBattleState = {
      ...battle,
      enemies,
      lastLog: log,
      feedbackSeq: battle.feedbackSeq + 1,
    };
    const allDown = enemies.every((e) => e.defeated || e.currentHp <= 0);
    if (allDown) {
      return resolveTrainerBattle(
        { ...state, party, currentTrainerBattle: next },
        'win',
      );
    }
    return advanceEnemyOrFinish(
      { ...state, party, currentTrainerBattle: next },
      next,
    );
  }

  // Enemy counter-attack
  const enemyMoves = enemy.moves && enemy.moves.length > 0 ? enemy.moves : ['tackle'];
  const wMoveId =
    enemyMoves.find((m) => (MOVES[m]?.power ?? 0) > 0) ?? enemyMoves[0]!;
  const wDmg = damageForMove(enemy.level, wMoveId, enemy.types, active.types);
  const nextPlayerHp = Math.max(0, Math.floor(active.currentHp - wDmg));
  const takeXp = applyXpDoublerMultiplier(
    state,
    xpFromTakingHit({ damage: wDmg, wildMoveId: wMoveId, playerTypes: active.types }),
  );

  const enemies = battle.enemies.map((e, i) =>
    i === battle.activeEnemyIndex ? { ...e, currentHp: wHp } : e,
  );

  if (nextPlayerHp <= 0) {
    party = party.map((p, i) => {
      if (i !== activeIdx) return p;
      const grown = growPokemonWithXp(p, takeXp).pokemon;
      return { ...grown, currentHp: 0 };
    });
    const log = `${active.nickname || active.name} fainted!`;
    const fainted = [...battle.faintedSelectedIds];
    if (!fainted.includes(aid!)) fainted.push(aid!);
    const updated: TrainerBattleState = {
      ...battle,
      enemies,
      faintedSelectedIds: fainted,
      lastLog: log,
      feedbackSeq: battle.feedbackSeq + 1,
    };
    const stateMid = { ...state, party, currentTrainerBattle: updated };
    return continueAfterPartyFaint(stateMid, updated, aid!);
  }

  party = party.map((p, i) => {
    if (i !== activeIdx) return p;
    const grown = growPokemonWithXp(p, takeXp).pokemon;
    return { ...grown, currentHp: nextPlayerHp };
  });

  const log = `${active.nickname || active.name} used ${moveDisplayName(chosen)}! ${enemy.name} used ${moveDisplayName(wMoveId)}!`;
  return withTouch({
    ...state,
    party,
    currentTrainerBattle: {
      ...battle,
      enemies,
      lastLog: log,
      feedbackSeq: battle.feedbackSeq + 1,
    },
  });
}

/** Bring out the next selected party Pokémon, or end the battle in defeat if none remain. */
function continueAfterPartyFaint(
  state: PokeRemGameState,
  battle: TrainerBattleState,
  faintedId: string,
): PokeRemGameState {
  const next = nextSelectedPartyId(battle, state.party, faintedId);
  if (!next) {
    return resolveTrainerBattle(state, 'loss');
  }
  return withTouch({
    ...state,
    activePokemonId: next,
    currentTrainerBattle: {
      ...battle,
      lastLog: `Go, ${state.party.find((p) => p.id === next)?.nickname ?? state.party.find((p) => p.id === next)?.name ?? 'next'}!`,
      feedbackSeq: battle.feedbackSeq + 1,
    },
  });
}

/** Advance to the next enemy slot (or end in victory if all are KO'd). */
function advanceEnemyOrFinish(
  state: PokeRemGameState,
  battle: TrainerBattleState,
): PokeRemGameState {
  const nextIdx = battle.enemies.findIndex(
    (e, i) => i > battle.activeEnemyIndex && !e.defeated && e.currentHp > 0,
  );
  if (nextIdx === -1) {
    const anyAlive = battle.enemies.some((e) => !e.defeated && e.currentHp > 0);
    if (!anyAlive) return resolveTrainerBattle(state, 'win');
    return state;
  }
  const enemy = battle.enemies[nextIdx]!;
  return withTouch({
    ...state,
    currentTrainerBattle: {
      ...battle,
      activeEnemyIndex: nextIdx,
      lastLog: `${battle.trainer.className} sent out ${enemy.name}!`,
      feedbackSeq: battle.feedbackSeq + 1,
    },
  });
}

/**
 * Finalize a trainer battle. On `win`, generates rewards (coins/items/trainer XP/optional XP doubler),
 * applies them to state, and surfaces a catch offer. On `loss`, leaves party HP/faint states intact.
 */
export function resolveTrainerBattle(
  state: PokeRemGameState,
  outcome: 'win' | 'loss',
  rng: () => number = Math.random,
): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle) return state;
  if (battle.phase === 'post_win' || battle.phase === 'post_loss') return state;

  const stats = state.trainerBattleStats ?? createInitialTrainerBattleStats();
  const isElite = battle.tier === 'elite';

  if (outcome === 'loss') {
    const updatedStats: TrainerBattleStats = {
      ...stats,
      standardLost: stats.standardLost + (isElite ? 0 : 1),
      eliteLost: stats.eliteLost + (isElite ? 1 : 0),
      currentWinStreak: 0,
    };
    const post: TrainerBattleState = {
      ...battle,
      phase: 'post_loss',
      lastLog: battle.trainer.victoryLine,
      feedbackSeq: battle.feedbackSeq + 1,
    };
    return withTouch({
      ...state,
      currentTrainerBattle: post,
      trainerBattleStats: updatedStats,
      ...bumpBattleOutcome(
        state,
        'faint',
        `Defeated by ${battle.trainer.className}. Better luck next session.`,
      ),
    });
  }

  const avgLevel = averageOwnedPartyLevel(state.party);
  const reward = generateTrainerRewards(battle.tier, avgLevel, rng);
  const bag: Record<ItemId, number> = { ...state.bag };
  for (const [iid, qty] of Object.entries(reward.items)) {
    if (!qty || qty <= 0) continue;
    if (!ITEM_BY_ID.has(iid as ItemId)) continue;
    bag[iid as ItemId] = (bag[iid as ItemId] ?? 0) + qty;
  }
  if (reward.xpDoublerTier) {
    const doublerItem = xpDoublerItemForTier(reward.xpDoublerTier);
    bag[doublerItem] = (bag[doublerItem] ?? 0) + 1;
  }

  const newStreak = stats.currentWinStreak + 1;
  const updatedStats: TrainerBattleStats = {
    ...stats,
    standardWon: stats.standardWon + (isElite ? 0 : 1),
    eliteWon: stats.eliteWon + (isElite ? 1 : 0),
    totalWon: stats.totalWon + 1,
    currentWinStreak: newStreak,
    longestWinStreak: Math.max(stats.longestWinStreak, newStreak),
  };

  const post: TrainerBattleState = {
    ...battle,
    phase: 'post_win',
    catchOfferActive: true,
    catchOfferClaimed: false,
    rewardSnapshot: reward,
    lastLog: battle.trainer.defeatLine,
    feedbackSeq: battle.feedbackSeq + 1,
  };

  const subline = [
    `+${reward.coins} coins`,
    reward.xpDoublerTier ? `${reward.xpDoublerTier === 'rare' ? 'Rare' : reward.xpDoublerTier === 'legendary' ? 'Legendary' : 'Common'} XP Doubler` : '',
    `+${reward.trainerXp} TR XP`,
  ]
    .filter(Boolean)
    .join(' · ');

  const noticeQueue = [...(state.mainNoticeQueue ?? [])];
  noticeQueue.push({
    kind: 'trainer_battle_result',
    id: `tb_result_${battle.id}`,
    title: isElite ? `Elite Trainer defeated!` : `Trainer defeated!`,
    subtitle: subline.slice(0, 220),
  });

  return withTouch(
    addTrainerXp(
      {
        ...state,
        bag,
        currency: (state.currency ?? 0) + reward.coins,
        totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + reward.coins,
        currentTrainerBattle: post,
        trainerBattleStats: updatedStats,
        mainNoticeQueue: noticeQueue.slice(-12),
        ...bumpBattleOutcome(
          state,
          'defeat',
          `${battle.trainer.className} was defeated! ${reward.headline}`,
        ),
      },
      reward.trainerXp,
    ),
  );
}

/**
 * Attempt to catch one of the three defeated enemies (post-win pick). Mirrors wild-catch rules:
 * on a miss the ball is consumed but the offer stays active so the player can try again (with
 * the same or a different Pokémon, or buy more balls from the shop). On a successful catch the
 * offer is marked `catchOfferClaimed` and the Pokémon is added to the collection.
 */
export function claimTrainerCatch(
  state: PokeRemGameState,
  enemyIndex: number,
  ball: 'poke-ball' | 'great-ball' | 'ultra-ball' = 'poke-ball',
): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'post_win') return state;
  if (!battle.catchOfferActive || battle.catchOfferClaimed) return state;
  if (enemyIndex < 0 || enemyIndex >= battle.enemies.length) return state;
  const ballCount = state.bag[ball] ?? 0;
  if (ballCount <= 0) return state;
  const enemy = battle.enemies[enemyIndex]!;
  const active = activePokemon(state);
  const chance = trainerCatchChance(enemy, active, ball, battle.tier);
  const success = Math.random() < chance;
  const bag: Record<ItemId, number> = { ...state.bag, [ball]: Math.max(0, ballCount - 1) };
  if (!success) {
    // Miss: consume the ball, bump feedback, leave the catch offer open so the player can retry.
    const stillOpen: TrainerBattleState = {
      ...battle,
      catchOfferActive: true,
      catchOfferClaimed: false,
      feedbackSeq: battle.feedbackSeq + 1,
      lastLog: `${enemy.name} broke free!`,
    };
    return withTouch({ ...state, bag, currentTrainerBattle: stillOpen });
  }

  const closed: TrainerBattleState = {
    ...battle,
    catchOfferActive: false,
    catchOfferClaimed: true,
    feedbackSeq: battle.feedbackSeq + 1,
    lastLog: `${enemy.name} was caught!`,
  };

  const enc = trainerEnemyAsEncounter(enemy);
  const mon: OwnedPokemon = {
    id: uid(),
    dexNum: enc.dexNum,
    name: enc.name,
    level: enc.level,
    totalXp: xpThresholdForLevel(enc.level),
    currentHp: enc.maxHp,
    maxHp: enc.maxHp,
    types: enc.types,
    moves: getInitialMoves(enc.dexNum, enc.level),
  };
  const collectionDex = {
    ...state.collectionDex,
    [enc.dexNum]: (state.collectionDex[enc.dexNum] ?? 0) + 1,
  };
  const ds = ensureDailyStats(state).dailyStats!;
  if (state.party.length >= 6) {
    return withTouch(
      addTrainerXp(
        {
          ...state,
          bag,
          collectionDex,
          pendingCaughtMon: mon,
          selectedTab: 'party',
          totalCaught: (state.totalCaught ?? 0) + 1,
          currency: (state.currency ?? 0) + CURRENCY_REWARDS.catch,
          totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + CURRENCY_REWARDS.catch,
          dailyStats: { ...ds, catches: ds.catches + 1 },
          currentTrainerBattle: closed,
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

  const withRoster = addCaughtToRoster(
    { ...state, bag, collectionDex, currentTrainerBattle: closed },
    mon,
  );
  return withTouch(
    addTrainerXp(
      {
        ...withRoster,
        totalCaught: (state.totalCaught ?? 0) + 1,
        currency: (state.currency ?? 0) + CURRENCY_REWARDS.catch,
        totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + CURRENCY_REWARDS.catch,
        dailyStats: { ...ds, catches: ds.catches + 1 },
        ...bumpBattleOutcome(state, 'catch_success', `Caught ${enc.name}!`),
      },
      TRAINER_XP_SOURCES.catch,
    ),
  );
}

/**
 * Player gives up on the post-win catch offer without actually throwing. Closes the catch window
 * but keeps the rest of the post-win banner visible so the player can still review rewards and
 * then head back to studying.
 */
export function dismissTrainerCatchOffer(state: PokeRemGameState): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'post_win') return state;
  if (!battle.catchOfferActive) return state;
  return withTouch({
    ...state,
    currentTrainerBattle: {
      ...battle,
      catchOfferActive: false,
      catchOfferClaimed: true,
      feedbackSeq: battle.feedbackSeq + 1,
      lastLog: 'Walked away from the catch offer.',
    },
  });
}

/** Mark a given PokéRem version's "What's New" card as acknowledged (dismiss). */
export function acknowledgeWhatsNew(state: PokeRemGameState, version: string): PokeRemGameState {
  if (state.whatsNewSeenVersion === version) return state;
  return withTouch({ ...state, whatsNewSeenVersion: version });
}

/** Close the trainer battle popup and return to studying. */
export function closeTrainerBattle(state: PokeRemGameState): PokeRemGameState {
  if (!state.currentTrainerBattle) return state;
  return withTouch({
    ...state,
    currentTrainerBattle: null,
    selectedTab: state.selectedTab === 'status' ? 'status' : state.selectedTab,
  });
}

const EXP_CANDY_S_XP = 45;

export function useHealingItem(state: PokeRemGameState, itemId: string): PokeRemGameState {
  if (isTrainerBattleActive(state)) return state;
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

  if (mon.currentHp <= 0) {
    const msg = 'Fainted Pokémon must be revived with a Revive before they can be healed.';
    return withTouch({ ...state, ...bumpBattleOutcome(state, 'none', msg) });
  }

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
  if (isTrainerBattleActive(state)) return state;
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
    const targetTotalXp = xpThresholdForLevel(newLevel);
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
  const storagePokemon = state.storagePokemon.map((p) => {
    if (p.id !== pokemonId) return p;
    return { ...p, moves: (p.moves ?? []).filter((m) => m !== moveId) };
  });
  return withTouch({ ...state, party, storagePokemon });
}

/**
 * Teach a move manually from the Party screen. Only moves unlocked on this species' level-up
 * table at its current level (plus type legality). If the moveset is full (4),
 * pass `replaceIndex` 0–3 to overwrite that slot.
 */
export function learnMoveAction(
  state: PokeRemGameState,
  pokemonId: string,
  moveId: string,
  replaceIndex?: number,
): PokeRemGameState {
  const move = MOVES[moveId];
  if (!move) return state;

  const apply = (mon: OwnedPokemon): OwnedPokemon | null => {
    if (mon.id !== pokemonId) return null;
    const unlocked = new Set(getUnlockedLearnsetMoveIds(mon.dexNum, mon.level));
    if (!unlocked.has(moveId)) return null;
    if (!isMoveTypeLegalForSpecies(mon.types, move)) return null;
    const cur = dedupeMoveIds([...(mon.moves ?? [])]);
    if (cur.includes(moveId)) return null;
    let next: string[];
    if (cur.length < 4) {
      next = [...cur, moveId];
    } else {
      if (replaceIndex === undefined || replaceIndex < 0 || replaceIndex > 3) return null;
      next = [...cur];
      next[replaceIndex] = moveId;
    }
    return { ...mon, moves: next };
  };

  let partyHit = false;
  const party = state.party.map((p) => {
    const u = apply(p);
    if (u) {
      partyHit = true;
      return u;
    }
    return p;
  });
  if (partyHit) return withTouch({ ...state, party });

  let storageHit = false;
  const storagePokemon = state.storagePokemon.map((p) => {
    const u = apply(p);
    if (u) {
      storageHit = true;
      return u;
    }
    return p;
  });
  if (storageHit) return withTouch({ ...state, storagePokemon });

  return state;
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
  if (def.prestigeBadgeId) {
    const existing = next.prestigeBadges ?? [];
    if (!existing.includes(def.prestigeBadgeId)) {
      next = { ...next, prestigeBadges: [...existing, def.prestigeBadgeId] };
    }
  }
  next.mainNoticeQueue = (next.mainNoticeQueue ?? []).filter(
    (n) => !(n.kind === 'achievement_unlock' && n.id === id),
  );
  return withTouch(next);
}

/** Claim every unlocked-but-unclaimed achievement in one go. */
export function claimAllAchievements(state: PokeRemGameState): PokeRemGameState {
  let next = state;
  const claimed = new Set(state.claimedAchievementIds ?? []);
  for (const def of ACHIEVEMENT_DEFS) {
    if (!state.achievements[def.id]) continue;
    if (claimed.has(def.id)) continue;
    next = claimAchievement(next, def.id);
  }
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
  next = {
    ...next,
    mainNoticeQueue: (next.mainNoticeQueue ?? []).filter(
      (n) => !(n.kind === 'trainer_reward' && n.id === `reward-${level}`),
    ),
  };
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
  const span = xpSpanForCurrentLevel(mon.totalXp);
  const cur = xpIntoCurrentLevel(mon.totalXp);
  return Math.max(0, Math.min(100, (cur / span) * 100));
}
