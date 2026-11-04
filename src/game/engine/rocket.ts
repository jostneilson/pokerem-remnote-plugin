import { BALANCE } from '../balance';
import { SPECIES_BY_DEX, SPECIES_LIST, type PokemonType } from '../data/species';
import { ALL_TYPES } from '../data/typeChart';
import type {
  EncounterPokemon,
  PokeRemGameState,
  RocketState,
  TrainerEnemyMon,
  TrainerIdentity
} from '../state/model';
import { isStarterLine } from './evolution';
import { battleStats, rollIVs } from './pokemonStats';
import { everydayPool, pickEverydaySpecies } from './speciesPool';
import { buildEnemyForDex } from './trainerBattles';

/*
 * Team Rocket (SPEC A9, L15, Appendix R): one-type grunts with a rare ace, the Rocket Radar, and the
 * Rocket Leader, whose prize is a guaranteed legendary encounter.
 */

/** Share of trainer battles that are Team Rocket. */
export const ROCKET_SHARE = 0.33;
/** Grunt wins that bring out the Leader. */
export const LEADER_AFTER_GRUNT_WINS = 5;
/** Leader team level above the party average. */
export const LEADER_LEVEL_BONUS = 4;
/** The Leader's prize is shiny this often (fixed, not paced). */
export const LEADER_PRIZE_SHINY_ODDS = 1 / 5;
/** Grunt aces prefer species you haven't caught this share of the time. */
export const ACE_UNCAUGHT_BIAS = 0.7;
/** The ace pool: hard catches (pseudo-legendaries, fossils, most final stages) or starter lines. */
export const ACE_MAX_CATCH_RATE = 45;

export const GRUNT_NAMES = ['Rhea', 'Dax', 'Mina', 'Kobe', 'Sela', 'Orrin', 'Pax', 'Tula', 'Brent', 'Vey', 'Juno', 'Cass'];
export const LEADER_NAME = 'Corvin';
/** Leader team slots prefer these types, in order. */
const LEADER_TYPES: PokemonType[] = ['Dark', 'Poison', 'Ground'];

const GRUNT_TAUNTS = [
  'Team Rocket takes what it wants!',
  'Your Pokémon would look better in our hideout.',
  'Hand them over and nobody gets hurt!'
];
const GRUNT_DEFEAT = ['This isn’t over!', 'The Leader will hear about this!', 'Retreat! Retreat!'];
const GRUNT_VICTORY = ['Team Rocket wins again!', 'Study harder, kid.'];

export function emptyRocketState(): RocketState {
  return { gruntWins: 0, typesBeaten: [], leaderReady: false, leaderWins: 0 };
}

export function normalizeRocketState(raw: unknown): RocketState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Partial<RocketState>;
  const int = (v: unknown, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
  const types = Array.isArray(o.typesBeaten)
    ? [...new Set(o.typesBeaten.filter((t): t is PokemonType => (ALL_TYPES as string[]).includes(t as string)))]
    : [];
  return {
    gruntWins: int(o.gruntWins, LEADER_AFTER_GRUNT_WINS),
    typesBeaten: types,
    leaderReady: o.leaderReady === true,
    leaderWins: int(o.leaderWins, 1_000_000),
    ...(o.totalGruntWins ? { totalGruntWins: int(o.totalGruntWins, 1_000_000) } : {})
  };
}

/** Is the next Rocket battle a Leader battle? */
export function isLeaderNext(state: Pick<PokeRemGameState, 'rocket'>): boolean {
  return state.rocket?.leaderReady === true;
}

const pick = <T>(arr: readonly T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)] ?? arr[0]!;

/** Types with enough everyday species in the enabled generations for a full grunt team. */
export function gruntTypesAvailable(enabledGens: number[]): PokemonType[] {
  const pool = everydayPool(100, enabledGens, true);
  return ALL_TYPES.filter((t) => pool.filter((d) => SPECIES_BY_DEX.get(d)?.types.includes(t)).length >= 3);
}

/** The grunt type this time: random among types not beaten this cycle (a full cycle starts over). */
export function nextGruntType(rocket: RocketState | undefined, enabledGens: number[], rng: () => number): PokemonType {
  const available = gruntTypesAvailable(enabledGens);
  const types = available.length > 0 ? available : ALL_TYPES;
  const beaten = new Set(rocket?.typesBeaten ?? []);
  const fresh = types.filter((t) => !beaten.has(t));
  return pick(fresh.length > 0 ? fresh : types, rng);
}

/**
 * Species a grunt of `type` may lead with at `level`: non-legendary hard catches or starter lines of that
 * type. With none, the hardest-to-catch species of that type.
 */
export function rocketAcePool(type: PokemonType, level: number, enabledGens: number[]): number[] {
  const typed = everydayPool(level, enabledGens, true).filter((d) => SPECIES_BY_DEX.get(d)?.types.includes(type));
  const rare = typed.filter((d) => (SPECIES_BY_DEX.get(d)?.baseCatchRate ?? 255) <= ACE_MAX_CATCH_RATE || isStarterLine(d));
  if (rare.length > 0) return rare;
  if (typed.length === 0) return [];
  const lowest = Math.min(...typed.map((d) => SPECIES_BY_DEX.get(d)?.baseCatchRate ?? 255));
  return typed.filter((d) => (SPECIES_BY_DEX.get(d)?.baseCatchRate ?? 255) === lowest);
}

export interface RocketTeam {
  identity: TrainerIdentity;
  enemies: TrainerEnemyMon[];
}

function clampLevel(lv: number) {
  return Math.max(2, Math.min(100, Math.round(lv)));
}

/** A grunt of `type`: two everyday Pokémon of that type at avg−2…avg, then a rare ace at avg…avg+2. */
export function generateRocketGrunt(
  type: PokemonType,
  averageLevel: number,
  enabledGens: number[],
  collectionDex: Record<number, number>,
  rng: () => number
): RocketTeam {
  const gens = enabledGens.length > 0 ? enabledGens : [1];
  const used = new Set<number>();
  const enemies: TrainerEnemyMon[] = [];
  for (let i = 0; i < 2; i++) {
    const lv = clampLevel(averageLevel - 2 + Math.floor(rng() * 3));
    const dex = pickEverydaySpecies({ level: lv, enabledGens: gens, rng, requireTypes: [type], exclude: used, includeStarters: false });
    used.add(dex);
    const built = buildEnemyForDex(dex, { level: lv, rng });
    if (built) enemies.push(built);
  }
  const aceLv = clampLevel(averageLevel + Math.floor(rng() * 3));
  let pool = rocketAcePool(type, aceLv, gens).filter((d) => !used.has(d));
  if (pool.length > 0 && rng() < ACE_UNCAUGHT_BIAS) {
    const uncaught = pool.filter((d) => (collectionDex[d] ?? 0) <= 0);
    if (uncaught.length > 0) pool = uncaught;
  }
  const aceDex =
    pool.length > 0
      ? pick(pool, rng)
      : pickEverydaySpecies({ level: aceLv, enabledGens: gens, rng, requireTypes: [type], exclude: used, includeStarters: false });
  const ace = buildEnemyForDex(aceDex, { level: aceLv, rng });
  if (ace) enemies.push(ace);
  while (enemies.length < 3) enemies.push(buildEnemyForDex(16, { level: clampLevel(averageLevel), rng })!);
  return {
    identity: {
      archetypeId: 'rocket_grunt',
      className: 'Rocket Grunt',
      displayName: pick(GRUNT_NAMES, rng),
      themeTypes: [type],
      taunt: pick(GRUNT_TAUNTS, rng),
      defeatLine: pick(GRUNT_DEFEAT, rng),
      victoryLine: pick(GRUNT_VICTORY, rng)
    },
    enemies
  };
}

/** The Rocket Leader: three Pokémon (Dark, Poison, Ground preferred) at avg+4, elite tactics. */
export function generateRocketLeader(averageLevel: number, enabledGens: number[], rng: () => number): RocketTeam {
  const gens = enabledGens.length > 0 ? enabledGens : [1];
  const used = new Set<number>();
  const enemies: TrainerEnemyMon[] = [];
  const base = averageLevel + LEADER_LEVEL_BONUS;
  for (let i = 0; i < 3; i++) {
    const lv = clampLevel(base + (i === 2 ? 1 : 0));
    const dex = pickEverydaySpecies({ level: lv, enabledGens: gens, rng, requireTypes: [LEADER_TYPES[i]!], exclude: used, includeStarters: false });
    used.add(dex);
    const built = buildEnemyForDex(dex, { level: lv, rng });
    if (built) enemies.push(built);
  }
  while (enemies.length < 3) enemies.push(buildEnemyForDex(16, { level: clampLevel(base), rng })!);
  return {
    identity: {
      archetypeId: 'rocket_leader',
      className: 'Rocket Leader',
      displayName: LEADER_NAME,
      themeTypes: ['Dark', 'Poison'],
      taunt: 'So you’re the one beating my grunts. Let’s see you try me.',
      defeatLine: 'Impressive. Take your prize; Team Rocket will be back.',
      victoryLine: 'Team Rocket answers to no one. Come back stronger.'
    },
    enemies
  };
}

/** Legendary or Mythical species the Leader can guard: enabled gens, no Galarian forms or Ultra Beasts. */
export function leaderPrizePool(enabledGens: number[]): number[] {
  const gens = new Set(enabledGens.length > 0 ? enabledGens : [1]);
  return SPECIES_LIST.filter(
    (s) => gens.has(s.generation) && (s.classification === 'legendary' || s.classification === 'mythical') && s.dexNum < 10000
  ).map((s) => s.dexNum);
}

/** The Leader's prize: an uncaught legendary when any remain, at the Leader's level, shiny 1 in 5. */
export function rollLeaderPrize(
  level: number,
  enabledGens: number[],
  collectionDex: Record<number, number>,
  rng: () => number
): EncounterPokemon {
  const pool = leaderPrizePool(enabledGens);
  const uncaught = pool.filter((d) => (collectionDex[d] ?? 0) <= 0);
  const dex = pool.length > 0 ? pick(uncaught.length > 0 ? uncaught : pool, rng) : 150;
  const species = SPECIES_BY_DEX.get(dex)!;
  const lv = clampLevel(level);
  const ivs = rollIVs(rng);
  // Full HP pool (not the lighter wild one): the prize is meant to take effort.
  const maxHp = Math.max(1, battleStats({ dexNum: dex, level: lv, ivs }).hp);
  return {
    ivs,
    dexNum: dex,
    name: species.name,
    level: lv,
    maxHp,
    currentHp: maxHp,
    types: species.types,
    tier: species.tier,
    shiny: rng() < LEADER_PRIZE_SHINY_ODDS,
    pendingPrize: true
  };
}

export interface RocketLoot {
  coins: number;
  items: Partial<Record<string, number>>;
  cache: number;
}

/** Grunt rewards: coins by party level, sometimes balls or a potion, now and then a cash cache. */
export function gruntRewards(averageLevel: number, rng: () => number): RocketLoot {
  const r = BALANCE.rocket;
  const items: Partial<Record<string, number>> = {};
  if (rng() < r.gruntItemChance) {
    const roll = rng();
    const qty = 1 + Math.floor(rng() * 3);
    if (roll < 0.45) items['great-ball'] = qty;
    else if (roll < 0.7) items['ultra-ball'] = qty;
    else items['super-potion'] = 1;
  }
  const cache = rng() < r.gruntCacheChance ? r.gruntCacheMin + Math.floor(rng() * (r.gruntCacheMax - r.gruntCacheMin + 1)) : 0;
  return { coins: r.gruntCoinBase + Math.floor(r.gruntCoinPerAvg * Math.max(1, averageLevel)), items, cache };
}

export function leaderCoins(rng: () => number): number {
  const r = BALANCE.rocket;
  return r.leaderCoinMin + Math.floor(rng() * (r.leaderCoinMax - r.leaderCoinMin + 1));
}

/** Rocket progress after a win. */
export function rocketAfterWin(rocket: RocketState | undefined, kind: 'grunt' | 'leader', type?: PokemonType): RocketState {
  const r = rocket ?? emptyRocketState();
  if (kind === 'leader') return { ...r, gruntWins: 0, leaderReady: false, leaderWins: r.leaderWins + 1 };
  const gruntWins = Math.min(LEADER_AFTER_GRUNT_WINS, r.gruntWins + 1);
  const beaten = type && !r.typesBeaten.includes(type) ? [...r.typesBeaten, type] : r.typesBeaten;
  return {
    ...r,
    gruntWins,
    totalGruntWins: (r.totalGruntWins ?? 0) + 1,
    typesBeaten: beaten.length >= ALL_TYPES.length ? [] : beaten,
    leaderReady: r.leaderReady || gruntWins >= LEADER_AFTER_GRUNT_WINS
  };
}

