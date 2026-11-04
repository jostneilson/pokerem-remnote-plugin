import { capacityGain, fitFoundItems } from '../../engine/capacity';
import { scaledXp } from '../../engine/xpShare';
import { BALANCE, catchCoins } from '../../balance';
import { damageCeiling, type Fighter } from '../../engine/moveMechanics';
import { isPerfectIVs, rollIVs, battleStats } from '../../engine/pokemonStats';
import { ITEM_BY_ID, type ItemId } from '../../data/items';
import { SPECIES_BY_DEX, type PokemonType } from '../../data/species';
import { ACHIEVEMENT_DEFS, deriveAchievements } from '../../engine/achievements';
import { withOptimalMoves } from '../../engine/movesetOptimizer';
import { checkLevelEvolution, applyEvolution } from '../../engine/evolution';
import {
  checkLearnMoves,
  getInitialMoves,
  getUnlockedLearnsetMoveIds,
  pickDefaultBattleMove,
} from '../../engine/moveLearn';
import { MOVES } from '../../data/moves';
import { CURRENCY_REWARDS } from '../../engine/shop';
import { getEffectiveness } from '../../data/typeChart';
import { computeTrainerRank } from '../../engine/trainerRank';
import { rollQuests } from '../../engine/quests';
import {
  levelFromXp,
  xpIntoCurrentLevel,
  xpSpanForCurrentLevel,
  xpThresholdForLevel,
} from '../../engine/progression';
import { XP_ON_DEFEAT } from '../../constants';
import { trainerLevelFromXp, TRAINER_XP_SOURCES, TRAINER_REWARDS } from '../../engine/trainerLevel';
import type { TrainerFrequencyKey } from '../../engine/trainerBattles';
import type {
  PokeRemGameState,
  AchievementState,
  BattleResult,
  EncounterPokemon,
  OwnedPokemon,
  SectionTab,
} from '../model';
import {
  bumpBattleOutcome,
  normalizeOwned,
  ownedMons,
  registerOwnedSpecies,
  uid,
} from './persistence';

export function addTrainerXp(state: PokeRemGameState, amount: number): PokeRemGameState {
  const trainerXp = (state.trainerXp ?? 0) + amount;
  return { ...state, trainerXp };
}

export function addBagQuantities(
  state: PokeRemGameState,
  delta: Partial<Record<ItemId, number>>
): PokeRemGameState {
  const keys = Object.keys(delta);
  if (keys.length === 0) return state;
  // Items that don't fit a full bag become coins (SPEC L14).
  const fit = fitFoundItems(state, delta);
  if (fit.coins <= 0) return { ...state, bag: fit.bag };
  return {
    ...state,
    bag: fit.bag,
    currency: (state.currency ?? 0) + fit.coins,
    totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + fit.coins,
  };
}

/** "Storage +10 · Bag +20" when reaching `lv` grows capacity (SPEC U6). */
function capacityLine(lv: number): string | null {
  const g = capacityGain(lv - 1, lv);
  return g.storage || g.bag ? `Storage +${g.storage} · Bag +${g.bag}` : null;
}

function appendMainNoticesIfNeeded(
  state: PokeRemGameState,
  preAch: AchievementState,
  preTrainerLevel: number
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
      subtitle: 'Claim it here or in Menu → Trainer.',
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
        subtitle: capacityLine(lv) ? `${r.description} · ${capacityLine(lv)}` : r.description,
      });
    }
  }

  return { ...state, mainNoticeQueue: queue.slice(0, 12) };
}

export function withTouch(state: PokeRemGameState): PokeRemGameState {
  const preAch = { ...(state.achievements ?? {}) };
  const preTrainerLevel = state.trainerLevel ?? 1;
  const initialize = (p: OwnedPokemon) => (p.ivs ? p : normalizeOwned(p));
  // Party Pokémon (and a fresh catch) always carry their best moves; storage gets them on joining the party.
  const battleReady = (p: OwnedPokemon) => withOptimalMoves(initialize(p));
  const next: PokeRemGameState = {
    ...state,
    schemaVersion: 5,
    party: state.party.map(battleReady),
    storagePokemon: state.storagePokemon.map(initialize),
    pendingCaughtMon: state.pendingCaughtMon ? battleReady(state.pendingCaughtMon) : null,
    lastUpdatedAt: Date.now(),
  };
  next.collectionDex = registerOwnedSpecies(next.collectionDex, ownedMons(next));
  if (next.starterChosen) next.quests = rollQuests(next);
  next.achievements = deriveAchievements(next);
  next.trainerLevel = trainerLevelFromXp(next.trainerXp ?? 0);
  next.trainerRank = computeTrainerRank(next);
  return appendMainNoticesIfNeeded(next, preAch, preTrainerLevel);
}

/** Close the post-battle result card. */
export function dismissBattleResult(state: PokeRemGameState): PokeRemGameState {
  if (!state.lastBattleResult) return state;
  return withTouch({ ...state, lastBattleResult: null });
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

export function activePokemon(state: PokeRemGameState): OwnedPokemon | undefined {
  return state.party.find((p) => p.id === state.activePokemonId);
}

export function ensureDailyStats(state: PokeRemGameState): PokeRemGameState {
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

function addCaughtToRoster(state: PokeRemGameState, mon: OwnedPokemon): PokeRemGameState {
  if (state.party.length < 6) return { ...state, party: [...state.party, mon] };
  return { ...state, storagePokemon: [...state.storagePokemon, mon] };
}

/** Any battle action on the wild restarts its flee timer. */
export function resetWildIdle(prev: PokeRemGameState, next: PokeRemGameState): PokeRemGameState {
  return next === prev || !next.wildIdleCards ? next : { ...next, wildIdleCards: 0 };
}

/** Owned Pokémon built from a caught encounter (wild or trainer). */
function ownedFromEncounter(enc: EncounterPokemon): OwnedPokemon {
  const ivs = enc.ivs ?? rollIVs();
  // Caught Pokémon get their full owned HP (wild battle HP is scaled down).
  const maxHp = battleStats({ dexNum: enc.dexNum, level: enc.level, ivs }).hp;
  return {
    id: uid(),
    dexNum: enc.dexNum,
    name: enc.name,
    level: enc.level,
    totalXp: xpThresholdForLevel(enc.level),
    currentHp: maxHp,
    maxHp,
    types: enc.types,
    moves: getInitialMoves(enc.dexNum, enc.level),
    shiny: enc.shiny === true,
    ivs,
  };
}

/**
 * Every successful catch, wild or trainer, goes through here: Pokédex count, party or storage
 * (or the full-party swap prompt), type-share XP, coins, daily stats and trainer XP.
 */
/** Moves a Pokémon unlocks between two levels, by display name. */
function movesUnlockedBetween(dexNum: number, fromLevel: number, toLevel: number): string[] {
  if (toLevel <= fromLevel) return [];
  const before = new Set(getUnlockedLearnsetMoveIds(dexNum, fromLevel));
  return getUnlockedLearnsetMoveIds(dexNum, toLevel)
    .filter((id) => !before.has(id))
    .map((id) => MOVES[id]?.name ?? id);
}

export function battleResult(
  state: PokeRemGameState,
  kind: BattleResult['kind'],
  enc: EncounterPokemon,
  before: OwnedPokemon,
  after: OwnedPokemon,
  xp: number,
  coins: number,
  evolvedInto?: string
): BattleResult {
  return {
    seq: (state.battleFeedbackSeq ?? 0) + 1,
    kind,
    name: enc.name,
    dexNum: enc.dexNum,
    monName: evolvedInto ? before.nickname || before.name : after.nickname || after.name,
    xp,
    coins,
    fromLevel: before.level,
    toLevel: after.level,
    xpPctBefore: kind === 'catch' ? 0 : xpProgressPercent(before),
    xpPctAfter: xpProgressPercent(after),
    newMoves: kind === 'catch' ? [] : movesUnlockedBetween(after.dexNum, before.level, after.level),
    evolvedInto,
    shiny: enc.shiny === true || undefined,
    perfectIvs: kind === 'catch' && isPerfectIVs(after.ivs) ? true : undefined,
    ...(enc.bounty ? { bounty: enc.bounty } : {}),
  };
}

export function grantCatch(base: PokeRemGameState, enc: EncounterPokemon): PokeRemGameState {
  const mon = ownedFromEncounter(enc);
  const coins = catchCoins(enc.level, enc.dexNum) + (enc.bounty ?? 0);
  const caughtInfo = {
    lastBattleResult: battleResult(base, 'catch', enc, mon, mon, 0, coins),
    shinyLog: enc.shiny
      ? [
          ...(base.shinyLog ?? []),
          {
            dexNum: enc.dexNum,
            name: enc.name,
            caughtAt: new Date().toISOString(),
            card: base.cardsReviewed,
            perfectIvs: isPerfectIVs(mon.ivs) || undefined,
          },
        ].slice(-200)
      : base.shinyLog,
  };
  const collectionDex = {
    ...base.collectionDex,
    [enc.dexNum]: (base.collectionDex[enc.dexNum] ?? 0) + 1,
  };
  const pre = ensureDailyStats({ ...base, collectionDex });
  const ds = pre.dailyStats!;
  const rewards = {
    ...caughtInfo,
    totalCaught: (base.totalCaught ?? 0) + 1,
    currency: (base.currency ?? 0) + coins,
    totalCurrencyEarned: (base.totalCurrencyEarned ?? 0) + coins,
    dailyStats: { ...ds, catches: ds.catches + 1 },
  };

  if (base.party.length >= 6) {
    const typeBoost = applyTypeShareXpBoost(
      pre.party,
      pre.storagePokemon,
      enc.types,
      mon.id,
      enc.level,
      base
    );
    return withTouch(
      addTrainerXp(
        {
          ...pre,
          ...rewards,
          party: typeBoost.party,
          storagePokemon: typeBoost.storagePokemon,
          pendingCaughtMon: mon,
          selectedTab: 'status',
          ...bumpBattleOutcome(
            base,
            'catch_success',
            `Caught ${enc.name}! Party is full — choose who goes to storage.`
          ),
        },
        TRAINER_XP_SOURCES.catch
      )
    );
  }

  const withRoster = addCaughtToRoster(pre, mon);
  const typeBoost = applyTypeShareXpBoost(
    withRoster.party,
    withRoster.storagePokemon,
    enc.types,
    mon.id,
    enc.level,
    base
  );
  return withTouch(
    addTrainerXp(
      {
        ...withRoster,
        ...rewards,
        party: typeBoost.party,
        storagePokemon: typeBoost.storagePokemon,
        ...bumpBattleOutcome(base, 'catch_success', `Caught ${enc.name}!`),
      },
      TRAINER_XP_SOURCES.catch
    )
  );
}

export function growPokemonWithXp(
  mon: OwnedPokemon,
  xpDelta: number
): {
  pokemon: OwnedPokemon;
  leveledUp: boolean;
  evolvedMon: OwnedPokemon | null;
  evolvedFromName: string;
} {
  if (xpDelta <= 0) {
    return { pokemon: mon, leveledUp: false, evolvedMon: null, evolvedFromName: '' };
  }
  const totalXp = mon.totalXp + xpDelta;
  // Older saves can hold more levels than their XP implies; XP must never lower a level.
  const level = Math.max(mon.level, levelFromXp(totalXp));
  const maxHp = battleStats({ ...mon, level }).hp;
  const prevLevel = mon.level;
  let updated: OwnedPokemon = {
    ...mon,
    totalXp,
    level,
    maxHp,
    currentHp:
      mon.currentHp <= 0 ? 0 : Math.min(maxHp, mon.currentHp + (level > prevLevel ? 10 : 0)),
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

export interface TypeShareXpResult {
  party: OwnedPokemon[];
  storagePokemon: OwnedPokemon[];
  boostedCount: number;
}

export function applyTypeShareXpBoost(
  party: OwnedPokemon[],
  storagePokemon: OwnedPokemon[],
  targetTypes: PokemonType[],
  excludeId?: string,
  targetLevel: number = 5,
  /** For the doubler, catch-up and buddy multipliers (every XP source gets them). */
  state?: PokeRemGameState
): TypeShareXpResult {
  if (!targetTypes || targetTypes.length === 0) {
    return { party, storagePokemon, boostedCount: 0 };
  }
  const typeSet = new Set(targetTypes);
  const b = BALANCE.xp;
  const partyBoost = Math.max(b.typeSharePartyBase, b.typeSharePartyBase + Math.floor(targetLevel * b.typeSharePartyPerLevel));
  const storageBoost = Math.max(b.typeShareStorageBase, b.typeShareStorageBase + Math.floor(targetLevel * b.typeShareStoragePerLevel));
  let boostedCount = 0;
  const xpFor = (mon: OwnedPokemon, boost: number) =>
    state ? scaledXp(state, mon, boost * b.typeShareMult) : Math.round(boost * b.typeShareMult);

  const nextParty = party.map((mon) => {
    if (mon.id === excludeId) return mon;
    const shares = mon.types && mon.types.some((t) => typeSet.has(t));
    if (!shares) return mon;
    boostedCount++;
    return growPokemonWithXp(mon, xpFor(mon, partyBoost)).pokemon;
  });

  const nextStorage = storagePokemon.map((mon) => {
    if (mon.id === excludeId) return mon;
    const shares = mon.types && mon.types.some((t) => typeSet.has(t));
    if (!shares) return mon;
    boostedCount++;
    return growPokemonWithXp(mon, xpFor(mon, storageBoost)).pokemon;
  });

  return { party: nextParty, storagePokemon: nextStorage, boostedCount };
}

export function computeDefeatXp(state: PokeRemGameState): number {
  const enc = state.currentEncounter;
  if (!enc) return XP_ON_DEFEAT;
  return knockoutXp(enc, activePokemon(state));
}

/** Trainer Pokémon are worth more than wild ones, as in the main series. */
export const TRAINER_KO_XP_MULT = 1.5;

/** XP for knocking out a foe: level, rarity, type advantage and level gap (wild and trainer alike). */
export function knockoutXp(
  foe: { level: number; tier?: string; types: PokemonType[]; dexNum?: number },
  activeP: OwnedPokemon | undefined
): number {
  const tier = foe.tier ?? (foe.dexNum != null ? SPECIES_BY_DEX.get(foe.dexNum)?.tier : undefined);
  let xp = 10 + foe.level * 2;
  const tierMult = tier === 'Mythical' ? 5 : tier === 'Legendary' ? 3 : tier === 'Ultra' ? 2 : 1;
  xp = Math.round(xp * tierMult);
  if (
    activeP &&
    foe.types.length > 0 &&
    activeP.types.some((t) => getEffectiveness(t, foe.types) >= 2)
  ) {
    xp = Math.round(xp * 1.45);
  }
  if (activeP) {
    const gap = Math.max(0, foe.level - activeP.level);
    xp = Math.round(xp * (1 + Math.min(0.55, gap * 0.045)));
  }
  return Math.max(8, Math.round(xp * BALANCE.xp.knockoutMult));
}

/**
 * One combat exchange: player move (damage wild), then wild counter (damage player, min 1 HP).
 * If wild HP hits 0, delegates to {@link defeatEncounter} for XP / evolution.
 */
/** Highest-damage legal move against this foe, so a plain Fight is never a wasted turn. */
export function bestMoveAgainst(
  attacker: Fighter,
  foe: Fighter,
  legalMoves: string[]
): string | undefined {
  let best = pickDefaultBattleMove(legalMoves);
  let bestDamage = best ? damageCeiling(attacker, foe, best, false) : 0;
  for (const id of legalMoves) {
    const damage = damageCeiling(attacker, foe, id, false);
    if (damage > bestDamage) {
      best = id;
      bestDamage = damage;
    }
  }
  return best;
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

/** Mark a given PokéRem version's "What's New" card as acknowledged (dismiss). */
export function acknowledgeWhatsNew(state: PokeRemGameState, version: string): PokeRemGameState {
  if (state.whatsNewSeenVersion === version) return state;
  return withTouch({ ...state, whatsNewSeenVersion: version });
}

export function xpProgressPercent(mon: OwnedPokemon): number {
  const span = xpSpanForCurrentLevel(mon.totalXp);
  const cur = xpIntoCurrentLevel(mon.totalXp);
  return Math.max(0, Math.min(100, (cur / span) * 100));
}
