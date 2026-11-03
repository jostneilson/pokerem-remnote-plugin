/**
 * Headless play-through for balance tests: a player who studies N cards and handles every
 * encounter with a simple, sensible policy. `Math.random` is seeded for the duration so results
 * are reproducible.
 */
import type { PokeRemGameState } from '../state/model';
import {
  activePokemon,
  applyCombatTurn,
  applyTrainerCombatTurn,
  buyItem,
  catchEncounter,
  chooseStarter,
  closeTrainerBattle,
  createInitialStateV2,
  dismissTrainerCatchOffer,
  lockTrainerTeam,
  nextHealthyPartyMember,
  onQueueCardComplete,
  pokemonCenterHeal,
  resolvePendingCaughtReplace,
  switchActivePokemon,
} from '../state/store';
import { recommendedBall, wildCatchChancePreview } from '../engine/encounters';
import { REVIEWS_PER_ENCOUNTER } from '../constants';

/** Small, fast deterministic PRNG (mulberry32). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = seededRng(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

export interface SimEvent {
  card: number;
  kind: 'spawn' | 'catch' | 'defeat' | 'faint' | 'trainer_win' | 'trainer_loss';
  dexNum?: number;
  level?: number;
  shiny?: boolean;
  turns?: number;
}

export interface SimResult {
  state: PokeRemGameState;
  events: SimEvent[];
}

export interface SimOptions {
  cards: number;
  seed: number;
  starter?: number;
  /** Try to catch once the wild's catch chance reaches this (default 0.45). */
  catchAt?: number;
  start?: PokeRemGameState;
  enabledGens?: number[];
  reviewsPerEncounter?: number;
}

const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8];

const MAX_TURNS = 40;

export function simulate(opts: SimOptions): SimResult {
  return withSeededRandom(opts.seed, () => run(opts));
}

function run(opts: SimOptions): SimResult {
  const catchAt = opts.catchAt ?? 0.45;
  const events: SimEvent[] = [];
  let s = opts.start ?? chooseStarter(createInitialStateV2(), opts.starter ?? 4);

  for (let card = 1; card <= opts.cards; card++) {
    s = onQueueCardComplete(s, opts.enabledGens ?? ALL_GENS, opts.reviewsPerEncounter ?? REVIEWS_PER_ENCOUNTER, {});
    if (s.pendingCaughtMon) s = resolvePendingCaughtReplace(s, weakestNonLead(s));

    if (s.currentEncounter) {
      const enc = s.currentEncounter;
      events.push({ card, kind: 'spawn', dexNum: enc.dexNum, level: enc.level, shiny: enc.shiny === true });
      let turns = 0;
      while (s.currentEncounter && turns < MAX_TURNS) {
        s = readyLead(s);
        const lead = activePokemon(s);
        const wild = s.currentEncounter;
        if (!lead || lead.currentHp <= 0 || !wild) break;
        const wantCatch = (s.collectionDex[wild.dexNum] ?? 0) === 0 || wild.shiny === true;
        if (wantCatch && !['poke-ball', 'great-ball', 'ultra-ball'].some((b) => (s.bag[b as 'poke-ball'] ?? 0) > 0)) s = buyItem(s, 'poke-ball', 5);
        const ball = recommendedBall(s.bag, wild, lead);
        if (wantCatch && (s.bag[ball] ?? 0) > 0 && wildCatchChancePreview(wild, lead, ball) >= catchAt) {
          const before = s.totalCaught;
          s = catchEncounter(s, ball);
          if (s.totalCaught > before) events.push({ card, kind: 'catch', dexNum: enc.dexNum, level: enc.level, shiny: enc.shiny === true, turns });
        } else {
          const defeated = s.totalDefeated;
          s = applyCombatTurn(s);
          turns++;
          if (s.totalDefeated > defeated) events.push({ card, kind: 'defeat', dexNum: enc.dexNum, level: enc.level, turns });
          else if (!s.currentEncounter) events.push({ card, kind: 'faint', dexNum: enc.dexNum, level: enc.level, turns });
        }
        if (s.pendingCaughtMon) s = resolvePendingCaughtReplace(s, weakestNonLead(s));
      }
    }

    if (s.currentTrainerBattle) s = playTrainer(s, card, events);
    if (!s.currentEncounter && !s.currentTrainerBattle && s.party.some((p) => p.currentHp < p.maxHp * 0.5)) {
      s = pokemonCenterHeal(s);
    }
  }
  return { state: s, events };
}

function readyLead(s: PokeRemGameState): PokeRemGameState {
  const lead = activePokemon(s);
  if (lead && lead.currentHp > 0) return s;
  const next = nextHealthyPartyMember(s);
  return next ? switchActivePokemon(s, next.id) : s;
}

function weakestNonLead(s: PokeRemGameState): string {
  const others = s.party.filter((p) => p.id !== s.activePokemonId);
  others.sort((a, b) => a.level - b.level);
  return (others[0] ?? s.party[s.party.length - 1]!).id;
}

function playTrainer(s: PokeRemGameState, card: number, events: SimEvent[]): PokeRemGameState {
  let b = s.currentTrainerBattle;
  if (!b) return s;
  if (b.phase === 'team_select') {
    const ids = [...s.party].sort((x, y) => y.level - x.level).slice(0, 3).map((p) => p.id);
    s = lockTrainerTeam(s, ids);
  }
  let turns = 0;
  while ((b = s.currentTrainerBattle) && b.phase === 'active' && turns < MAX_TURNS * 3) {
    s = applyTrainerCombatTurn(s);
    turns++;
  }
  b = s.currentTrainerBattle;
  if (b?.phase === 'post_win') events.push({ card, kind: 'trainer_win', turns });
  if (b?.phase === 'post_loss') events.push({ card, kind: 'trainer_loss', turns });
  if (b?.catchOfferActive) s = dismissTrainerCatchOffer(s);
  return closeTrainerBattle(s);
}
