/**
 * Balance harness (SPEC Part C): plays many simulated players through weeks of studying under different
 * play styles and pacing, and measures progression, income and rarities against the target bands.
 * `scripts/balance-tune.ts` runs it and writes docs/update-1.6.0/BALANCE_REPORT.md; `balance.test.ts`
 * asserts the bands on a smaller sample.
 */
import type { OwnedPokemon, PokeRemGameState } from '../state/model';
import * as store from '../state/store';
import { recommendedBall, wildCatchChancePreview } from '../engine/encounters';
import { GALARIAN_BIRDS } from '../engine/rarity';
import { isEventSpecies } from '../engine/speciesPool';
import { seededRng } from './simulate';
import { catchBlockedByStorage, storageCap } from '../engine/capacity';

export type PolicyId = 'keep-team' | 'swap-in' | 'collector' | 'fighter' | 'farmer' | 'idle';
export const POLICIES: PolicyId[] = ['keep-team', 'swap-in', 'collector', 'fighter', 'farmer', 'idle'];
export type PacingId = 'easy' | 'medium' | 'hard';

export type CoinSource = 'card' | 'defeat' | 'catch' | 'trainer' | 'claims' | 'transfer' | 'other';

export interface DaySample {
  day: number;
  cards: number;
  partyAvg: number;
  partyTop: number;
  partyBottom: number;
  coinsEarned: number;
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
  encounters: number;
  shinies: number;
  birds: number;
  legendaries: number;
  rocketLeaders: number;
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
  const t = (store as unknown as { transferPokemon?: (s: PokeRemGameState, ids: string[]) => PokeRemGameState }).transferPokemon;
  if (typeof t === 'function') return t(s, ids);
  return ids.reduce((acc, id) => store.releasePokemon(acc, id), s);
}

const ivScore = (p: OwnedPokemon) => (p.ivs ? Object.values(p.ivs).reduce((a: number, b) => a + (b as number), 0) : 0);

/** Storage Pokémon worth keeping: shinies, favourites, event species and the best of each species. */
function spareStorageIds(s: PokeRemGameState): string[] {
  const best = new Map<number, OwnedPokemon>();
  for (const p of [...s.party, ...s.storagePokemon]) {
    const b = best.get(p.dexNum);
    if (!b || ivScore(p) > ivScore(b) || (ivScore(p) === ivScore(b) && p.level > b.level)) best.set(p.dexNum, p);
  }
  return s.storagePokemon
    .filter((p) => !p.shiny && !p.favorite && !isEventSpecies(p.dexNum) && best.get(p.dexNum)?.id !== p.id && p.id !== s.starterId)
    .map((p) => p.id);
}

function weakestNonLead(s: PokeRemGameState): string {
  const others = s.party.filter((p) => p.id !== s.activePokemonId).sort((a, b) => a.level - b.level);
  return (others[0] ?? s.party[s.party.length - 1]!).id;
}

function readyLead(s: PokeRemGameState): PokeRemGameState {
  const lead = store.activePokemon(s);
  if (lead && lead.currentHp > 0) return s;
  const next = store.nextHealthyPartyMember(s);
  return next ? store.switchActivePokemon(s, next.id) : s;
}

const PACING: Record<PacingId, 'easy' | 'medium' | 'hard'> = { easy: 'easy', medium: 'medium', hard: 'hard' };

export function runBalance(policy: PolicyId, pacing: PacingId, seed: number, cfg: BalanceConfig = {}): BalanceRun {
  const days = cfg.days ?? 60;
  const perDay = cfg.cardsPerDay ?? 100;
  const gens = cfg.enabledGens ?? ALL_GENS;
  return withSimWorld(seed, (setDay) => {
    let s = store.configureStudyDifficulty(store.chooseStarter(store.createInitialStateV4(), cfg.starter ?? 4), PACING[pacing]);
    const coinsBySource: Record<CoinSource, number> = { card: 0, defeat: 0, catch: 0, trainer: 0, claims: 0, transfer: 0, other: 0 };
    let variableCoins = 0;
    const out: BalanceRun = {
      policy, pacing, seed, days: [], coinsBySource, variableCoins: 0, encounters: 0, shinies: 0, birds: 0,
      legendaries: 0, rocketLeaders: 0, catchGap: 0, storageFullDay: null, final: s
    };
    const gaps: number[] = [];
    /** Apply a step and book the coins it earned to `source`. */
    const step = (source: CoinSource, fn: (x: PokeRemGameState) => PokeRemGameState) => {
      const before = s.totalCurrencyEarned ?? 0;
      s = fn(s);
      coinsBySource[source] += (s.totalCurrencyEarned ?? 0) - before;
    };

    for (let day = 0; day < days; day++) {
      setDay(day);
      const dayStart = s.totalCurrencyEarned ?? 0;
      for (let c = 0; c < perDay; c++) {
        const before = s.totalCurrencyEarned ?? 0;
        const hadEncounter = !!s.currentEncounter;
        s = store.onQueueCardComplete(s, gens, s.studyReviewsPerEncounter, { trainerFrequency: 'normal' });
        const delta = (s.totalCurrencyEarned ?? 0) - before;
        const lucky = s.lastStudyReward?.seq === s.cardsReviewed ? s.lastStudyReward?.bonus ?? 0 : 0;
        coinsBySource.card += delta;
        variableCoins += Math.min(delta, Math.max(0, lucky));
        if (s.pendingCaughtMon) step('other', (x) => (policy === 'swap-in' ? store.resolvePendingCaughtReplace(x, weakestNonLead(x)) : store.cancelPendingCaught(x)));

        const enc = s.currentEncounter;
        if (enc && !hadEncounter) {
          out.encounters++;
          if (enc.shiny) out.shinies++;
          if (GALARIAN_BIRDS.has(enc.dexNum)) out.birds++;
          else if (isEventSpecies(enc.dexNum)) out.legendaries++;
          if (enc.pendingPrize) out.rocketLeaders++;
        }
        if (enc && policy !== 'idle') playWild(policy);
        if (s.currentTrainerBattle && policy !== 'idle') playTrainer();
        if (!s.currentEncounter && !s.currentTrainerBattle && policy !== 'idle' && s.party.some((p) => p.currentHp < p.maxHp * 0.5)) {
          step('other', store.pokemonCenterHeal);
        }
        if ((policy === 'farmer' || policy === 'collector') && s.storagePokemon.length > 0) {
          const spares = spareStorageIds(s);
          const full = s.storagePokemon.length >= storageCap(s) - 1;
          if (spares.length && (policy === 'farmer' || full)) step('transfer', (x) => transferOut(x, spares));
        }
        if (policy === 'keep-team' && s.storagePokemon.length > 20) {
          const spares = spareStorageIds(s);
          if (spares.length) step('transfer', (x) => transferOut(x, spares));
        }
        if (out.storageFullDay == null && s.storagePokemon.length >= storageCap(s)) out.storageFullDay = day + 1;
      }
      step('claims', (x) => store.claimAllRewards(store.claimAllQuests(store.claimAllAchievements(x))));
      const lv = partyLevels(s);
      out.days.push({
        day: day + 1,
        cards: s.cardsReviewed,
        partyAvg: lv.avg,
        partyTop: lv.top,
        partyBottom: lv.bottom,
        coinsEarned: (s.totalCurrencyEarned ?? 0) - dayStart,
        storage: s.storagePokemon.length
      });
    }
    out.variableCoins = variableCoins;
    out.catchGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    out.final = s;
    return out;

    function playWild(p: PolicyId) {
      let turns = 0;
      while (s.currentEncounter && turns < MAX_TURNS) {
        s = readyLead(s);
        const lead = store.activePokemon(s);
        const wild = s.currentEncounter;
        if (!lead || lead.currentHp <= 0 || !wild) break;
        const uncaught = (s.collectionDex[wild.dexNum] ?? 0) === 0;
        const special = wild.shiny === true || isEventSpecies(wild.dexNum);
        const wantCatch =
          !catchBlockedByStorage(s, wild) &&
          (special || p === 'collector' || p === 'farmer' || ((p === 'swap-in' || p === 'keep-team') && uncaught));
        const ball = recommendedBall(s.bag, wild, lead);
        if (wantCatch && (s.bag[ball] ?? 0) <= 0) step('other', (x) => store.buyItem(x, 'poke-ball', 5));
        const chance = wildCatchChancePreview(wild, lead, recommendedBall(s.bag, wild, lead));
        const threshold = special ? 0 : 0.45;
        if (wantCatch && chance >= threshold && (s.bag[recommendedBall(s.bag, wild, lead)] ?? 0) > 0) {
          const caughtBefore = s.totalCaught;
          const avg = partyLevels(s).avg;
          step('catch', (x) => store.catchEncounter(x, recommendedBall(x.bag, wild, lead)));
          if (s.totalCaught > caughtBefore) gaps.push(wild.level - avg);
        } else {
          step('defeat', (x) => store.applyCombatTurn(x));
          turns++;
        }
        if (s.pendingCaughtMon) step('other', (x) => (p === 'swap-in' ? store.resolvePendingCaughtReplace(x, weakestNonLead(x)) : store.cancelPendingCaught(x)));
      }
    }

    function playTrainer() {
      let b = s.currentTrainerBattle;
      if (!b) return;
      if (b.phase === 'team_select') {
        const ids = [...s.party].sort((x, y) => y.level - x.level).slice(0, 3).map((m) => m.id);
        step('trainer', (x) => store.lockTrainerTeam(x, ids));
      }
      let turns = 0;
      while ((b = s.currentTrainerBattle) && b.phase === 'active' && turns < MAX_TURNS * 3) {
        step('trainer', (x) => store.applyTrainerCombatTurn(x));
        turns++;
      }
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

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const levelAtCards = (r: BalanceRun, cards: number) => r.days.find((d) => d.cards >= cards)?.partyAvg ?? NaN;

/** Evaluate the SPEC C2 bands that the runs cover. */
export function evaluateBands(runs: BalanceRun[], pacing: PacingId = 'medium'): BandResult[] {
  const by = (policy: PolicyId) => runs.filter((r) => r.policy === policy && r.pacing === pacing);
  const out: BandResult[] = [];
  const band = (id: string, target: string, value: number, lo: number, hi: number, fmt = (v: number) => v.toFixed(1)) => {
    if (!Number.isFinite(value)) return;
    out.push({ id, target, measured: fmt(value), pass: value >= lo && value <= hi });
  };
  const swap = by('swap-in');
  const keep = by('keep-team');
  const ref = keep.length ? keep : swap;
  for (const [cards, lv] of [[500, 15], [1000, 22], [3000, 38], [6000, 50]] as const) {
    band(`level@${cards}`, `party avg ≈ L${lv} ±15%`, mean(ref.map((r) => levelAtCards(r, cards))), lv * 0.85, lv * 1.15);
  }
  if (keep.length) {
    band('keep-gap@1000', 'top − bottom ≤ 6', mean(keep.map((r) => { const d = r.days.find((x) => x.cards >= 1000); return d ? d.partyTop - d.partyBottom : NaN; })), 0, 6);
    band('catch-gap', 'new catch ≥ 2 below avg', mean(keep.map((r) => r.catchGap)), -100, -2);
  }
  if (ref.length) {
    const early = mean(ref.map((r) => mean(r.days.slice(0, 7).map((d) => d.coinsEarned))));
    band('income-early', '₽7–10k per 100 cards (days 1–7)', early, 7000, 10000, (v) => `₽${Math.round(v)}`);
    const late = mean(ref.map((r) => mean(r.days.filter((d) => d.partyAvg >= 40).map((d) => d.coinsEarned))));
    band('income-L40', '₽10–14k per 100 cards at L40+', late, 10000, 14000, (v) => `₽${Math.round(v)}`);
    const totals = ref.map((r) => Object.values(r.coinsBySource).reduce((a, b) => a + b, 0));
    const share = (src: CoinSource[]) => mean(ref.map((r, i) => src.reduce((a, k) => a + r.coinsBySource[k], 0) / Math.max(1, totals[i]!)));
    band('mix-battles', 'battles ~40% (30–50%)', share(['defeat', 'catch', 'trainer']) * 100, 30, 50, (v) => `${v.toFixed(0)}%`);
    band('mix-claims', 'quests/achievements ~25% (15–35%)', share(['claims']) * 100, 15, 35, (v) => `${v.toFixed(0)}%`);
    band('mix-variable', 'variable ~20% (12–28%)', mean(ref.map((r, i) => r.variableCoins / Math.max(1, totals[i]!))) * 100, 12, 28, (v) => `${v.toFixed(0)}%`);
    const cv = mean(ref.map((r) => { const v = r.days.map((d) => d.coinsEarned); const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))) / Math.max(1, m); }));
    band('variance', 'daily ₽ CV 0.35–0.6', cv, 0.35, 0.6, (v) => v.toFixed(2));
  }
  const farmer = by('farmer');
  const fighter = by('fighter');
  if (farmer.length && fighter.length) {
    const perCard = (rs: BalanceRun[]) => mean(rs.map((r) => (r.final.totalCurrencyEarned ?? 0) / Math.max(1, r.final.cardsReviewed)));
    band('abuse', 'farmer ₽/card ≤ 0.8 × fighter', perCard(farmer) / Math.max(1e-9, perCard(fighter)), 0, 0.8, (v) => v.toFixed(2));
  }
  const med = runs.filter((r) => r.pacing === pacing && r.policy !== 'idle');
  if (med.length && pacing === 'medium') {
    const enc = med.reduce((a, r) => a + r.encounters, 0);
    const cards = med.reduce((a, r) => a + r.final.cardsReviewed, 0);
    band('shiny', '1 per 190–260 encounters', enc / Math.max(1, med.reduce((a, r) => a + r.shinies, 0)), 190, 260, (v) => `1/${v.toFixed(0)}`);
    band('bird', '1 per 225–275 cards (Medium)', cards / Math.max(1, med.reduce((a, r) => a + r.birds, 0)), 225, 275, (v) => `1/${v.toFixed(0)}`);
    band('legendary', '1 per ~2,500 cards (1,800–3,500)', cards / Math.max(1, med.reduce((a, r) => a + r.legendaries, 0)), 1800, 3500, (v) => `1/${v.toFixed(0)}`);
  }
  const collector = by('collector');
  if (collector.length) {
    band('storage-collector', 'collector fills storage day 8–12', mean(collector.map((r) => r.storageFullDay ?? 999)), 8, 12, (v) => `day ${v.toFixed(1)}`);
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
  const rows = bands.map((b) => `| ${b.id} | ${b.target} | ${b.measured} | ${b.pass ? 'pass' : '**FAIL**'} |`);
  return [header, '', '| Band | Target | Measured | Result |', '|---|---|---|---|', ...rows, ''].join('\n');
}
