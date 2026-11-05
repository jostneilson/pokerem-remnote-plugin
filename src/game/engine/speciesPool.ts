/**
 * Who can appear, at what level, and how often — shared by wild encounters and trainer teams so
 * both follow the same rules: no evolved species below the level it evolves at, rarity per species
 * (not per tier), and themed pools per battle scene.
 */
import { WILD_RARE_CATCH_RATE, WILD_RARE_WEIGHT } from './rarity';
import type { OwnedPokemon } from '../state/model';
import type { PokemonType } from '../data/species';
import { SPECIES_BY_DEX, SPECIES_LIST, STARTER_DEX_ALL } from '../data/species';
import { EVOLUTION_TABLE } from '../data/evolutions';

export const MAX_WILD_LEVEL = 100;

/** Species that only appear as rare events, never in the everyday pool. */
export function isEventSpecies(dexNum: number): boolean {
  const c = SPECIES_BY_DEX.get(dexNum)?.classification;
  return c === 'legendary' || c === 'mythical' || c === 'ultra-beast';
}

const starterSet = new Set(STARTER_DEX_ALL as readonly number[]);
export function isStarterSpecies(dexNum: number): boolean {
  return starterSet.has(dexNum);
}

/** Pre-evolution links, first match wins (a few species have several sources). */
const PRE_EVOLUTION = new Map<number, (typeof EVOLUTION_TABLE)[number]>();
for (const e of EVOLUTION_TABLE) if (!PRE_EVOLUTION.has(e.toDex)) PRE_EVOLUTION.set(e.toDex, e);

/** Item or friendship evolutions arrive this many levels after the earlier stage could be met. */
const NON_LEVEL_EVOLUTION_GAP = 18;
const NON_LEVEL_EVOLUTION_FLOOR = 20;

const minLevelCache = new Map<number, number>();
/**
 * Lowest level a species may be met at in the wild: the level its pre-evolution evolves at, chained
 * through earlier stages. Base forms start at 1.
 */
export function minWildLevel(dexNum: number, seen: Set<number> = new Set()): number {
  const cached = minLevelCache.get(dexNum);
  if (cached != null) return cached;
  const link = PRE_EVOLUTION.get(dexNum);
  if (!link || seen.has(dexNum)) {
    minLevelCache.set(dexNum, 1);
    return 1;
  }
  seen.add(dexNum);
  const earlier = minWildLevel(link.fromDex, seen);
  const level =
    link.trigger === 'level' && typeof link.minLevel === 'number'
      ? Math.max(link.minLevel, earlier)
      : Math.max(NON_LEVEL_EVOLUTION_FLOOR, earlier + NON_LEVEL_EVOLUTION_GAP);
  minLevelCache.set(dexNum, level);
  return level;
}

/**
 * Party level that encounters scale from: the mean of the whole party (SPEC L18). Everyday wilds never go
 * above it, so a newly caught Pokémon is never stronger than the team you've raised. Empty party: 5.
 */
export function encounterBaseLevel(party: OwnedPokemon[]): number {
  if (party.length === 0) return 5;
  const levels = party.map((p) => (typeof p.level === 'number' && p.level > 0 ? p.level : 1));
  const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
  return Math.max(1, Math.min(MAX_WILD_LEVEL, Math.round(mean)));
}

/** Types that thrive in each battle scene (index order matches `SCENES` in battleAmbience.ts). */
export const SCENE_BIOME_TYPES: PokemonType[][] = [
  ['Grass', 'Bug', 'Normal', 'Flying'], // Forest Trail
  ['Grass', 'Bug', 'Normal', 'Poison'], // Deep Long Grass
  ['Normal', 'Flying', 'Grass', 'Ground'], // Open Grassland
  ['Grass', 'Bug', 'Fairy', 'Normal'], // Grassy Place
  ['Rock', 'Ground', 'Fighting', 'Flying'], // Mountain Ridge
  ['Rock', 'Ground', 'Poison', 'Dark'], // Natural Cave
  ['Fire', 'Rock', 'Ground'], // Scalding Cave
  ['Rock', 'Ghost', 'Dark', 'Steel'], // Torma Cavern
  ['Ice', 'Water', 'Normal'], // Frozen Field
  ['Ground', 'Rock', 'Water'], // Sandy Flats
  ['Water', 'Grass', 'Bug'], // Pond Shore
  ['Water', 'Flying'], // Water Surface
  ['Electric', 'Steel'], // Electric Zone
  ['Fairy', 'Psychic', 'Grass'], // Misty Clearing
  ['Fighting', 'Normal', 'Steel'], // Indoor Arena
  ['Steel', 'Electric', 'Poison', 'Normal'], // Building Grounds
  ['Psychic', 'Ghost', 'Fairy'], // Psychic Realm
  ['Dark', 'Psychic', 'Fairy'], // Trick Stage
  ['Ghost', 'Dark', 'Bug', 'Poison'], // Spooky Woods
];

export function biomeTypesForScene(sceneIndex: number | undefined): PokemonType[] {
  const n = SCENE_BIOME_TYPES.length;
  const i = typeof sceneIndex === 'number' && Number.isFinite(sceneIndex) ? ((Math.floor(sceneIndex) % n) + n) % n : 0;
  return SCENE_BIOME_TYPES[i] ?? [];
}

/** How much more often a species that fits the scene appears. */
export const BIOME_TYPE_WEIGHT = 3;
/** Other starters are obtainable, but rare. */
export const STARTER_WILD_WEIGHT = 0.25;

/**
 * Everyday rarity from the species' real catch rate: easy catches are common, pseudo-legendaries
 * and other hard catches are scarce.
 */
export function speciesWeight(dexNum: number): number {
  const s = SPECIES_BY_DEX.get(dexNum);
  if (!s) return 0;
  const base = Math.max(0.12, Math.min(1, (s.baseCatchRate ?? 127) / 255));
  if (isStarterSpecies(dexNum)) return base * STARTER_WILD_WEIGHT;
  // Hard catches are mainly Rocket aces now (SPEC A9), so they're scarcer in the wild.
  return (s.baseCatchRate ?? 127) <= WILD_RARE_CATCH_RATE ? base * WILD_RARE_WEIGHT : base;
}

export interface PickSpeciesOpts {
  level: number;
  enabledGens: number[];
  rng: () => number;
  /** Favoured types (scene biome or trainer theme). */
  favourTypes?: readonly PokemonType[];
  /** Only these types (trainer themes). */
  requireTypes?: readonly PokemonType[];
  /** Prefer uncaught species this share of the time. */
  collectionDex?: Record<number, number>;
  uncaughtBias?: number;
  /** Skip these (for example, already on a trainer's team). */
  exclude?: ReadonlySet<number>;
  /** Include starters at their reduced weight. Trainers don't use other starters. */
  includeStarters?: boolean;
}

/** Everyday species that may appear at `level` in the enabled generations. */
const poolCache = new Map<string, number[]>();
export function everydayPool(level: number, enabledGens: number[], includeStarters = true): number[] {
  const gens = new Set(enabledGens.length > 0 ? enabledGens : [1]);
  const key = `${level}|${[...gens].sort().join(',')}|${includeStarters ? 1 : 0}`;
  const hit = poolCache.get(key);
  if (hit) return hit;
  const out: number[] = [];
  for (const s of SPECIES_LIST) {
    if (!gens.has(s.generation)) continue;
    if (isEventSpecies(s.dexNum)) continue;
    if (!includeStarters && isStarterSpecies(s.dexNum)) continue;
    if (minWildLevel(s.dexNum) > level) continue;
    out.push(s.dexNum);
  }
  if (poolCache.size > 500) poolCache.clear();
  poolCache.set(key, out);
  return out;
}

function weightedPick(pool: number[], weightOf: (dex: number) => number, rng: () => number): number | undefined {
  let total = 0;
  for (const d of pool) total += weightOf(d);
  if (total <= 0) return pool[Math.floor(rng() * pool.length)];
  let roll = rng() * total;
  for (const d of pool) {
    roll -= weightOf(d);
    if (roll <= 0) return d;
  }
  return pool[pool.length - 1];
}

/** One everyday species for this level, honouring biome, theme, rarity and the uncaught bias. */
export function pickEverydaySpecies(opts: PickSpeciesOpts): number {
  const { level, enabledGens, rng } = opts;
  let pool = everydayPool(level, enabledGens, opts.includeStarters !== false);
  if (opts.exclude) pool = pool.filter((d) => !opts.exclude!.has(d));
  if (opts.requireTypes && opts.requireTypes.length > 0) {
    const req = new Set(opts.requireTypes);
    const themed = pool.filter((d) => SPECIES_BY_DEX.get(d)?.types.some((t) => req.has(t)));
    if (themed.length > 0) pool = themed;
  }
  if (pool.length === 0) pool = everydayPool(MAX_WILD_LEVEL, enabledGens, false).filter((d) => minWildLevel(d) <= 1);
  if (pool.length === 0) return 16;

  if (opts.collectionDex && (opts.uncaughtBias ?? 0) > 0 && rng() < (opts.uncaughtBias ?? 0)) {
    const uncaught = pool.filter((d) => (opts.collectionDex![d] ?? 0) <= 0);
    if (uncaught.length > 0) pool = uncaught;
  }

  const favour = new Set(opts.favourTypes ?? []);
  const weightOf = (d: number) => {
    const w = speciesWeight(d);
    return favour.size > 0 && SPECIES_BY_DEX.get(d)?.types.some((t) => favour.has(t)) ? w * BIOME_TYPE_WEIGHT : w;
  };
  return weightedPick(pool, weightOf, rng) ?? pool[0]!;
}
