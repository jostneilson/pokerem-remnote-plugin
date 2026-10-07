import { SPECIES_BY_DEX, SPECIES_LIST, STARTER_DEX_ALL } from '../data/species';
import type { PokemonType } from '../data/species';
import { getEffectiveness } from '../data/typeChart';
import { computeCatchChance } from './encounters';
import { maxHpFor } from './progression';
import { movesetForBattle, getInitialMoves } from './moveLearn';
import { MOVES } from '../data/moves';
import type {
  EncounterPokemon,
  OwnedPokemon,
  PokeRemGameState,
  TrainerEnemyMon,
  TrainerIdentity,
  TrainerRewardSnapshot,
  TrainerTier,
  XpDoublerTier,
} from '../state/model';

/**
 * Cards-since-last-trainer-battle thresholds that, once reached, replace the next
 * scheduled wild encounter with a trainer battle. Normal = every 50 cards is the
 * design anchor; rarer/frequent options scale around it.
 */
export const TRAINER_FREQUENCY_THRESHOLDS = {
  off: Number.POSITIVE_INFINITY,
  rare: 100,
  normal: 50,
  frequent: 25,
} as const;

export type TrainerFrequencyKey = keyof typeof TRAINER_FREQUENCY_THRESHOLDS;

export const DEFAULT_TRAINER_FREQUENCY: TrainerFrequencyKey = 'normal';

/** Roughly 1 in 8 trainer battles is an elite. */
export const ELITE_TRAINER_RARITY = 0.12;

const MAX_ENEMY_LEVEL = 100;

/** Catch chance bonuses applied on top of the ball bonus inside trainer battles. */
const TRAINER_CATCH_BONUS: Record<TrainerTier, number> = {
  standard: 0.15,
  elite: 0.3,
};

export function parseTrainerFrequencyKey(raw: unknown): TrainerFrequencyKey {
  if (raw === 'off' || raw === 'rare' || raw === 'normal' || raw === 'frequent') return raw;
  return DEFAULT_TRAINER_FREQUENCY;
}

export function trainerFrequencyThreshold(key: TrainerFrequencyKey): number {
  return TRAINER_FREQUENCY_THRESHOLDS[key];
}

export function isTrainerFrequencyEnabled(key: TrainerFrequencyKey): boolean {
  return key !== 'off';
}

/** Should this card-counter tick spawn a trainer battle (replacing a scheduled wild). */
export function isTrainerBattleDue(counter: number, threshold: number): boolean {
  if (!Number.isFinite(threshold)) return false;
  return counter >= threshold;
}

interface TrainerArchetype {
  id: string;
  className: string;
  /** Theme types — used for elite glow tinting + species filtering. Empty = any. */
  themeTypes: PokemonType[];
  taunts: string[];
  defeatLines: string[];
  victoryLines: string[];
  /** Optional dex pool to draw from in addition to themeTypes. */
  preferredDex?: number[];
  /** Display flair name list (rotated). */
  displayNames?: string[];
}

const STANDARD_ARCHETYPES: TrainerArchetype[] = [
  {
    id: 'bug_catcher',
    className: 'Bug Catcher',
    themeTypes: ['Bug'],
    taunts: [
      'Wait! Don\u2019t walk away! You looked at my bugs!',
      'My net is full of strong Pokémon \u2014 prepare yourself!',
    ],
    defeatLines: ['You\u2019re too strong!', 'My bugs need more training\u2026'],
    victoryLines: ['Bugs are tougher than they look!', 'Better luck next session.'],
    displayNames: ['Wade', 'Doug', 'Sammy'],
  },
  {
    id: 'lass',
    className: 'Lass',
    themeTypes: ['Normal', 'Fairy'],
    taunts: ['Hi! You look like a strong trainer!', 'Let\u2019s have a fun battle!'],
    defeatLines: ['That was fun!', 'You\u2019re really good!'],
    victoryLines: ['Yay, I won!', 'You should study some more.'],
    displayNames: ['Mira', 'Lily', 'Nia'],
  },
  {
    id: 'youngster',
    className: 'Youngster',
    themeTypes: ['Normal', 'Rock', 'Ground'],
    taunts: ['I like shorts! They\u2019re comfy and easy to wear!', 'You don\u2019t look so tough.'],
    defeatLines: ['Aw man.', 'I\u2019ll get you next time!'],
    victoryLines: ['Eh? You lost?', 'Better luck next try.'],
    displayNames: ['Ben', 'Joey', 'Tim'],
  },
  {
    id: 'hiker',
    className: 'Hiker',
    themeTypes: ['Rock', 'Ground', 'Fighting'],
    taunts: ['Yahoo! I\u2019m on top of the world!', 'My rocks are tougher than your books!'],
    defeatLines: ['You knocked me down a peg.', 'Gotta hit the gym.'],
    victoryLines: ['Like a rock!', 'Mountains aren\u2019t made in a day.'],
    displayNames: ['Marc', 'Russ', 'Cliff'],
  },
  {
    id: 'psychic',
    className: 'Psychic',
    themeTypes: ['Psychic'],
    taunts: ['I foresaw this encounter\u2026', 'Your mind is open. Your defense is not.'],
    defeatLines: ['I sensed defeat\u2026 too late.', 'My focus slipped.'],
    victoryLines: ['As foretold.', 'The mind always wins.'],
    displayNames: ['Sage', 'Iris', 'Kai'],
  },
  {
    id: 'rocket_grunt',
    className: 'Team Rocket Grunt',
    themeTypes: ['Poison', 'Dark'],
    taunts: ['Hand over your rare candies!', 'Team Rocket always wins!'],
    defeatLines: ['Rocket retreats!', 'You\u2019ll regret this!'],
    victoryLines: ['Rocket triumphs!', 'Justice is overrated.'],
    displayNames: ['Grunt', 'Operative', 'Recruit'],
  },
  {
    id: 'swimmer',
    className: 'Swimmer',
    themeTypes: ['Water'],
    taunts: ['I\u2019ve been training in the ocean!', 'Don\u2019t drown in the wave of my attacks!'],
    defeatLines: ['Outclassed on dry land\u2026', 'Maybe I should have warmed up.'],
    victoryLines: ['Splash!', 'Stay hydrated, friend.'],
    displayNames: ['Coral', 'Wade', 'Marina'],
  },
  {
    id: 'ace_trainer',
    className: 'Ace Trainer',
    themeTypes: [],
    taunts: ['I\u2019ve trained for moments like this.', 'Show me what your party can do.'],
    defeatLines: ['Well battled.', 'You\u2019ve clearly studied.'],
    victoryLines: ['A clean victory.', 'Sharpen your strategy.'],
    displayNames: ['Quinn', 'Shea', 'Rin'],
  },
];

const ELITE_ARCHETYPES: TrainerArchetype[] = [
  {
    id: 'gym_leader_psychic',
    className: 'Psychic Adept',
    themeTypes: ['Psychic', 'Fairy'],
    taunts: [
      'Welcome to my study hall. Your mind will be tested.',
      'Knowledge is power. Witness mine.',
    ],
    defeatLines: ['A truly enlightened scholar.', 'I bow to your discipline.'],
    victoryLines: ['Return when your mind is ready.', 'A worthy attempt.'],
    displayNames: ['Sabrina', 'Lucian'],
  },
  {
    id: 'gym_leader_fire',
    className: 'Pyro Captain',
    themeTypes: ['Fire'],
    taunts: ['My flames burn brightest under pressure!', 'Light it up!'],
    defeatLines: ['You\u2019ve doused my fire.', 'Even the brightest flame fades.'],
    victoryLines: ['You burned out fast.', 'Fuel up and try again.'],
    displayNames: ['Blaine', 'Flannery'],
  },
  {
    id: 'gym_leader_dragon',
    className: 'Dragon Master',
    themeTypes: ['Dragon', 'Flying'],
    taunts: ['Witness the strength of dragons!', 'Few survive my onslaught.'],
    defeatLines: ['Truly worthy.', 'My dragons salute you.'],
    victoryLines: ['Return when you can roar back.', 'The skies are mine.'],
    displayNames: ['Lance', 'Drake'],
  },
  {
    id: 'elite_four_dark',
    className: 'Elite Four Shadow',
    themeTypes: ['Dark', 'Ghost'],
    taunts: ['You step into my shadow.', 'Few make it this far.'],
    defeatLines: ['The light wins today.', 'Impressive resolve.'],
    victoryLines: ['Crushed by the dark.', 'Train harder, scholar.'],
    displayNames: ['Karen', 'Sidney'],
  },
];

/** Rounded mean party level — same convention as wild encounters. */
function averagePartyLevel(party: OwnedPokemon[]): number {
  if (party.length === 0) return 5;
  const sum = party.reduce((acc, p) => acc + (typeof p.level === 'number' && p.level > 0 ? p.level : 1), 0);
  return Math.max(1, Math.min(MAX_ENEMY_LEVEL, Math.round(sum / party.length)));
}

const starterSet = new Set(STARTER_DEX_ALL as readonly number[]);

function pickArchetype(tier: TrainerTier, rng: () => number): TrainerArchetype {
  const pool = tier === 'elite' ? ELITE_ARCHETYPES : STANDARD_ARCHETYPES;
  return pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
}

function pickFromArray<T>(arr: T[] | undefined, rng: () => number): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

interface BuildEnemyOpts {
  level: number;
  rng: () => number;
}

function buildEnemyForDex(dexNum: number, { level, rng }: BuildEnemyOpts): TrainerEnemyMon | null {
  const species = SPECIES_BY_DEX.get(dexNum);
  if (!species) return null;
  const lv = Math.max(1, Math.min(MAX_ENEMY_LEVEL, Math.floor(level)));
  const maxHp = maxHpFor(species.baseHp, lv);
  const learnsetMoves = getInitialMoves(dexNum, lv);
  const moves = movesetForBattle({ dexNum, level: lv, moves: learnsetMoves });
  // Prefer at least one damaging move so trainer fights actually progress.
  const hasDamaging = moves.some((m) => (MOVES[m]?.power ?? 0) > 0);
  let finalMoves = moves;
  if (!hasDamaging) {
    finalMoves = ['tackle', ...moves].filter((m, i, a) => a.indexOf(m) === i).slice(0, 4);
  }
  // Touch rng so rolls stay deterministic in tests when more enemies are generated.
  void rng;
  return {
    dexNum,
    name: species.name,
    level: lv,
    maxHp,
    currentHp: maxHp,
    types: species.types,
    moves: finalMoves,
    defeated: false,
  };
}

function eligibleSpeciesPool(
  archetype: TrainerArchetype,
  enabledGens: number[],
  tier: TrainerTier,
): number[] {
  const genSet = new Set(enabledGens);
  const themeSet = new Set(archetype.themeTypes);
  const out: number[] = [];
  for (const s of SPECIES_LIST) {
    if (!genSet.has(s.generation)) continue;
    if (starterSet.has(s.dexNum)) continue;
    if (themeSet.size > 0) {
      if (!s.types.some((t) => themeSet.has(t))) continue;
    }
    if (tier === 'standard') {
      if (s.tier !== 'Common' && s.tier !== 'Baby') continue;
    } else {
      // Elite teams can include rarer mons but never legendaries / mythicals (kept distinct from wild legendaries).
      if (s.tier === 'Legendary' || s.tier === 'Mythical') continue;
    }
    out.push(s.dexNum);
  }
  if (out.length === 0) {
    // Fall back to enabled-gen non-starter Common species so generation always resolves.
    for (const s of SPECIES_LIST) {
      if (!genSet.has(s.generation)) continue;
      if (starterSet.has(s.dexNum)) continue;
      if (s.tier !== 'Common') continue;
      out.push(s.dexNum);
    }
  }
  return out;
}

interface GenerateTrainerOpts {
  tier: TrainerTier;
  enabledGens: number[];
  averageLevel: number;
  rng: () => number;
}

export function generateTrainer({ tier, enabledGens, averageLevel, rng }: GenerateTrainerOpts): {
  identity: TrainerIdentity;
  enemies: TrainerEnemyMon[];
} {
  const archetype = pickArchetype(tier, rng);
  const pool = eligibleSpeciesPool(archetype, enabledGens.length > 0 ? enabledGens : [1], tier);
  if (pool.length === 0) {
    // Last-resort: use a Pidgey at base level so this never throws.
    pool.push(16);
  }

  const baseLevel = Math.max(2, averageLevel + (tier === 'elite' ? 3 : 0));
  const enemies: TrainerEnemyMon[] = [];
  for (let i = 0; i < 3; i++) {
    const skew =
      tier === 'elite'
        ? Math.floor(rng() * 3) // 0..2
        : Math.floor(rng() * 3) - 1; // -1..1
    const lv = Math.max(2, Math.min(MAX_ENEMY_LEVEL, baseLevel + skew));
    let dexNum = pool[Math.floor(rng() * pool.length)]!;
    // Avoid all-same teams when the pool is large enough.
    if (pool.length > 3 && enemies.some((e) => e.dexNum === dexNum)) {
      const filtered = pool.filter((d) => !enemies.some((e) => e.dexNum === d));
      if (filtered.length > 0) dexNum = filtered[Math.floor(rng() * filtered.length)]!;
    }
    const built = buildEnemyForDex(dexNum, { level: lv, rng });
    if (built) enemies.push(built);
  }
  while (enemies.length < 3) {
    enemies.push(
      buildEnemyForDex(16, { level: Math.max(2, baseLevel), rng })!,
    );
  }

  const identity: TrainerIdentity = {
    archetypeId: archetype.id,
    className: archetype.className,
    displayName: pickFromArray(archetype.displayNames, rng),
    themeTypes: archetype.themeTypes,
    taunt: pickFromArray(archetype.taunts, rng) ?? 'Let\u2019s battle!',
    defeatLine: pickFromArray(archetype.defeatLines, rng) ?? 'Well played.',
    victoryLine: pickFromArray(archetype.victoryLines, rng) ?? 'Better luck next time.',
  };

  return { identity, enemies };
}

/** Cooldown-resetting roll: returns true for an elite trainer this fight. */
export function rollEliteTier(rng: () => number = Math.random): boolean {
  return rng() < ELITE_TRAINER_RARITY;
}

/**
 * Reward snapshot generated on victory. Items + coins + trainer XP scale with tier.
 * XP Doubler tier is rolled separately so winning still feels exciting even when items are modest.
 */
export function generateTrainerRewards(
  tier: TrainerTier,
  averageLevel: number,
  rng: () => number = Math.random,
): TrainerRewardSnapshot {
  const isElite = tier === 'elite';
  const lvScale = Math.max(1, averageLevel);
  const coins = isElite
    ? 200 + Math.floor(lvScale * 4) + Math.floor(rng() * 60)
    : 80 + Math.floor(lvScale * 2) + Math.floor(rng() * 30);
  const trainerXp = isElite ? 120 : 45;
  const items: Partial<Record<string, number>> = isElite
    ? { 'great-ball': 2, 'super-potion': 2, revive: 1 }
    : { 'poke-ball': 2, potion: 2 };

  let xpDoublerTier: XpDoublerTier | undefined;
  if (isElite) {
    xpDoublerTier = 'rare';
  } else if (rng() < 0.2) {
    xpDoublerTier = 'common';
  }

  const headline = isElite
    ? 'Elite trainer defeated! A prestige reward awaits.'
    : 'Trainer defeated! Great work, scholar.';

  return { coins, trainerXp, items, xpDoublerTier, headline };
}

/**
 * Catch chance against a trainer's defeated Pokémon (post-win pick of one of three).
 * Reuses {@link computeCatchChance} with a small tier-based bonus and uses the chosen
 * enemy's *current* HP (typically near KO after the fight).
 */
export function trainerCatchChance(
  enemy: TrainerEnemyMon,
  active: OwnedPokemon | undefined,
  ball: 'poke-ball' | 'great-ball' | 'ultra-ball',
  tier: TrainerTier,
): number {
  const ballBonus = ball === 'ultra-ball' ? 0.4 : ball === 'great-ball' ? 0.2 : 0;
  const tierBonus = TRAINER_CATCH_BONUS[tier];
  const baseCatchRate = SPECIES_BY_DEX.get(enemy.dexNum)?.baseCatchRate;
  let typeBonus = 0;
  if (active && enemy.types.length > 0) {
    for (const aType of active.types) {
      if (getEffectiveness(aType, enemy.types) >= 2) {
        typeBonus = 0.1;
        break;
      }
    }
  }
  const hpRatio = enemy.maxHp > 0 ? enemy.currentHp / enemy.maxHp : 0;
  return computeCatchChance(ballBonus + tierBonus + typeBonus, baseCatchRate, hpRatio);
}

/** Convert a trainer enemy slot into a spawnable {@link EncounterPokemon} after a successful catch. */
export function trainerEnemyAsEncounter(enemy: TrainerEnemyMon): EncounterPokemon {
  return {
    dexNum: enemy.dexNum,
    name: enemy.name,
    level: enemy.level,
    currentHp: Math.max(1, Math.min(enemy.maxHp, enemy.currentHp)),
    maxHp: enemy.maxHp,
    types: enemy.types,
  };
}

/** Average level helper exported so reducers can call without re-importing encounters. */
export function averageOwnedPartyLevel(party: OwnedPokemon[]): number {
  return averagePartyLevel(party);
}

/**
 * Pure helper: should the next scheduled wild encounter be replaced with a trainer battle?
 * Returns the chosen tier when yes; null otherwise.
 */
export function rollTrainerBattleReplacement(
  state: PokeRemGameState,
  freq: TrainerFrequencyKey,
  rng: () => number = Math.random,
): TrainerTier | null {
  if (!isTrainerFrequencyEnabled(freq)) return null;
  const counter = state.trainerBattleCounter ?? 0;
  if (!isTrainerBattleDue(counter, trainerFrequencyThreshold(freq))) return null;
  return rollEliteTier(rng) ? 'elite' : 'standard';
}
