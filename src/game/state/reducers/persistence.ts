import type { TeamId } from '../../engine/rarity';
import { ivsFor, battleStats } from '../../engine/pokemonStats';
import { EVOLUTION_TABLE } from '../../data/evolutions';
import { isStarterLine } from '../../engine/evolution';
import { ITEM_BY_ID, STARTING_BAG, type ItemId } from '../../data/items';
import { SPECIES_BY_DEX } from '../../data/species';
import { ACHIEVEMENT_DEFS, deriveAchievements } from '../../engine/achievements';
import { withOptimalMoves } from '../../engine/movesetOptimizer';
import {
  dedupeMoveIds,
  getInitialMoves,
  getUnlockedLearnsetMoveIds,
  LEARNSETS,
} from '../../engine/moveLearn';
import { MOVES } from '../../data/moves';
import {
  ROUTE_BIOME_BY_ID,
  ROUTE_TICKET_WILDS,
  TRAINER_CARD_STYLE_BY_ID,
} from '../../engine/sinks';
import { normalizeQuestState } from '../../engine/quests';
import { levelFromXp, maxHpFor } from '../../engine/progression';
import {
  clampStudyReviews,
  clampStudyWeight,
  type StudyDifficultyPreset,
} from '../../engine/studyDifficulty';
import { REVIEWS_PER_ENCOUNTER } from '../../constants';
import { trainerLevelFromXp } from '../../engine/trainerLevel';
import {
  AREA_MAX_ENCOUNTERS,
  SCENE_INDEX_VERSION,
  clampBattleSceneIndex,
  normalizeBattleSceneIndex,
  rollAreaLength
} from '../../engine/battleAmbience';
import type { RouteFindRollResult } from '../../engine/routeFinds';
import type {
  AreaState,
  PokeRemGameState,
  BattleOutcomeKind,
  CombatStrikeSnapshot,
  BattleResult,
  EncounterPokemon,
  ShinyLogEntry,
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
} from '../model';

export function sanitizeEncounterHp(enc: EncounterPokemon): EncounterPokemon {
  const maxHp = Math.max(1, Math.floor(enc.maxHp));
  let currentHp =
    typeof enc.currentHp === 'number' && Number.isFinite(enc.currentHp)
      ? Math.floor(enc.currentHp)
      : maxHp;
  currentHp = Math.max(0, Math.min(maxHp, currentHp));
  return { ...enc, maxHp, currentHp };
}

export function uid(): string {
  return `pk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function cloneBagDefaults() {
  return { ...STARTING_BAG };
}

export function createInitialStateV4(): PokeRemGameState {
  return {
    schemaVersion: 5,
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

export function bumpBattleOutcome(
  base: PokeRemGameState,
  kind: BattleOutcomeKind,
  lastBattleLog: string,
  lastCombatStrike: CombatStrikeSnapshot | null = null
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

export function applyRouteFindToState(
  state: PokeRemGameState,
  roll: RouteFindRollResult
): PokeRemGameState {
  const bag = { ...state.bag };
  bag[roll.itemId] = (bag[roll.itemId] ?? 0) + roll.quantity;
  return {
    ...state,
    bag,
    routeFindNoticeSeq: (state.routeFindNoticeSeq ?? 0) + 1,
    routeFindNotice: roll.notice,
  };
}

export function normalizeOwned(mon: OwnedPokemon): OwnedPokemon {
  const species = SPECIES_BY_DEX.get(mon.dexNum);
  const level = mon.level || levelFromXp(mon.totalXp);
  const ivs = ivsFor(mon);
  const maxHp = battleStats({ ...mon, level, ivs }).hp;
  const ratio = mon.maxHp > 0 ? Math.max(0, Math.min(1, mon.currentHp / mon.maxHp)) : 1;
  const old = mon.moves ?? [];
  const eligible = new Set(getUnlockedLearnsetMoveIds(mon.dexNum, level));
  const visited = new Set<number>();
  const addAncestors = (dex: number) => {
    if (visited.has(dex)) return;
    visited.add(dex);
    for (const evo of EVOLUTION_TABLE.filter((e) => e.toDex === dex)) {
      for (const id of getUnlockedLearnsetMoveIds(evo.fromDex, level)) eligible.add(id);
      addAncestors(evo.fromDex);
    }
  };
  addAncestors(mon.dexNum);
  const tutorMoves = dedupeMoveIds(
    (mon.tutorMoves ?? []).filter(
      (id) =>
        typeof id === 'string' &&
        MOVES[id] &&
        (LEARNSETS[mon.dexNum] ?? []).some((e) => e.moveId === id)
    )
  );
  for (const id of tutorMoves) eligible.add(id);
  const valid = dedupeMoveIds(old).filter((id) => eligible.has(id));
  const hadInvalid = old.some((id) => !eligible.has(id));
  // Refill only slots an invalid legacy move vacated, so a deliberately dropped move stays dropped.
  const repaired =
    !hadInvalid && valid.length
      ? valid.slice(0, 4)
      : [...new Set([...valid, ...getInitialMoves(mon.dexNum, level)])].slice(
          0,
          Math.max(valid.length, Math.min(4, old.length || 4))
        );
  return {
    ...mon,
    ivs,
    name: mon.name || species?.name || `#${mon.dexNum}`,
    types: species?.types ?? mon.types ?? ['Normal'],
    level,
    maxHp,
    currentHp: mon.currentHp <= 0 ? 0 : Math.min(maxHp, Math.max(1, Math.round(maxHp * ratio))),
    moves: repaired,
    legacyMoves: hadInvalid ? [...new Set([...(mon.legacyMoves ?? []), ...old])] : mon.legacyMoves,
    tutorMoves: tutorMoves.length ? tutorMoves : undefined,
    shiny: mon.shiny === true ? true : undefined,
  };
}

function normalizeRouteTicket(raw: unknown): { biome: string; remaining: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as { biome?: unknown; remaining?: unknown };
  if (typeof t.biome !== 'string' || !ROUTE_BIOME_BY_ID.has(t.biome)) return null;
  const remaining =
    typeof t.remaining === 'number' && Number.isFinite(t.remaining) ? Math.floor(t.remaining) : 0;
  return remaining > 0
    ? { biome: t.biome, remaining: Math.min(remaining, ROUTE_TICKET_WILDS * 99) }
    : null;
}

function normalizeCardStyles(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = [
    ...new Set(
      raw.filter((id): id is string => typeof id === 'string' && TRAINER_CARD_STYLE_BY_ID.has(id))
    ),
  ];
  return ids.length ? ids : undefined;
}

/** Most recent command nonces kept in the save (see commandChannel.ts). */
export const RECENT_COMMAND_NONCE_LIMIT = 30;

function normalizeCommandNonces(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 40);
  return ids.length ? ids.slice(-RECENT_COMMAND_NONCE_LIMIT) : undefined;
}

/** Creation time encoded in an owned id (`pk_<ms>_…`); unknown ids sort last. */
function idTime(id: string): number {
  const m = /^pk_(\d+)_/.exec(id);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

/**
 * Your original starter. Keeps a saved id while that Pokémon is still owned; otherwise picks the
 * earliest-caught owned Pokémon from a starter's evolution line (evolving keeps the id, so it's still there).
 */
export function normalizeStarterId(raw: unknown, state: PokeRemGameState): string | undefined {
  const owned = [...state.party, ...state.storagePokemon];
  if (typeof raw === 'string' && owned.some((p) => p.id === raw)) return raw;
  let best: OwnedPokemon | undefined;
  for (const p of owned) {
    if (!isStarterLine(p.dexNum)) continue;
    if (!best || idTime(p.id) < idTime(best.id)) best = p;
  }
  return best?.id;
}

function normalizeTeam(raw: unknown): TeamId | undefined {
  return raw === 'ember' || raw === 'tide' || raw === 'volt' ? raw : undefined;
}

/** The saved area, or a fresh one in the current scene (older saves, damaged data). */
export function normalizeArea(raw: unknown, sceneIndex: number): AreaState {
  const a = raw && typeof raw === 'object' ? (raw as Partial<AreaState>) : {};
  const left =
    typeof a.encountersLeft === 'number' && Number.isFinite(a.encountersLeft)
      ? Math.max(0, Math.min(AREA_MAX_ENCOUNTERS, Math.floor(a.encountersLeft)))
      : rollAreaLength(Math.random);
  // The area always matches the scene on screen, so the two can never disagree.
  return { sceneIndex, encountersLeft: left, ...(a.isNew === true ? { isNew: true } : {}) };
}

function normalizeEquippedStyle(raw: unknown, owned: unknown): string | undefined {
  if (typeof raw !== 'string' || raw === 'classic') return undefined;
  return normalizeCardStyles(owned)?.includes(raw) ? raw : undefined;
}

function normalizeBattleResult(raw: unknown): BattleResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<BattleResult>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  if ((r.kind !== 'defeat' && r.kind !== 'catch') || typeof r.name !== 'string') return null;
  return {
    seq: num(r.seq),
    kind: r.kind,
    name: r.name.slice(0, 60),
    dexNum: num(r.dexNum),
    monName: typeof r.monName === 'string' ? r.monName.slice(0, 60) : '',
    xp: num(r.xp),
    coins: num(r.coins),
    fromLevel: num(r.fromLevel),
    toLevel: num(r.toLevel),
    xpPctBefore: Math.max(0, Math.min(100, num(r.xpPctBefore))),
    xpPctAfter: Math.max(0, Math.min(100, num(r.xpPctAfter))),
    newMoves: Array.isArray(r.newMoves)
      ? r.newMoves.filter((m): m is string => typeof m === 'string').slice(0, 8)
      : [],
    evolvedInto: typeof r.evolvedInto === 'string' ? r.evolvedInto : undefined,
    shiny: r.shiny === true || undefined,
    perfectIvs: r.perfectIvs === true || undefined,
  };
}

function normalizeShinyLog(raw: unknown): ShinyLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is ShinyLogEntry =>
        !!e && typeof e === 'object' && typeof e.dexNum === 'number' && typeof e.name === 'string'
    )
    .map((e) => ({
      dexNum: e.dexNum,
      name: e.name,
      caughtAt: typeof e.caughtAt === 'string' ? e.caughtAt : '',
      card: typeof e.card === 'number' ? e.card : 0,
      perfectIvs: e.perfectIvs === true || undefined,
    }))
    .slice(-200);
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
    reviews:
      typeof d.reviews === 'number' && Number.isFinite(d.reviews)
        ? Math.max(0, Math.floor(d.reviews))
        : 0,
    encounters:
      typeof d.encounters === 'number' && Number.isFinite(d.encounters)
        ? Math.max(0, Math.floor(d.encounters))
        : 0,
    catches:
      typeof d.catches === 'number' && Number.isFinite(d.catches)
        ? Math.max(0, Math.floor(d.catches))
        : 0,
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
        : (species?.name ?? '???');
  const level = typeof e.level === 'number' ? e.level : 2;
  const maxHp = typeof e.maxHp === 'number' ? e.maxHp : maxHpFor(species?.baseHp ?? 40, level);
  const currentHp = typeof e.currentHp === 'number' ? e.currentHp : maxHp;
  const types =
    Array.isArray(e.types) && (e.types as unknown[]).length
      ? (e.types as EncounterPokemon['types'])
      : (species?.types ?? ['Normal']);
  const tier = typeof e.tier === 'string' ? e.tier : undefined;
  const shiny = e.shiny === true;
  return sanitizeEncounterHp({
    dexNum,
    name,
    level,
    maxHp,
    currentHp,
    types: species?.types ?? types,
    tier,
    shiny,
    ivs: ivsFor({ dexNum, ivs: e.ivs as any }),
    condition: e.condition as any,
  });
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
    activePokemonId:
      typeof v1.activePokemonId === 'string' ? v1.activePokemonId : (party[0]?.id ?? null),
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

export function normalizeStudyHealCarriesSlice(raw: unknown, partyLen: number): number[] {
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
    typeof remRaw === 'number' && Number.isFinite(remRaw) ? Math.max(0, Math.floor(remRaw)) : null;
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
    typeof e.name === 'string' && e.name.length > 0 ? e.name : (species?.name ?? `#${dexNum}`);
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
      : (species?.types ?? ['Normal']);
  const moves = Array.isArray(e.moves)
    ? (e.moves as unknown[]).filter((m): m is string => typeof m === 'string' && !!MOVES[m])
    : [];
  const defeated = e.defeated === true || currentHp <= 0;
  return {
    dexNum,
    name,
    level,
    maxHp,
    currentHp,
    types: species?.types ?? types,
    moves,
    defeated,
    ivs: ivsFor({ dexNum, ivs: e.ivs as any }),
    condition: e.condition as any,
  };
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
    themeTypes: Array.isArray(t.themeTypes) ? (t.themeTypes as TrainerIdentity['themeTypes']) : [],
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
      typeof r.coins === 'number' && Number.isFinite(r.coins)
        ? Math.max(0, Math.floor(r.coins))
        : 0,
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
    ? (t.selectedPartyIds as unknown[])
        .filter((x): x is string => typeof x === 'string')
        .slice(0, 3)
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

  const party = Array.isArray(o.party)
    ? o.party.map((p: OwnedPokemon) => withOptimalMoves(normalizeOwned(p)))
    : [];

  const state: PokeRemGameState = {
    ...base,
    ...o,
    party,
    storagePokemon: Array.isArray(o.storagePokemon) ? o.storagePokemon.map(normalizeOwned) : [],
    bag: { ...cloneBagDefaults(), ...(o.bag ?? {}) },
    achievements: { ...base.achievements, ...(o.achievements ?? {}) },
    claimedAchievementIds,
    selectedTab: (o.pendingCaughtMon && legacySchema < 5
      ? 'status'
      : (o.selectedTab ?? 'status')) as SectionTab,
    lastBattleLog:
      typeof o.lastBattleLog === 'string' && o.lastBattleLog.length <= 2000 ? o.lastBattleLog : '',
    lastOutcomeKind: sanitizeOutcomeKind(o.lastOutcomeKind),
    battleFeedbackSeq: typeof o.battleFeedbackSeq === 'number' ? o.battleFeedbackSeq : 0,
    lastCombatStrike: normalizeCombatStrike(o.lastCombatStrike),
    currentEncounter: normalizeEncounter(o.currentEncounter),
    trainerXp: typeof o.trainerXp === 'number' ? o.trainerXp : 0,
    trainerLevel:
      typeof o.trainerLevel === 'number'
        ? o.trainerLevel
        : trainerLevelFromXp(typeof o.trainerXp === 'number' ? o.trainerXp : 0),
    claimedRewardLevels: Array.isArray(o.claimedRewardLevels) ? o.claimedRewardLevels : [],
    studyDifficultyPreset: normalizeStudyDifficultyPreset(o.studyDifficultyPreset),
    studyReviewsPerEncounter: clampStudyReviews(
      typeof o.studyReviewsPerEncounter === 'number'
        ? o.studyReviewsPerEncounter
        : REVIEWS_PER_ENCOUNTER
    ),
    studyCardWeight: clampStudyWeight(
      typeof o.studyCardWeight === 'number' ? o.studyCardWeight : 1
    ),
    studyDifficultyConfigured: o.studyDifficultyConfigured === true,
    // The legacy remap shifts indexes, so it runs once per save; after that the index is only clamped.
    battleSceneIndex:
      (o as { sceneIndexVersion?: unknown }).sceneIndexVersion === SCENE_INDEX_VERSION
        ? clampBattleSceneIndex(o.battleSceneIndex)
        : normalizeBattleSceneIndex(o.battleSceneIndex),
    sceneIndexVersion: SCENE_INDEX_VERSION,
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
    routeFindNoticeAckSeq:
      typeof o.routeFindNoticeAckSeq === 'number' ? o.routeFindNoticeAckSeq : 0,
    routeFindNotice: normalizeRouteFindNotice(o.routeFindNotice),
    studyHealCarries: normalizeStudyHealCarriesSlice(
      (o as { studyHealCarries?: unknown }).studyHealCarries,
      party.length
    ),
    mainNoticeQueue: normalizeMainNoticeQueue(
      (o as { mainNoticeQueue?: unknown }).mainNoticeQueue,
      12
    ),
    xpBoosterActive: normalizeXpDoublerEntry((o as { xpBoosterActive?: unknown }).xpBoosterActive),
    xpBoosterQueue: normalizeXpDoublerQueue((o as { xpBoosterQueue?: unknown }).xpBoosterQueue, 8),
    trainerBattleCounter:
      typeof o.trainerBattleCounter === 'number' && Number.isFinite(o.trainerBattleCounter)
        ? Math.max(0, Math.floor(o.trainerBattleCounter))
        : 0,
    currentTrainerBattle: normalizeTrainerBattleState(
      (o as { currentTrainerBattle?: unknown }).currentTrainerBattle
    ),
    trainerBattleStats: normalizeTrainerBattleStats(
      (o as { trainerBattleStats?: unknown }).trainerBattleStats
    ),
    prestigeBadges: normalizePrestigeBadges((o as { prestigeBadges?: unknown }).prestigeBadges),
    whatsNewSeenVersion:
      typeof o.whatsNewSeenVersion === 'string' && o.whatsNewSeenVersion.length <= 20
        ? o.whatsNewSeenVersion
        : undefined,
    quests: normalizeQuestState((o as { quests?: unknown }).quests),
    enabledGenerations: normalizeEnabledGenerations(
      (o as { enabledGenerations?: unknown }).enabledGenerations
    ),
    encountersSinceShiny:
      typeof o.encountersSinceShiny === 'number' && Number.isFinite(o.encountersSinceShiny)
        ? Math.max(0, Math.floor(o.encountersSinceShiny))
        : 0,
    lastBattleResult: normalizeBattleResult((o as { lastBattleResult?: unknown }).lastBattleResult),
    shinyLog: normalizeShinyLog((o as { shinyLog?: unknown }).shinyLog),
    routeTicket: normalizeRouteTicket((o as { routeTicket?: unknown }).routeTicket),
    ownedCardStyles: normalizeCardStyles((o as { ownedCardStyles?: unknown }).ownedCardStyles),
    trainerCardStyle: normalizeEquippedStyle(
      (o as { trainerCardStyle?: unknown }).trainerCardStyle,
      (o as { ownedCardStyles?: unknown }).ownedCardStyles
    ),
    wildIdleCards:
      typeof o.wildIdleCards === 'number' && Number.isFinite(o.wildIdleCards)
        ? Math.max(0, Math.floor(o.wildIdleCards))
        : 0,
    area: undefined,
    team: normalizeTeam((o as { team?: unknown }).team),
    teamPrompted: (o as { teamPrompted?: unknown }).teamPrompted === true || undefined,
    recentCommandNonces: normalizeCommandNonces((o as { recentCommandNonces?: unknown }).recentCommandNonces),
    schemaVersion: 5,
  };
  if (state.selectedTab === 'battle') {
    state.selectedTab = 'status';
  }
  state.area = normalizeArea((o as { area?: unknown }).area, state.battleSceneIndex);
  state.starterId = normalizeStarterId((o as { starterId?: unknown }).starterId, state);
  state.collectionDex = registerOwnedSpecies(state.collectionDex, ownedMons(state));
  state.achievements = deriveAchievements(state);

  if (legacySchema === 2) {
    const unlockedIds = ACHIEVEMENT_DEFS.filter((d) => state.achievements[d.id]).map((d) => d.id);
    state.claimedAchievementIds = unlockedIds;
    state.studyDifficultyPreset = 'medium';
    state.studyReviewsPerEncounter = REVIEWS_PER_ENCOUNTER;
    state.studyCardWeight = 1;
    state.studyDifficultyConfigured = true;
  }

  // A save with Pokémon is past setup, whatever its flags say, so a returning player is never
  // sent back to the starter or difficulty screens.
  if (state.party.length > 0 || state.storagePokemon.length > 0) state.starterChosen = true;
  if (state.starterChosen && state.cardsReviewed > 0) state.studyDifficultyConfigured = true;

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
      schemaVersion: 5,
      claimedAchievementIds: unlockedIds,
      studyDifficultyPreset: 'medium',
      studyReviewsPerEncounter: REVIEWS_PER_ENCOUNTER,
      studyCardWeight: 1,
      studyDifficultyConfigured: true,
    };
  }
  if (o.schemaVersion === 2) return parseGameStateCore(o, 2);
  if (o.schemaVersion === 3 || o.schemaVersion === 4 || o.schemaVersion === 5) {
    return parseGameStateCore(o, o.schemaVersion);
  }
  // Unknown or newer schema (say, from a later build on another device): keep the data rather than
  // starting over, as long as it looks like a game save.
  if (Array.isArray(o.party) || typeof o.cardsReviewed === 'number') return parseGameStateCore(o, 5);
  return createInitialStateV4();
}

/**
 * Every species you own (party, storage, a pending catch) counts as registered in the Pokédex.
 * Covers starters and every evolution path, and backfills older saves where those were missed.
 */
export function registerOwnedSpecies(
  dex: Record<number, number> | undefined,
  mons: Iterable<OwnedPokemon | null | undefined>
): Record<number, number> {
  const base = dex ?? {};
  let next: Record<number, number> | null = null;
  for (const m of mons) {
    if (!m || typeof m.dexNum !== 'number') continue;
    if ((base[m.dexNum] ?? 0) > 0 || (next?.[m.dexNum] ?? 0) > 0) continue;
    next = next ?? { ...base };
    next[m.dexNum] = 1;
  }
  return next ?? base;
}

export function normalizeEnabledGenerations(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const gens = [
    ...new Set(raw.filter((g): g is number => Number.isInteger(g) && g >= 1 && g <= 9)),
  ].sort((a, b) => a - b);
  return gens.length > 0 ? gens : undefined;
}

export function ownedMons(state: PokeRemGameState): (OwnedPokemon | null | undefined)[] {
  return [...state.party, ...state.storagePokemon, state.pendingCaughtMon];
}
