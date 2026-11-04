import { rollBounty } from '../../balance';
import { BALANCE } from '../../balance';
import { scaledXp, studyXpBase } from '../../engine/xpShare';
import type { ItemId } from '../../data/items';
import { recommendedBall, spawnEncounter, wildCatchChancePreview } from '../../engine/encounters';
import { isEventSpecies } from '../../engine/speciesPool';
import { ROUTE_BIOME_BY_ID, ticketScene } from '../../engine/sinks';
import { CURRENCY_REWARDS } from '../../engine/shop';
import {
  clampStudyReviews,
  clampStudyWeight,
  STUDY_PRESET_DEFAULTS,
  type StudyDifficultyPreset,
} from '../../engine/studyDifficulty';
import {
  REVIEWS_PER_ENCOUNTER,
  ROUTE_FIND_REVIEWS_DEFAULT,
  WILD_FLEE_AFTER_CARDS,
} from '../../constants';
import { TRAINER_XP_SOURCES } from '../../engine/trainerLevel';
import {
  makeXpDoublerEntry,
  xpDoublerItemForTier,
  XP_DOUBLER_QUEUE_MAX,
} from '../../engine/xpDoublers';
import {
  rollTrainerBattleReplacement,
  DEFAULT_TRAINER_FREQUENCY,
  isTrainerFrequencyEnabled,
  parseTrainerFrequencyKey,
  type TrainerFrequencyKey,
} from '../../engine/trainerBattles';
import { BATTLE_SCENE_COUNT, rollAreaLength } from '../../engine/battleAmbience';
import { rollTravelRouteFind } from '../../engine/routeFinds';
import type { AreaState, PokeRemGameState, XpDoublerTier } from '../model';
import {
  type QueueCardCompleteOptions,
  activePokemon,
  addTrainerXp,
  ensureDailyStats,
  growPokemonWithXp,
  withTouch,
} from './core';
import {
  applyRouteFindToState,
  bumpBattleOutcome,
  normalizeEnabledGenerations,
  normalizeStudyHealCarriesSlice,
} from './persistence';
import { closeTrainerBattle, startRocketBattle, startTrainerBattle } from './trainer';
import { ROCKET_SHARE } from '../../engine/rocket';
import { cancelPendingCaught } from './battle';

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
  return addTrainerXp(
    { ...state, lastStudyDate: today, currentStreak, longestStreak },
    TRAINER_XP_SOURCES.streakDay
  );
}

export function onQueueCardComplete(
  state: PokeRemGameState,
  enabledGens?: number[],
  encounterRate?: number,
  options?: QueueCardCompleteOptions
): PokeRemGameState {
  const reviewed = state.cardsReviewed + 1;
  let working = ensureDailyStats(state);
  if (
    enabledGens &&
    enabledGens.length > 0 &&
    enabledGens.join() !== (working.enabledGenerations ?? []).join()
  ) {
    working = { ...working, enabledGenerations: normalizeEnabledGenerations(enabledGens) };
  }
  const d0 = working.dailyStats!;
  working = { ...working, dailyStats: { ...d0, reviews: d0.reviews + 1 } };

  if (!working.starterChosen || !working.activePokemonId) {
    return withTouch({ ...working, cardsReviewed: reviewed });
  }

  // Update daily streak (only after starter)
  working = updateStreak(working);
  const cash = rollStudyCashBonus(Math.random);
  if (cash.amount)
    working = {
      ...working,
      currency: working.currency + cash.amount,
      totalCurrencyEarned: working.totalCurrencyEarned + cash.amount,
    };
  working = {
    ...working,
    lastStudyReward: { seq: reviewed, leadXp: 0, benchXp: 0, bonus: cash.amount, tier: cash.tier },
  };

  const autoClear = options?.autoClearLog !== false;
  const clearedLog = autoClear && !working.currentEncounter ? clearBattleLog(working) : working;

  if (working.currentEncounter || working.currentTrainerBattle || working.pendingCaughtMon) {
    // Pause progression while a wild encounter or trainer battle is on screen — XP and doubler
    // ticks still apply (study reward), but we don't add to wild progress or trainer counter.
    const withXp = applyPartyStudyXpOnCard(clearedLog, Math.random);
    const withTick = tickXpDoublerOnCard(withXp);
    const reviewCash = Math.round(
      CURRENCY_REWARDS.review * Math.max(0, Math.min(2, options?.reviewWeight ?? 1))
    );
    const paused = {
      ...withTick,
      cardsReviewed: reviewed,
      currency: withTick.currency + reviewCash,
      totalCurrencyEarned: withTick.totalCurrencyEarned + reviewCash,
    };
    const tb = paused.currentTrainerBattle;
    if (tb && tb.phase !== 'active') {
      // An unanswered challenge (or a finished battle left open) moves on, so encounters resume.
      const idle = (paused.wildIdleCards ?? 0) + 1;
      if (idle < WILD_FLEE_AFTER_CARDS) return withTouch({ ...paused, wildIdleCards: idle });
      const who = [tb.trainer.className, tb.trainer.displayName].filter(Boolean).join(' ');
      const closed = closeTrainerBattle(paused);
      if (closed.currentEncounter?.pendingPrize) return { ...closed, wildIdleCards: 0 };
      return {
        ...closed,
        wildIdleCards: 0,
        ...bumpBattleOutcome(
          closed,
          'none',
          tb.phase === 'team_select' ? `${who} moved on. Another trainer will challenge you soon.` : 'Back to studying.'
        ),
      };
    }
    if (paused.pendingCaughtMon && !paused.currentTrainerBattle) {
      // Reviewing on instead of choosing a swap sends the new catch to storage, so encounters never wait.
      return { ...cancelPendingCaught(paused), wildIdleCards: 0 };
    }
    const enc = paused.currentEncounter;
    if (enc && !paused.currentTrainerBattle) {
      const idle = (paused.wildIdleCards ?? 0) + 1;
      if (idle >= WILD_FLEE_AFTER_CARDS && !enc.shiny && !isEventSpecies(enc.dexNum)) {
        return withTouch({
          ...paused,
          currentEncounter: null,
          wildIdleCards: 0,
          ...bumpBattleOutcome(paused, 'run', `The wild ${enc.name} wandered off.`),
        });
      }
      return withTouch({ ...paused, wildIdleCards: idle });
    }
    return withTouch(paused);
  }

  const modulo =
    typeof options?.encounterPacingModulo === 'number' && options.encounterPacingModulo >= 2
      ? Math.floor(options.encounterPacingModulo)
      : 1;
  const countsTowardWild = modulo <= 1 || reviewed % modulo === 0;
  const rwRaw = options?.reviewWeight;
  const reviewWeight =
    typeof rwRaw === 'number' && Number.isFinite(rwRaw) ? Math.max(0, Math.min(2, rwRaw)) : 1;

  const ermRaw = options?.encounterReviewMultiplier;
  const encounterReviewMultiplier =
    typeof ermRaw === 'number' && Number.isFinite(ermRaw)
      ? Math.max(1, Math.min(50, Math.floor(ermRaw)))
      : 1;
  /** Wild/route units per counted completion — not scaled by reviewWeight (XP/coins still are). */
  const wildRouteUnits = encounterReviewMultiplier;

  let encounterProgress = clearedLog.encounterProgress;
  if (countsTowardWild) {
    encounterProgress += wildRouteUnits;
  }

  const trainerFreq: TrainerFrequencyKey = parseTrainerFrequencyKey(
    options?.trainerFrequency ?? DEFAULT_TRAINER_FREQUENCY
  );
  const trainerCounter = (clearedLog.trainerBattleCounter ?? 0) + (countsTowardWild ? 1 : 0);

  const currencyEarned = Math.round(CURRENCY_REWARDS.review * reviewWeight);
  const trainerXpCard = Math.round(TRAINER_XP_SOURCES.cardReview * reviewWeight);
  let next: PokeRemGameState = addTrainerXp(
    {
      ...clearedLog,
      cardsReviewed: reviewed,
      encounterProgress,
      wildReviewAccum: 0,
      trainerBattleCounter: trainerCounter,
      currency: (clearedLog.currency ?? 0) + currencyEarned,
      totalCurrencyEarned: (clearedLog.totalCurrencyEarned ?? 0) + currencyEarned,
    },
    trainerXpCard
  );
  next = applyPartyStudyXpOnCard(next, Math.random);
  next = tickXpDoublerOnCard(next);
  next = keepTeamBattleReady(next);

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
            ? `Your team is resting. Wild Pokémon return in ${Math.max(1, WILD_FLEE_AFTER_CARDS - (next.wildIdleCards ?? 0))} cards, or heal now.`
            : ''
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
        next =
          Math.random() < ROCKET_SHARE
            ? startRocketBattle(next, enabledGens ?? [1], Math.random)
            : startTrainerBattle(next, trainerTier, enabledGens ?? [1], Math.random);
      } else {
        const rarityBonus = Math.max(0, effectiveRate - REVIEWS_PER_ENCOUNTER);
        const ticket = next.routeTicket && next.routeTicket.remaining > 0 ? next.routeTicket : null;
        const area = nextArea(next.area, next.battleSceneIndex ?? 0, ticket?.biome ?? null, Math.random);
        const bgNext = area.sceneIndex;
        if (ticket)
          next = {
            ...next,
            routeTicket:
              ticket.remaining > 1 ? { ...ticket, remaining: ticket.remaining - 1 } : null,
          };
        const spawned = spawnEncounter(next.party, next.cardsReviewed, enabledGens, rarityBonus, {
          collectionDex: next.collectionDex ?? {},
          pacing: { reviewsPerEncounter: effectiveRate, modulo, unitsPerReview: wildRouteUnits },
          sceneIndex: bgNext,
          encountersSinceShiny: next.encountersSinceShiny ?? 0,
          team: next.team,
        });
        const bounty = rollBounty();
        const enc = bounty ? { ...spawned, bounty } : spawned;
        const tierLabel = enc.tier && enc.tier !== 'Common' ? ` (${enc.tier})` : '';
        const narr = `Wild ${enc.name}${tierLabel} appeared!`;
        const ds = next.dailyStats!;
        next = {
          ...next,
          encounterProgress: 0,
          currentEncounter: enc,
          selectedTab: 'status',
          battleSceneIndex: bgNext,
          area,
          encountersSinceShiny: enc.shiny ? 0 : (next.encountersSinceShiny ?? 0) + 1,
          wildIdleCards: 0,
          lastBattleResult: null,
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

function applyPartyStudyXpOnCard(state: PokeRemGameState, rng: () => number): PokeRemGameState {
  const aid = state.activePokemonId;
  if (!aid) return state;
  const leadIdx = state.party.findIndex((p) => p.id === aid);
  if (leadIdx < 0) return state;
  let leadXp = 0,
    benchXp = 0;
  // XP Share: every member earns the same study XP (the lead a little more), boosted for anyone behind.
  const party = state.party.map((p, i) => {
    const delta = scaledXp(state, p, studyXpBase(i === leadIdx), rng);
    if (i === leadIdx) leadXp += delta;
    else benchXp += delta;
    if (delta <= 0) return p;
    const { pokemon } = growPokemonWithXp(p, delta);
    return pokemon;
  });
  return {
    ...state,
    party,
    lastStudyReward: {
      seq: state.lastStudyReward?.seq ?? state.cardsReviewed,
      bonus: state.lastStudyReward?.bonus ?? 0,
      tier: state.lastStudyReward?.tier,
      leadXp,
      benchXp,
    },
  };
}

/**
 * Activate an XP Doubler from the bag. If one is already active, queue the new one
 * (oldest-first). Consumes one unit of the doubler's bag count. Returns state unchanged
 * if the queue is full or the bag has none of the requested doubler.
 */
/**
 * Studying never stalls on a fainted lead: a teammate who can still battle takes over, and a
 * team that is fully down rests while you study, back at half HP after `WILD_FLEE_AFTER_CARDS` cards.
 */
function keepTeamBattleReady(state: PokeRemGameState): PokeRemGameState {
  const lead = activePokemon(state);
  if (!lead || lead.currentHp > 0) return state;
  const ready = state.party.filter((p) => p.currentHp > 0);
  if (ready.length > 0) {
    const next = ready.reduce((best, p) => (p.currentHp / p.maxHp > best.currentHp / best.maxHp ? p : best));
    return {
      ...state,
      activePokemonId: next.id,
      ...bumpBattleOutcome(
        state,
        'none',
        `${lead.nickname || lead.name} is resting. ${next.nickname || next.name} takes the lead!`
      ),
    };
  }
  const rested = (state.wildIdleCards ?? 0) + 1;
  if (rested < WILD_FLEE_AFTER_CARDS) return { ...state, wildIdleCards: rested };
  return {
    ...state,
    wildIdleCards: 0,
    party: state.party.map((p) => ({ ...p, currentHp: Math.max(1, Math.ceil(p.maxHp / 2)), condition: undefined })),
    ...bumpBattleOutcome(state, 'none', 'Your team rested while you studied and is ready again at half HP.'),
  };
}

/**
 * The area for the wild about to spawn. The arena stays put for the area's 5–8 encounters, then moves to a
 * different scene (so it never changes mid-encounter or on a plain card). A route ticket keeps you in its biome.
 */
export function nextArea(
  current: AreaState | undefined,
  sceneIndex: number,
  ticketBiome: string | null,
  rng: () => number
): AreaState {
  const inTicketBiome = ticketBiome ? (ROUTE_BIOME_BY_ID.get(ticketBiome)?.scenes.includes(sceneIndex) ?? false) : true;
  const left = current?.encountersLeft ?? 0;
  if (left > 1 && inTicketBiome) return { sceneIndex, encountersLeft: left - 1 };
  const scene =
    (ticketBiome ? ticketScene(ticketBiome, sceneIndex, rng) : null) ??
    (sceneIndex + 1 + Math.floor(rng() * (BATTLE_SCENE_COUNT - 1))) % BATTLE_SCENE_COUNT;
  return { sceneIndex: scene, encountersLeft: rollAreaLength(rng), isNew: true };
}

export function activateXpDoubler(state: PokeRemGameState, tier: XpDoublerTier): PokeRemGameState {
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
  countsTowardWild: boolean
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
  const act = activePokemon(state);
  const ball = recommendedBall(state.bag, enc, act);
  const chance = wildCatchChancePreview(enc, act, ball);
  const pct = Math.round(chance * 100);
  const ballName =
    ball === 'ultra-ball' ? 'Ultra Ball' : ball === 'great-ball' ? 'Great Ball' : 'Poké Ball';
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
    ...bumpBattleOutcome(
      state,
      'none',
      `Scope reading: ~${pct}% with your next ${ballName}. ${vibe}`
    ),
  });
}

export function configureStudyDifficulty(
  state: PokeRemGameState,
  preset: StudyDifficultyPreset,
  custom?: { reviews?: number; weight?: number }
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

export function rollStudyCashBonus(rng: () => number): { amount: number; tier?: string } {
  const r = rng();
  const range = (a: number, b: number) =>
    a + Math.floor(Math.max(0, Math.min(0.999999, rng())) * (b - a + 1));
  const row = BALANCE.studyCash.find((t) => r < t.upTo);
  return row ? { amount: range(row.min, row.max), tier: row.tier } : { amount: 0 };
}
