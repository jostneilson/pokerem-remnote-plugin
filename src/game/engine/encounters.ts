import { SPECIES_BY_DEX, SPECIES_LIST } from '../data/species';
import { STARTER_DEX_ALL } from '../data/pokedex';
import { getEffectiveness } from '../data/typeChart';
import { maxHpFor } from './progression';
import type { EncounterPokemon, OwnedPokemon } from '../state/model';

type Tier = 'Common' | 'Baby' | 'Ultra' | 'Legendary' | 'Mythical';

interface TierConfig {
  minReviews: number;
  weight: number;
}

const TIER_THRESHOLDS: Record<Tier, TierConfig> = {
  Common:    { minReviews: 0,    weight: 65 },
  Baby:      { minReviews: 100,  weight: 12 },
  Ultra:     { minReviews: 300,  weight: 11 },
  Legendary: { minReviews: 1000, weight: 8 },
  Mythical:  { minReviews: 2500, weight: 4 },
};

const TIER_ORDER: Tier[] = ['Common', 'Baby', 'Ultra', 'Legendary', 'Mythical'];

function getEligibleTiers(cardsReviewed: number): { tier: Tier; weight: number }[] {
  return TIER_ORDER
    .filter((t) => cardsReviewed >= TIER_THRESHOLDS[t].minReviews)
    .map((t) => ({ tier: t, weight: TIER_THRESHOLDS[t].weight }));
}

function pickWeightedTier(tiers: { tier: Tier; weight: number }[], rng: () => number): Tier {
  const total = tiers.reduce((sum, t) => sum + t.weight, 0);
  let roll = rng() * total;
  for (const t of tiers) {
    roll -= t.weight;
    if (roll <= 0) return t.tier;
  }
  return tiers[0].tier;
}

const starterSet = new Set(STARTER_DEX_ALL as readonly number[]);

const MAX_WILD_LEVEL = 100;

/** Shiny odds before the player has caught every wild-eligible species in enabled generations. */
export const SHINY_ODDS_PRE_DEX_COMPLETE = 1 / 1000;

/** Shiny odds after full species completion for enabled generations (duplicate hunting). */
export const SHINY_ODDS_POST_DEX_COMPLETE = 1 / 200;

/** Rounded mean of party levels; used so wild encounters track your roster. */
export function averagePartyLevel(party: OwnedPokemon[]): number {
  if (party.length === 0) return 1;
  const sum = party.reduce((acc, p) => acc + (typeof p.level === 'number' && p.level > 0 ? p.level : 1), 0);
  return Math.max(1, Math.min(MAX_WILD_LEVEL, Math.round(sum / party.length)));
}

/** Small skew so rarer tiers feel special without jumping far above the party band. */
function tierLevelSkew(tier: Tier): number {
  if (tier === 'Ultra') return 1;
  if (tier === 'Legendary') return 2;
  if (tier === 'Mythical') return 3;
  return 0;
}

/**
 * All species dex numbers that can appear in wild encounters for the given generations
 * (implemented roster ∩ enabled gens, excluding starters).
 */
export function wildEncounterSpeciesDexSet(enabledGens: number[]): Set<number> {
  const genSet = new Set(enabledGens);
  const out = new Set<number>();
  for (const s of SPECIES_LIST) {
    if (genSet.has(s.generation) && !starterSet.has(s.dexNum)) {
      out.add(s.dexNum);
    }
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

export type SpawnEncounterOpts = {
  collectionDex?: Record<number, number>;
  /** Injected RNG (defaults to `Math.random`) — use for tests. */
  rng?: () => number;
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

  const eligibleTiers = getEligibleTiers(cardsReviewed);

  // When encounter rate is slower, shift weight from Common to rarer tiers
  const adjusted = rarityBonus > 0
    ? eligibleTiers.map((t) => {
        if (t.tier === 'Common') {
          return { ...t, weight: Math.max(30, t.weight - rarityBonus * 2.5) };
        }
        const bonus = (rarityBonus * 2.5) / Math.max(1, eligibleTiers.length - 1);
        return { ...t, weight: t.weight + bonus };
      })
    : eligibleTiers;

  const tier = pickWeightedTier(adjusted, rng);

  const genSet = new Set(enabledGens);
  const pool = SPECIES_LIST.filter((s) =>
    s.tier === tier &&
    genSet.has(s.generation) &&
    !starterSet.has(s.dexNum)
  );

  const fallbackPool = SPECIES_LIST.filter((s) =>
    s.tier === 'Common' &&
    genSet.has(s.generation) &&
    !starterSet.has(s.dexNum)
  );

  const basePool = pool.length > 0 ? pool : fallbackPool;
  const dexComplete = isWildDexGenerationComplete(collectionDex, enabledGens);

  let pickPool = basePool;
  if (!dexComplete) {
    const uncaught = basePool.filter((s) => (collectionDex[s.dexNum] ?? 0) <= 0);
    if (uncaught.length > 0) pickPool = uncaught;
  }

  const species = pickPool[Math.floor(rng() * pickPool.length)] ?? SPECIES_BY_DEX.get(16)!;

  const avg = averagePartyLevel(party);
  const band = Math.floor(rng() * 3) - 1;
  const level = Math.max(1, Math.min(MAX_WILD_LEVEL, avg + band + tierLevelSkew(tier)));
  const maxHp = maxHpFor(species.baseHp, level);

  const shinyOdds = dexComplete ? SHINY_ODDS_POST_DEX_COMPLETE : SHINY_ODDS_PRE_DEX_COMPLETE;
  const shiny = rng() < shinyOdds;

  return {
    dexNum: species.dexNum,
    name: species.name,
    level,
    maxHp,
    currentHp: maxHp,
    types: species.types,
    tier,
    shiny,
  };
}

/** Capped catch probability (0–0.92) — shared by rolls and UI previews. */
export function computeCatchChance(ballBonus: number, baseCatchRate: number | undefined, hpRatio: number): number {
  const rate = baseCatchRate != null ? baseCatchRate : 127;
  const clampedHp = Math.max(0, Math.min(1, hpRatio));
  const hpFactor = 1 + (1 - clampedHp) * 0.55;
  return Math.min(0.92, (rate / 255) * (1 + ballBonus) * hpFactor);
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
  ball: 'poke-ball' | 'great-ball' | 'ultra-ball',
): number {
  const ballBonus = ball === 'ultra-ball' ? 0.4 : ball === 'great-ball' ? 0.2 : 0;
  const baseCatchRate = SPECIES_BY_DEX.get(enc.dexNum)?.baseCatchRate;
  let typeBonus = 0;
  if (active && enc.types.length > 0) {
    for (const aType of active.types) {
      if (getEffectiveness(aType, enc.types) >= 2) {
        typeBonus = 0.15;
        break;
      }
    }
  }
  const hpRatio = enc.maxHp > 0 ? enc.currentHp / enc.maxHp : 1;
  return computeCatchChance(ballBonus + typeBonus, baseCatchRate, hpRatio);
}
