import {
  BIRD_CHANCE,
  BIRD_MIN_REVIEWS,
  EVENT_CHANCE,
  EVENT_MIN_PARTY_LEVEL,
  EVENT_MIN_REVIEWS,
  pickGalarianBird,
  type TeamId,
  GALARIAN_BIRDS,
  GALARIAN_BIRD_SHINY_ODDS,
  SHINY_ODDS_POST_DEX_COMPLETE,
  SHINY_ODDS_PRE_DEX_COMPLETE,
  shinyOddsWithPity
} from './rarity';
export * from './rarity';
import { rollIVs, battleStats } from './pokemonStats';
import { SPECIES_BY_DEX, SPECIES_LIST, type PokemonType } from '../data/species';
import { getEffectiveness } from '../data/typeChart';
import { canBeShiny } from '../data/shinyArt';
import { biomeTypesForScene, encounterBaseLevel, isEventSpecies, MAX_WILD_LEVEL, minWildLevel, pickEverydaySpecies } from './speciesPool';
import type { BattleCondition, EncounterPokemon, OwnedPokemon } from '../state/model';


/** Party level wild encounters scale from (top three party members; see speciesPool). */
export function averagePartyLevel(party: OwnedPokemon[]): number {
  return encounterBaseLevel(party);
}


/** Shiny chance for one encounter of this species: Galarian birds 25%, otherwise base odds with pity. */
export function encounterShinyOdds(dexNum: number, baseOdds: number, encountersSinceShiny: number): number {
  if (!canBeShiny(dexNum)) return 0;
  if (GALARIAN_BIRDS.has(dexNum)) return GALARIAN_BIRD_SHINY_ODDS;
  return shinyOddsWithPity(baseOdds, encountersSinceShiny);
}

/** Share of everyday encounters drawn from species you haven't caught yet (until the Dex is complete). */
export const UNCAUGHT_BIAS = 0.7;
/** Wild battle HP relative to the same Pokémon once caught. */
export const WILD_HP_SCALE = 0.7;

/**
 * All species obtainable in the enabled generations. Starters count: they turn up in the wild as
 * rare encounters, and legendaries as events.
 */
export function wildEncounterSpeciesDexSet(enabledGens: number[]): Set<number> {
  const genSet = new Set(enabledGens);
  const out = new Set<number>();
  for (const s of SPECIES_LIST) {
    if (genSet.has(s.generation)) out.add(s.dexNum);
  }
  return out;
}

/**
 * True when every species in {@link wildEncounterSpeciesDexSet} has been caught at least once.
 * Species-only (shiny variants do not matter).
 */
export function isWildDexGenerationComplete(
  collectionDex: Record<number, number> | undefined,
  enabledGens: number[],
): boolean {
  const universe = wildEncounterSpeciesDexSet(enabledGens);
  if (universe.size === 0) return false;
  const dex = collectionDex ?? {};
  for (const n of universe) {
    if ((dex[n] ?? 0) <= 0) return false;
  }
  return true;
}

/** Share of everyday wilds near your party's average level; the rest are weaker, natural-level ones. */
export const WILD_NEAR_SHARE = 0.7;

export type SpawnEncounterOpts = {
  collectionDex?: Record<number, number>;
  /** Actual cadence. Rare odds are per encounter (SPEC L1), so this no longer changes them; kept for callers. */
  pacing?: { reviewsPerEncounter: number; modulo?: number; unitsPerReview?: number };
  /** Your team, which secretly favours its Galarian bird. */
  team?: TeamId;
  /** Injected RNG (defaults to `Math.random`) — use for tests. */
  rng?: () => number;
  /** Battle scene the encounter appears in; favours the scene's types. */
  sceneIndex?: number;
  /** Encounters since the last shiny, for the pity ramp. */
  encountersSinceShiny?: number;
};

export function spawnEncounter(
  party: OwnedPokemon[],
  cardsReviewed: number = 0,
  enabledGens: number[] = [1, 2, 3, 4, 5, 6, 7, 8],
  rarityBonus: number = 0,
  opts?: SpawnEncounterOpts,
): EncounterPokemon & { tier?: string } {
  const rng = typeof opts?.rng === 'function' ? opts.rng : Math.random;
  const collectionDex = opts?.collectionDex ?? {};
  const gens = enabledGens.length > 0 ? enabledGens : [1];
  const dexComplete = isWildDexGenerationComplete(collectionDex, gens);

  // Shiny is rolled first so it is independent of everything else about the encounter.
  const shinyRoll = rng();

  const base = encounterBaseLevel(party);
  // `rarityBonus` (faster pacing) no longer raises event odds: rarity is per encounter (SPEC L1).
  void rarityBonus;
  const bird = cardsReviewed >= BIRD_MIN_REVIEWS && rng() < BIRD_CHANCE;
  const eventPool =
    !bird && base >= EVENT_MIN_PARTY_LEVEL && cardsReviewed >= EVENT_MIN_REVIEWS && rng() < EVENT_CHANCE
      ? SPECIES_LIST.filter((s) => gens.includes(s.generation) && isEventSpecies(s.dexNum) && !GALARIAN_BIRDS.has(s.dexNum))
      : [];

  let dexNum: number;
  let level: number;
  if (bird) {
    // The birds are every team's mascots, so they appear whichever generations are enabled.
    dexNum = pickGalarianBird(opts?.team, rng);
    level = base + 3 + Math.floor(rng() * 3);
  } else if (eventPool.length > 0) {
    const uncaught = eventPool.filter((s) => (collectionDex[s.dexNum] ?? 0) <= 0);
    const pool = uncaught.length > 0 && rng() < UNCAUGHT_BIAS ? uncaught : eventPool;
    dexNum = pool[Math.floor(rng() * pool.length)]!.dexNum;
    level = base + 3 + Math.floor(rng() * 3);
  } else {
    // Most wilds are near your party's average (never above it); some are weaker, at a level natural for them.
    const near = base <= 5 || rng() < WILD_NEAR_SHARE;
    const pickAt = near ? base : base - 4;
    const pick = (lv: number) =>
      pickEverydaySpecies({
        level: lv,
        enabledGens: gens,
        rng,
        favourTypes: biomeTypesForScene(opts?.sceneIndex),
        collectionDex,
        uncaughtBias: dexComplete ? 0 : UNCAUGHT_BIAS,
      });
    if (near) {
      level = Math.max(1, base - Math.floor(rng() * 4));
      dexNum = pick(level);
    } else {
      dexNum = pick(pickAt);
      const lo = Math.min(pickAt, minWildLevel(dexNum));
      level = lo + Math.floor(rng() * (pickAt - lo + 1));
    }
  }
  level = Math.max(1, Math.min(MAX_WILD_LEVEL, level));
  const species = SPECIES_BY_DEX.get(dexNum) ?? SPECIES_BY_DEX.get(16)!;
  const shiny = shinyRoll < encounterShinyOdds(species.dexNum, dexComplete ? SHINY_ODDS_POST_DEX_COMPLETE : SHINY_ODDS_PRE_DEX_COMPLETE, opts?.encountersSinceShiny ?? 0);

  const ivs = rollIVs(rng);
  // Wild Pokémon have a lighter HP pool than owned ones so everyday fights take 2–4 turns.
  const maxHp = Math.max(1, Math.round(battleStats({ dexNum: species.dexNum, level, ivs }).hp * WILD_HP_SCALE));

  return {
    ivs,
    dexNum: species.dexNum,
    name: species.name,
    level,
    maxHp,
    currentHp: maxHp,
    types: species.types,
    tier: species.tier,
    shiny,
  };
}

/** Capped catch probability (0–0.92) — shared by rolls and UI previews. */
export function computeCatchChance(ballBonus: number, baseCatchRate: number | undefined, hpRatio: number, statusMult = 1): number {
  const rate = baseCatchRate != null ? baseCatchRate : 127;
  const clampedHp = Math.max(0, Math.min(1, hpRatio));
  const hpFactor = 1 + (1 - clampedHp) * 0.55;
  return Math.min(0.92, (rate / 255) * (1 + ballBonus) * hpFactor * statusMult);
}

/** Main-series status catch bonus: asleep or frozen ×2, paralysed, poisoned or burned ×1.5. */
export function catchStatusMultiplier(condition: BattleCondition | undefined): number {
  const a = condition?.ailment;
  if (a === 'sleep' || a === 'freeze') return 2;
  if (a === 'paralysis' || a === 'poison' || a === 'burn') return 1.5;
  return 1;
}

/** A shiny Legendary or Mythical (Ultra Beasts included) is always caught by the first ball. */
export function isGuaranteedCatch(enc: { dexNum: number; shiny?: boolean }): boolean {
  return enc.shiny === true && isEventSpecies(enc.dexNum);
}

export type CatchBall = 'poke-ball' | 'great-ball' | 'ultra-ball';
/** Cheapest first. */
export const CATCH_BALLS: readonly CatchBall[] = ['poke-ball', 'great-ball', 'ultra-ball'];
export const BALL_CATCH_BONUS: Record<CatchBall, number> = { 'poke-ball': 0, 'great-ball': 0.2, 'ultra-ball': 0.4 };
/** The one-tap Catch throws the cheapest ball with at least this chance. */
export const RECOMMENDED_BALL_CHANCE = 0.5;

/**
 * Ball the one-tap Catch throws: the cheapest one you own with a reasonable chance, else the best
 * one you own. Saves Ultra Balls for when they matter.
 */
export function recommendedBall(bag: Record<string, number>, enc: EncounterPokemon, active: OwnedPokemon | undefined): CatchBall {
  const owned = CATCH_BALLS.filter((b) => (bag[b] ?? 0) > 0);
  if (owned.length === 0) return 'poke-ball';
  const good = owned.find((b) => wildCatchChancePreview(enc, active, b) >= RECOMMENDED_BALL_CHANCE);
  return good ?? owned[owned.length - 1]!;
}

/**
 * Simplified catch check: base species rate, ball bonus, and lower current HP raises odds
 * (similar spirit to main-series games without full ball/block formulas).
 */
export function tryCatch(ballBonus: number, baseCatchRate: number | undefined, hpRatio: number): boolean {
  return Math.random() < computeCatchChance(ballBonus, baseCatchRate, hpRatio);
}

/** Same priority order as {@link catchEncounter} in store. */
export function nextCatchBallForBag(bag: Record<string, number>): 'poke-ball' | 'great-ball' | 'ultra-ball' {
  if ((bag['ultra-ball'] ?? 0) > 0) return 'ultra-ball';
  if ((bag['great-ball'] ?? 0) > 0) return 'great-ball';
  return 'poke-ball';
}

/** Catch chance for the next throw using the same bonuses as battle catch logic. */
export function wildCatchChancePreview(
  enc: EncounterPokemon,
  active: OwnedPokemon | undefined,
  ball: CatchBall,
): number {
  if (isGuaranteedCatch(enc)) return 1;
  const baseCatchRate = SPECIES_BY_DEX.get(enc.dexNum)?.baseCatchRate;
  const hpRatio = enc.maxHp > 0 ? enc.currentHp / enc.maxHp : 1;
  return computeCatchChance(BALL_CATCH_BONUS[ball] + catchTypeBonus(active, enc.types), baseCatchRate, hpRatio, catchStatusMultiplier(enc.condition));
}

export const CATCH_TYPE_ADVANTAGE_BONUS = 0.15;

/** Catch bonus when your lead has a super-effective type against the target (wild and trainer alike). */
export function catchTypeBonus(active: { types: PokemonType[] } | undefined, targetTypes: PokemonType[]): number {
  if (!active || targetTypes.length === 0) return 0;
  return active.types.some((t) => getEffectiveness(t, targetTypes) >= 2) ? CATCH_TYPE_ADVANTAGE_BONUS : 0;
}

