/**
 * Balance harness (SPEC Part C): plays many simulated players through weeks of studying under different
 * play styles and pacing, and measures progression, income and rarities against the target bands.
 * `scripts/balance-tune.ts` runs it and writes docs/update-1.6.0/BALANCE_REPORT.md; `balance.test.ts`
 * asserts the bands on a smaller sample.
 */
import type { OwnedPokemon, PokeRemGameState } from '../state/model';
import * as store from '../state/store';
import { trainerLevelCoins } from '../state/reducers/core';
import { recommendedBall, wildCatchChancePreview } from '../engine/encounters';
import { BALANCE, THEME_SHOP } from '../balance';
import { EVENT_MIN_PARTY_LEVEL, EVENT_MIN_REVIEWS, GALARIAN_BIRDS } from '../engine/rarity';
import { encounterBaseLevel, isEventSpecies } from '../engine/speciesPool';
import { seededRng } from './simulate';
import { catchBlockedByStorage, storageCap } from '../engine/capacity';

export type PolicyId = 'keep-team' | 'swap-in' | 'collector' | 'fighter' | 'farmer' | 'idle';
export const POLICIES: PolicyId[] = [
  'keep-team',
  'swap-in',
  'collector',
  'fighter',
  'farmer',
  'idle'
];
export type PacingId = 'easy' | 'medium' | 'hard';

export type CoinSource =
  'card' | 'defeat' | 'catch' | 'trainer' | 'claims' | 'milestones' | 'transfer' | 'other';

export interface DaySample {
  day: number;
  cards: number;
  partyAvg: number;
  partyTop: number;
  partyBottom: number;
  coinsEarned: number;
  /** One-time milestone payouts in `coinsEarned`: achievements and trainer-level coins (the income bands measure the recurring rest). */
  milestoneCoins: number;
  storage: number;
}

export interface BalanceRun {
  policy: PolicyId;
  pacing: PacingId;
  seed: number;
  days: DaySample[];
  coinsBySource: Record<CoinSource, number>;
  /** Variable cash: lucky card rolls, bounties, Rocket caches (subset of the sources above). */
  variableCoins: number;
  /** Variable reward subset already booked to defeat/catch/trainer sources; remove it from battle share. */
  variableBattleCoins: number;
  /** Base review coins only: lucky rolls and streak rewards are not card trickle. */
  cardTrickle: number;
  coinsSpentBySource: Record<CoinSource, number>;
  encounters: number;
  /** Ordinary wilds (not birds, legendaries or prizes): the shiny band's denominator. */
  plainEncounters: number;
  /** Shinies among `plainEncounters` (birds' 25% and the Leader's 1/5 are separate rolls). */
  shinies: number;
  birds: number;
  legendaries: number;
  /** Cards reviewed while the wild-legendary gate (party L25+, 500 cards) was open. */
  legendaryCards: number;
  /** Started Leader battles (not merely prize encounters observed on a later card). */
  rocketLeaders: number;
  leaderWins: number;
  trainerBattles: number;
  trainerWins: number;
  ordinaryCombatTurns: number;
  ordinaryLeadFaints: number;
  firstShinyDay: number | null;
  /** Mean level gap: new catch level minus party average at the time. */
  catchGap: number;
  /** First day storage reached capacity (null = never). */
  storageFullDay: number | null;
  final: PokeRemGameState;
}

export interface BalanceConfig {
  policies?: PolicyId[];
  pacings?: PacingId[];
  seeds?: number[];
  days?: number;
  cardsPerDay?: number;
  starter?: number;
  enabledGens?: number[];
}

const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAY_MS = 86_400_000;
const START_MS = Date.UTC(2026, 0, 5, 12);
const MAX_TURNS = 40;

/** Run `fn` with a seeded Math.random and a clock the caller can move (quests and streaks read the date). */
function withSimWorld<T>(seed: number, fn: (setDay: (d: number) => void) => T): T {
  const realRandom = Math.random;
  const RealDate = Date;
  let now = START_MS;
  class SimDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(now);
      else super(...(args as [number]));
    }
    static now() {
      return now;
    }
  }
  Math.random = seededRng(seed);
  (globalThis as { Date: DateConstructor }).Date = SimDate as unknown as DateConstructor;
  try {
    return fn((d) => {
      now = START_MS + d * DAY_MS;
    });
  } finally {
    Math.random = realRandom;
    (globalThis as { Date: DateConstructor }).Date = RealDate;
  }
}

function partyLevels(s: PokeRemGameState) {
  const lv = s.party.map((p) => p.level);
  return {
    avg: lv.reduce((a, b) => a + b, 0) / Math.max(1, lv.length),
    top: Math.max(0, ...lv),
    bottom: lv.length ? Math.min(...lv) : 0
  };
}

/** Transfer when the build has it (1.6.0 T4.1), else release (pays nothing). */
function transferOut(s: PokeRemGameState, ids: string[]): PokeRemGameState {
  const t = (
    store as unknown as {
      transferPokemon?: (s: PokeRemGameState, ids: string[]) => PokeRemGameState;
    }
  ).transferPokemon;
  if (typeof t === 'function') return t(s, ids);
  return ids.reduce((acc, id) => store.releasePokemon(acc, id), s);
}

const ivScore = (p: OwnedPokemon) =>
  p.ivs ? Object.values(p.ivs).reduce((a: number, b) => a + (b as number), 0) : 0;

/** Storage Pokémon worth keeping: shinies, favourites, event species and the best of each species. */
function spareStorageIds(s: PokeRemGameState, keepBest = true): string[] {
  const best = new Map<number, OwnedPokemon>();
  for (const p of [...s.party, ...s.storagePokemon]) {
    const b = best.get(p.dexNum);
    if (!b || ivScore(p) > ivScore(b) || (ivScore(p) === ivScore(b) && p.level > b.level))
      best.set(p.dexNum, p);
  }
  return s.storagePokemon
    .filter(
      (p) =>
        !p.shiny &&
        !p.favorite &&
        !isEventSpecies(p.dexNum) &&
        (!keepBest || best.get(p.dexNum)?.id !== p.id) &&
        p.id !== s.starterId
    )
    .map((p) => p.id);
}

function weakestNonLead(s: PokeRemGameState): string {
  const others = s.party
    .filter((p) => p.id !== s.activePokemonId)
    .sort((a, b) => a.level - b.level);
  return (others[0] ?? s.party[s.party.length - 1]!).id;
}

function readyLead(s: PokeRemGameState): PokeRemGameState {
  const lead = store.activePokemon(s);
  if (lead && lead.currentHp > 0) return s;
  const next = store.nextHealthyPartyMember(s);
  return next ? store.switchActivePokemon(s, next.id) : s;
}

const PACING: Record<PacingId, 'easy' | 'medium' | 'hard'> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard'
};

export function runBalance(
  policy: PolicyId,
  pacing: PacingId,
  seed: number,
  cfg: BalanceConfig = {}
): BalanceRun {
  const days = cfg.days ?? 60;
  const perDay = cfg.cardsPerDay ?? 100;
  const gens = cfg.enabledGens ?? ALL_GENS;
  return withSimWorld(seed, (setDay) => {
    let s = store.configureStudyDifficulty(
      store.chooseStarter(store.createInitialStateV4(), cfg.starter ?? 4),
      PACING[pacing]
    );
    const coinsBySource: Record<CoinSource, number> = {
      card: 0,
      defeat: 0,
      catch: 0,
      trainer: 0,
      claims: 0,
      milestones: 0,
      transfer: 0,
      other: 0
    };
    const coinsSpentBySource: Record<CoinSource, number> = {
      card: 0,
      defeat: 0,
      catch: 0,
      trainer: 0,
      claims: 0,
      milestones: 0,
      transfer: 0,
      other: 0
    };
    let variableCoins = 0;
    let variableBattleCoins = 0;
    const out: BalanceRun = {
      policy,
      pacing,
      seed,
      days: [],
      coinsBySource,
      coinsSpentBySource,
      variableCoins: 0,
      variableBattleCoins: 0,
      cardTrickle: 0,
      encounters: 0,
      plainEncounters: 0,
      shinies: 0,
      birds: 0,
      legendaries: 0,
      legendaryCards: 0,
      rocketLeaders: 0,
      leaderWins: 0,
      trainerBattles: 0,
      trainerWins: 0,
      ordinaryCombatTurns: 0,
      ordinaryLeadFaints: 0,
      firstShinyDay: null,
      catchGap: 0,
      storageFullDay: null,
      final: s
    };
    const gaps: number[] = [];
    const startedTrainers = new Set<string>();
    const resolvedTrainers = new Set<string>();
    /** Apply a step and book the coins it earned to `source`. */
    /** Coins for trainer levels gained since `from` (paid automatically, booked as milestones). */
    const levelCoins = (from: number) => {
      let c = 0;
      for (let lv = from + 1; lv <= s.trainerLevel; lv++) c += trainerLevelCoins(lv);
      coinsBySource.milestones += c;
      return c;
    };
    const step = (source: CoinSource, fn: (x: PokeRemGameState) => PokeRemGameState) => {
      const before = s.totalCurrencyEarned ?? 0;
      const lv = s.trainerLevel;
      const balanceBefore = s.currency ?? 0;
      s = fn(s);
      coinsSpentBySource[source] += Math.max(
        0,
        balanceBefore + (s.totalCurrencyEarned ?? 0) - before - (s.currency ?? 0)
      );
      coinsBySource[source] += (s.totalCurrencyEarned ?? 0) - before - levelCoins(lv);
    };

    for (let day = 0; day < days; day++) {
      setDay(day);
      const dayStart = s.totalCurrencyEarned ?? 0;
      const milestoneStart = coinsBySource.milestones;
      for (let c = 0; c < perDay; c++) {
        const before = s.totalCurrencyEarned ?? 0;
        const prevEnc = s.currentEncounter;
        if (
          s.cardsReviewed >= EVENT_MIN_REVIEWS &&
          encounterBaseLevel(s.party) >= EVENT_MIN_PARTY_LEVEL
        )
          out.legendaryCards++;
        const lvBefore = s.trainerLevel;
        s = store.onQueueCardComplete(s, gens, s.studyReviewsPerEncounter, {
          trainerFrequency: 'normal'
        });
        const delta = (s.totalCurrencyEarned ?? 0) - before - levelCoins(lvBefore);
        const lucky =
          s.lastStudyReward?.seq === s.cardsReviewed ? (s.lastStudyReward?.bonus ?? 0) : 0;
        coinsBySource.card += delta;
        out.cardTrickle += BALANCE.coins.review;
        variableCoins += Math.min(delta, Math.max(0, lucky));
        if (s.pendingCaughtMon)
          step('other', (x) =>
            policy === 'swap-in'
              ? store.resolvePendingCaughtReplace(x, weakestNonLead(x))
              : store.cancelPendingCaught(x)
          );

        const enc = s.currentEncounter;
        // A new encounter object = a new spawn (a wild can be replaced within one card).
        if (enc && enc !== prevEnc) {
          out.encounters++;
          const plain = !isEventSpecies(enc.dexNum) && !enc.pendingPrize;
          if (plain) out.plainEncounters++;
          if (plain && enc.shiny) {
            out.shinies++;
            if (out.firstShinyDay === null) out.firstShinyDay = day + 1;
          }
          if (GALARIAN_BIRDS.has(enc.dexNum)) out.birds++;
          else if (isEventSpecies(enc.dexNum) && !enc.pendingPrize) out.legendaries++;
        }
        const resultSeq = s.lastBattleResult?.seq;
        if (enc && policy !== 'idle') playWild(policy);
        // A real player whose whole team is down runs and heals (or revives, for a spawn that never flees) rather
        // than leaving the wild there: a waiting wild pauses new spawns and under-counts every per-card rarity.
        if (
          s.currentEncounter &&
          policy !== 'idle' &&
          !store.nextHealthyPartyMember(s) &&
          (store.activePokemon(s)?.currentHp ?? 0) <= 0
        ) {
          const w = s.currentEncounter;
          if (!w.shiny && !isEventSpecies(w.dexNum) && !w.pendingPrize) {
            step('other', store.runFromEncounter);
            step('other', store.pokemonCenterHeal);
          } else {
            // Shinies, legendaries and prizes never flee: revive the lead from the Bag (buying one if needed).
            step('other', store.quickReviveLead);
            playWild(policy);
          }
        }
        if (s.lastBattleResult && s.lastBattleResult.seq !== resultSeq) {
          const bounty = s.lastBattleResult.bounty ?? 0;
          variableCoins += bounty;
          variableBattleCoins += bounty;
        }
        if (s.currentTrainerBattle && policy !== 'idle') playTrainer();
        if (
          !s.currentEncounter &&
          !s.currentTrainerBattle &&
          policy !== 'idle' &&
          s.party.some((p) => p.currentHp < p.maxHp * 0.5)
        ) {
          step('other', store.pokemonCenterHeal);
        }
        if ((policy === 'farmer' || policy === 'collector') && s.storagePokemon.length > 0) {
          // The farmer transfers every catch at once (the Pokédex keeps the entry); the collector keeps the best.
          const spares = spareStorageIds(s, policy !== 'farmer');
          const full = s.storagePokemon.length >= storageCap(s) - 1;
          if (spares.length && (policy === 'farmer' || full))
            step('transfer', (x) => transferOut(x, spares));
        }
        if (policy === 'keep-team' && s.storagePokemon.length > 20) {
          const spares = spareStorageIds(s);
          if (spares.length) step('transfer', (x) => transferOut(x, spares));
        }
        if (out.storageFullDay == null && s.storagePokemon.length >= storageCap(s))
          out.storageFullDay = day + 1;
      }
      step('milestones', store.claimAllAchievements);
      step('claims', (x) => store.claimAllRewards(store.claimAllQuests(x)));
      const lv = partyLevels(s);
      out.days.push({
        day: day + 1,
        cards: s.cardsReviewed,
        partyAvg: lv.avg,
        partyTop: lv.top,
        partyBottom: lv.bottom,
        coinsEarned: (s.totalCurrencyEarned ?? 0) - dayStart,
        milestoneCoins: coinsBySource.milestones - milestoneStart,
        storage: s.storagePokemon.length
      });
    }
    out.variableCoins = variableCoins;
    out.variableBattleCoins = variableBattleCoins;
    out.catchGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    out.final = s;
    return out;

    function playWild(p: PolicyId) {
      let turns = 0;
      while (s.currentEncounter && turns < MAX_TURNS) {
        s = readyLead(s);
        // Protected shinies/prizes wait after a wipe. A real player can revive here; otherwise a
        // simulated policy silently stops encountering anything for the rest of its sixty days.
        if (!s.party.some((mon) => mon.currentHp > 0)) step('other', store.quickReviveLead);
        const lead = store.activePokemon(s);
        const wild = s.currentEncounter;
        if (!lead || lead.currentHp <= 0 || !wild) break;
        const uncaught = (s.collectionDex[wild.dexNum] ?? 0) === 0;
        const special = wild.shiny === true || isEventSpecies(wild.dexNum);
        const wantCatch =
          !catchBlockedByStorage(s, wild) &&
          (special ||
            p === 'collector' ||
            p === 'farmer' ||
            ((p === 'swap-in' || p === 'keep-team') && uncaught));
        const ball = recommendedBall(s.bag, wild, lead);
        if (wantCatch && (s.bag[ball] ?? 0) <= 0)
          step('other', (x) => store.buyItem(x, 'poke-ball', 5));
        const chance = wildCatchChancePreview(wild, lead, recommendedBall(s.bag, wild, lead));
        // The farmer (abuse probe) always throws; the others only take good odds.
        const threshold = special || p === 'farmer' ? 0 : 0.45;
        if (
          wantCatch &&
          chance >= threshold &&
          (s.bag[recommendedBall(s.bag, wild, lead)] ?? 0) > 0
        ) {
          const caughtBefore = s.totalCaught;
          const avg = partyLevels(s).avg;
          step('catch', (x) => store.catchEncounter(x, recommendedBall(x.bag, wild, lead)));
          // Birds, legendaries and prizes spawn above the party on purpose; the band is about everyday catches.
          if (s.totalCaught > caughtBefore && !special) gaps.push(wild.level - avg);
        } else {
          step('defeat', (x) => store.applyCombatTurn(x));
          if (!special) {
            out.ordinaryCombatTurns++;
            if ((s.party.find((mon) => mon.id === lead.id)?.currentHp ?? 0) <= 0)
              out.ordinaryLeadFaints++;
          }
          turns++;
        }
        if (s.pendingCaughtMon)
          step('other', (x) =>
            p === 'swap-in'
              ? store.resolvePendingCaughtReplace(x, weakestNonLead(x))
              : store.cancelPendingCaught(x)
          );
      }
    }

    function playTrainer() {
      let b = s.currentTrainerBattle;
      if (!b) return;
      if (b.phase === 'team_select') {
        const ids = [...s.party]
          .sort((x, y) => y.level - x.level)
          .slice(0, 3)
          .map((m) => m.id);
        step('trainer', (x) => store.lockTrainerTeam(x, ids));
      }
      b = s.currentTrainerBattle;
      if (b?.phase === 'active' && !startedTrainers.has(b.id)) {
        startedTrainers.add(b.id);
        out.trainerBattles++;
        if (b.rocket?.kind === 'leader') out.rocketLeaders++;
      }
      let turns = 0;
      while ((b = s.currentTrainerBattle) && b.phase === 'active' && turns < MAX_TURNS * 3) {
        step('trainer', (x) => store.applyTrainerCombatTurn(x));
        turns++;
      }
      b = s.currentTrainerBattle;
      if (b && (b.phase === 'post_win' || b.phase === 'post_loss') && !resolvedTrainers.has(b.id)) {
        resolvedTrainers.add(b.id);
        if (b.phase === 'post_win') {
          out.trainerWins++;
          if (b.rocket?.kind === 'leader') out.leaderWins++;
        }
      }
      const loot = s.currentTrainerBattle?.rocket
        ? s.currentTrainerBattle.rewardSnapshot
        : undefined;
      const variableLoot = !loot
        ? 0
        : s.currentTrainerBattle?.rocket?.kind === 'leader'
          ? loot.coins
          : /cache/i.test(loot.headline ?? '')
            ? Math.max(
                0,
                loot.coins -
                  BALANCE.rocket.gruntCoinBase -
                  BALANCE.rocket.gruntCoinPerAvg * partyLevels(s).avg
              )
            : 0;
      variableCoins += variableLoot;
      variableBattleCoins += variableLoot;
      if (s.currentTrainerBattle?.catchOfferActive) step('trainer', store.dismissTrainerCatchOffer);
      step('trainer', store.closeTrainerBattle);
    }
  });
}

export interface BandResult {
  id: string;
  target: string;
  measured: string;
  pass: boolean;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const levelAtCards = (r: BalanceRun, cards: number) =>
  r.days.find((d) => d.cards >= cards)?.partyAvg ?? NaN;

/** Evaluate the SPEC C2 bands that the runs cover. */
export function evaluateBands(runs: BalanceRun[], pacing: PacingId = 'medium'): BandResult[] {
  const by = (policy: PolicyId) => runs.filter((r) => r.policy === policy && r.pacing === pacing);
  const out: BandResult[] = [];
  const band = (
    id: string,
    target: string,
    value: number,
    lo: number,
    hi: number,
    fmt = (v: number) => v.toFixed(1)
  ) => {
    if (!Number.isFinite(value)) return;
    out.push({ id, target, measured: fmt(value), pass: value >= lo && value <= hi });
  };
  const swap = by('swap-in');
  const keep = by('keep-team');
  const ref = keep.length ? keep : swap;
  for (const [cards, lv] of [
    [500, 15],
    [1000, 22],
    [3000, 38],
    [6000, 50]
  ] as const) {
    band(
      `level@${cards}`,
      `party avg ≈ L${lv} ±15%`,
      mean(ref.map((r) => levelAtCards(r, cards))),
      lv * 0.85,
      lv * 1.15
    );
  }
  if (keep.length) {
    band(
      'keep-gap@1000',
      'top − bottom ≤ 6',
      mean(
        keep.map((r) => {
          const d = r.days.find((x) => x.cards >= 1000);
          return d ? d.partyTop - d.partyBottom : NaN;
        })
      ),
      0,
      6
    );
    band('catch-gap', 'new catch ≥ 2 below avg', mean(keep.map((r) => r.catchGap)), -100, -2);
  }
  if (ref.length) {
    // Recurring income: one-time milestone payouts (achievements, trainer levels) are front-loaded by design
    // and reported on their own below (DECISIONS T5.7).
    const recurring = (d: DaySample) => d.coinsEarned - d.milestoneCoins;
    const early = mean(ref.map((r) => mean(r.days.slice(0, 7).map(recurring))));
    band(
      'income-early',
      '₽7–10k per 100 cards (days 1–7)',
      early,
      7000,
      10000,
      (v) => `₽${Math.round(v)}`
    );
    const late = mean(ref.map((r) => mean(r.days.filter((d) => d.partyAvg >= 40).map(recurring))));
    band(
      'income-L40',
      '₽10–14k per 100 cards at L40+',
      late,
      10000,
      14000,
      (v) => `₽${Math.round(v)}`
    );
    // C2 "a theme in ≤ 6 days": the theme price over a day of recurring income in the first two weeks
    // (one-time milestone payouts left out, so this is the slow case).
    const twoWeeks = mean(ref.map((r) => mean(r.days.slice(0, 14).map(recurring))));
    band('theme-days', 'a theme affordable in ≤ 6 days', THEME_SHOP.price / Math.max(1, twoWeeks), 0, 6);
    const totals = ref.map((r) => Object.values(r.coinsBySource).reduce((a, b) => a + b, 0));
    const share = (src: CoinSource[]) =>
      mean(
        ref.map((r, i) => src.reduce((a, k) => a + r.coinsBySource[k], 0) / Math.max(1, totals[i]!))
      );
    const battles =
      mean(
        ref.map(
          (r, i) =>
            (r.coinsBySource.defeat +
              r.coinsBySource.catch +
              r.coinsBySource.trainer -
              r.variableBattleCoins) /
            Math.max(1, totals[i]!)
        )
      ) * 100;
    band(
      'mix-battles',
      'battle base rewards ~40% (30–50%)',
      battles,
      30,
      50,
      (v) => `${v.toFixed(1)}%`
    );
    band(
      'mix-cards',
      'base card trickle ~15% (8–22%)',
      mean(ref.map((r, i) => r.cardTrickle / Math.max(1, totals[i]!))) * 100,
      8,
      22,
      (v) => `${v.toFixed(1)}%`
    );
    band(
      'mix-claims',
      'quests/achievements ~25% (15–35%)',
      share(['claims', 'milestones']) * 100,
      15,
      35,
      (v) => `${v.toFixed(0)}%`
    );
    band(
      'mix-variable',
      'variable ~20% (12–28%)',
      mean(ref.map((r, i) => r.variableCoins / Math.max(1, totals[i]!))) * 100,
      12,
      28,
      (v) => `${v.toFixed(0)}%`
    );
    const cv = mean(
      ref.map((r) => {
        const v = r.days.map((d) => d.coinsEarned);
        const m = mean(v);
        return Math.sqrt(mean(v.map((x) => (x - m) ** 2))) / Math.max(1, m);
      })
    );
    band('variance', 'daily ₽ CV 0.35–0.6', cv, 0.35, 0.6, (v) => v.toFixed(2));
    const burst = mean(
      ref.map((r) => r.days.slice(0, 7).reduce((a, d) => a + d.milestoneCoins, 0))
    );
    out.push({
      id: 'milestones-week1',
      target: 'reported (one-time)',
      measured: `₽${Math.round(burst)}`,
      pass: true
    });
  }
  const engaged = runs.filter((r) => r.pacing === pacing && r.policy !== 'idle');
  const attempts = engaged.reduce((sum, r) => sum + r.trainerBattles, 0);
  if (attempts)
    band(
      'trainer-win-rate',
      'trainer win rate 0.5–0.95',
      engaged.reduce((sum, r) => sum + r.trainerWins, 0) / attempts,
      0.5,
      0.95,
      (v) => v.toFixed(3)
    );
  const leaders = engaged.reduce((sum, r) => sum + r.rocketLeaders, 0);
  if (leaders) {
    band(
      'leader-win-rate',
      'Leader win rate 0.4–0.75',
      engaged.reduce((sum, r) => sum + r.leaderWins, 0) / leaders,
      0.4,
      0.75,
      (v) => v.toFixed(3)
    );
    band(
      'leader-cadence',
      'Leader every 5–9 study days',
      engaged.reduce((sum, r) => sum + r.days.length, 0) / leaders,
      5,
      9,
      (v) => v.toFixed(1)
    );
  }
  const fighters = by('fighter');
  const ordinaryFights = fighters.reduce((sum, r) => sum + r.plainEncounters - r.shinies, 0);
  if (ordinaryFights) {
    band(
      'wild-turns',
      'ordinary wild fights 2–4 turns',
      fighters.reduce((sum, r) => sum + r.ordinaryCombatTurns, 0) / ordinaryFights,
      2,
      4,
      (v) => v.toFixed(2)
    );
    band(
      'wild-faint',
      'lead faint rate <0.12',
      fighters.reduce((sum, r) => sum + r.ordinaryLeadFaints, 0) / ordinaryFights,
      0,
      0.12,
      (v) => v.toFixed(3)
    );
  }
  if (engaged.length) {
    const firstDays = engaged
      .map((r) => r.firstShinyDay ?? r.days.length + 1)
      .sort((a, b) => a - b);
    const middle = Math.floor(firstDays.length / 2);
    const median =
      firstDays.length % 2 ? firstDays[middle]! : (firstDays[middle - 1]! + firstDays[middle]!) / 2;
    band(
      'first-shiny-median',
      'median first ordinary shiny day 3–8 (censored none > run length)',
      median,
      3,
      8
    );
  }
  if (keep.length)
    band(
      'storage-keep-team',
      'keep-team never fills storage',
      keep.filter((r) => r.storageFullDay !== null).length,
      0,
      0,
      (v) => `${v} runs filled`
    );
  const farmer = by('farmer');
  const fighter = by('fighter');
  if (farmer.length && fighter.length) {
    // Encounter income only (defeat + catch + transfer): cards, quests and trainers pay both policies alike.
    const perCard = (rs: BalanceRun[]) =>
      mean(
        rs.map(
          (r) =>
            (r.coinsBySource.defeat + r.coinsBySource.catch + r.coinsBySource.transfer) /
            Math.max(1, r.final.cardsReviewed)
        )
      );
    band(
      'abuse',
      'farmer ₽/card ≤ 0.8 × fighter',
      perCard(farmer) / Math.max(1e-9, perCard(fighter)),
      0,
      0.8,
      (v) => v.toFixed(2)
    );
  }
  const med = runs.filter((r) => r.pacing === pacing && r.policy !== 'idle');
  if (med.length && pacing === 'medium') {
    const enc = med.reduce((a, r) => a + r.plainEncounters, 0);
    const cards = med.reduce((a, r) => a + r.final.cardsReviewed, 0);
    const legCards = med.reduce((a, r) => a + r.legendaryCards, 0);
    band(
      'shiny',
      '1 per 190–260 encounters',
      enc /
        Math.max(
          1,
          med.reduce((a, r) => a + r.shinies, 0)
        ),
      190,
      260,
      (v) => `1/${v.toFixed(0)}`
    );
    band(
      'bird',
      '1 per 225–275 cards (Medium)',
      cards /
        Math.max(
          1,
          med.reduce((a, r) => a + r.birds, 0)
        ),
      225,
      275,
      (v) => `1/${v.toFixed(0)}`
    );
    band(
      'legendary',
      '1 per ~2,500 cards (1,800–3,500)',
      legCards /
        Math.max(
          1,
          med.reduce((a, r) => a + r.legendaries, 0)
        ),
      1800,
      3500,
      (v) => `1/${v.toFixed(0)}`
    );
  }
  const collector = by('collector');
  if (collector.length) {
    band(
      'storage-collector',
      'collector fills storage day 8–12',
      mean(collector.map((r) => r.storageFullDay ?? 999)),
      8,
      12,
      (v) => `day ${v.toFixed(1)}`
    );
  }
  return out;
}

export function runMatrix(cfg: BalanceConfig = {}): BalanceRun[] {
  const runs: BalanceRun[] = [];
  for (const policy of cfg.policies ?? POLICIES)
    for (const pacing of cfg.pacings ?? (['medium'] as PacingId[]))
      for (const seed of cfg.seeds ?? [1, 2, 3, 4])
        runs.push(runBalance(policy, pacing, seed, cfg));
  return runs;
}

export function bandsMarkdown(bands: BandResult[], header: string): string {
  const rows = bands.map(
    (b) => `| ${b.id} | ${b.target} | ${b.measured} | ${b.pass ? 'pass' : '**FAIL**'} |`
  );
  return [
    header,
    '',
    '| Band | Target | Measured | Result |',
    '|---|---|---|---|',
    ...rows,
    ''
  ].join('\n');
}
