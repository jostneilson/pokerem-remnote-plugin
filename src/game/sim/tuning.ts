import { BALANCE } from '../balance';
import { CURRENCY_REWARDS } from '../engine/shop';
import type { BandResult } from './balance';

/** SPEC Appendix T only. Fixed rules, rarity rates, XP curves and capacity are deliberately absent. */
export const TUNE_LIMITS = {
  'coins.review': [5, 25],
  'coins.defeatBase': [30, 150],
  'coins.defeatPerLevel': [3, 15],
  'coins.catchBase': [0, Number.MAX_SAFE_INTEGER],
  'coins.catchPerLevel': [0, Number.MAX_SAFE_INTEGER],
  'xp.studyPerCard': [0.6, 3],
  'xp.knockoutMult': [0.3, 1.2],
  'xp.fightMult': [0.3, 1.2],
  'xp.typeShareMult': [0.3, 1.2],
  'transfer.base.Common': [15, 45],
  'transfer.base.Uncommon': [30, 90],
  'transfer.base.Rare': [75, 225],
  'transfer.base.Baby': [40, 120],
  'transfer.base.Ultra': [300, 900],
  'transfer.base.Legendary': [750, 2250],
  'transfer.base.Mythical': [1250, 3750],
  'transfer.xpBase': [4, 20],
  'transfer.xpPerLevel': [1, 4],
  'bounty.chance': [1 / 60, 1 / 25],
  'rocket.gruntCoinBase': [600, 2500],
  'rocket.gruntCoinPerAvg': [10, 40],
  'rocket.leaderCoinMin': [5000, 25000],
  'rocket.leaderCoinMax': [5000, 25000],
  'quests.scale': [0.6, 1.4],
  researchCoinScale: [0.6, 1.4],
  'achievementCoins.common': [250, 750],
  'achievementCoins.uncommon': [750, 2250],
  'achievementCoins.rare': [2500, 7500],
  'achievementCoins.epic': [7500, 22500],
  trainerLevelCoinPerLevel: [100, 500]
} as const;

export type TuneKey = keyof typeof TUNE_LIMITS;
export type BalanceCandidate = Partial<Record<TuneKey, number>>;
export type BalanceGrid = Partial<Record<TuneKey, number[]>>;

function slot(path: TuneKey): { object: Record<string, unknown>; key: string } {
  const parts = path.split('.');
  let object = BALANCE as unknown as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) object = object[part] as Record<string, unknown>;
  return { object, key: parts[parts.length - 1]! };
}

export function balanceValue(path: TuneKey): number {
  const { object, key } = slot(path);
  return object[key] as number;
}

export function validateCandidate(input: unknown): BalanceCandidate {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected a candidate object');
  const candidate: BalanceCandidate = {};
  for (const [path, value] of Object.entries(input)) {
    if (!Object.prototype.hasOwnProperty.call(TUNE_LIMITS, path))
      throw new Error(`Fixed or unknown parameter: ${path}`);
    const key = path as TuneKey;
    const [lo, hi] = TUNE_LIMITS[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi)
      throw new Error(`Outside Appendix T: ${path}=${value}`);
    candidate[key] = value;
  }
  const get = (key: TuneKey) => candidate[key] ?? balanceValue(key);
  for (let level = 1; level <= 100; level++) {
    if (
      get('coins.catchBase') + Math.floor(level * get('coins.catchPerLevel')) >=
      get('coins.defeatBase') + Math.floor(level * get('coins.defeatPerLevel'))
    )
      throw new Error('Catch must pay less than defeat at every level');
  }
  if (get('rocket.leaderCoinMin') > get('rocket.leaderCoinMax'))
    throw new Error('Leader minimum exceeds maximum');
  return candidate;
}

/** Deterministic cartesian grid; include the current baseline, dedupe equivalent settings, bound compute. */
export function expandBalanceGrid(input: unknown, maxCandidates = 64): BalanceCandidate[] {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected a grid object');
  let candidates: BalanceCandidate[] = [{}];
  for (const [path, values] of Object.entries(input).sort(([a], [b]) => a.localeCompare(b))) {
    if (
      !Object.prototype.hasOwnProperty.call(TUNE_LIMITS, path) ||
      !Array.isArray(values) ||
      !values.length
    )
      throw new Error(`Invalid grid axis: ${path}`);
    const key = path as TuneKey;
    // Individual range validation; cross-parameter constraints are checked on complete candidates below.
    const [lo, hi] = TUNE_LIMITS[key];
    const unique = [...new Set(values)];
    if (unique.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi))
      throw new Error(`Outside Appendix T: ${path}`);
    if (candidates.length * unique.length > maxCandidates)
      throw new Error(`Grid exceeds ${maxCandidates} candidates`);
    candidates = candidates.flatMap((c) => unique.map((v) => ({ ...c, [key]: v })));
  }
  const result = new Map<string, BalanceCandidate>();
  result.set('{}', {});
  for (const candidate of candidates) {
    try {
      const valid = validateCandidate(candidate);
      const changed = Object.fromEntries(
        Object.entries(valid).filter(([key, value]) => value !== balanceValue(key as TuneKey))
      ) as BalanceCandidate;
      result.set(JSON.stringify(changed), changed);
    } catch {
      /* In-range values can still violate defeat > catch together. Do not simulate those combinations. */
    }
  }
  if (result.size > maxCandidates)
    throw new Error(`Grid plus baseline exceeds ${maxCandidates} candidates`);
  return [...result.values()];
}

/** Simulation-only overrides. Every worker owns its process; synchronous finally restores all aliases too. */
export function withBalanceCandidate<T>(input: BalanceCandidate, run: () => T): T {
  const candidate = validateCandidate(input);
  const saved = Object.keys(candidate).map(
    (key) => [key as TuneKey, balanceValue(key as TuneKey)] as const
  );
  const aliases = CURRENCY_REWARDS as unknown as Record<string, number>;
  const savedAliases = { ...aliases };
  try {
    for (const [path, value] of Object.entries(candidate)) {
      const { object, key } = slot(path as TuneKey);
      object[key] = value;
    }
    // shop.ts captures these fields at module initialization; patch the simulation's copy, not game files.
    aliases.review = BALANCE.coins.review;
    aliases.defeat = BALANCE.coins.defeatBase;
    aliases.catch = BALANCE.coins.catchBase;
    return run();
  } finally {
    for (const [path, value] of saved) {
      const { object, key } = slot(path);
      object[key] = value;
    }
    Object.assign(aliases, savedAliases);
  }
}

/** Search only controllable C2 metrics. Rarity/capacity stay visible, never optimized by RNG luck or rule changes. */
const SCORE_BANDS: Record<string, readonly [number, number]> = {
  'level@500': [12.75, 17.25],
  'level@1000': [18.7, 25.3],
  'level@3000': [32.3, 43.7],
  'level@6000': [42.5, 57.5],
  'keep-gap@1000': [0, 6],
  'catch-gap': [-100, -2],
  'income-early': [7000, 10000],
  'income-L40': [10000, 14000],
  'mix-battles': [30, 50],
  'mix-cards': [8, 22],
  'mix-claims': [15, 35],
  'mix-variable': [12, 28],
  variance: [0.35, 0.6],
  abuse: [0, 0.8]
};

export function scoreBalanceBands(bands: BandResult[]): number {
  let score = 0;
  for (const [id, [lo, hi]] of Object.entries(SCORE_BANDS)) {
    const band = bands.find((b) => b.id === id);
    if (!band) {
      score += 10;
      continue;
    }
    const value = Number(band.measured.replace(/[^\d.\-]/g, ''));
    if (!Number.isFinite(value)) {
      score += 10;
      continue;
    }
    const distance = Math.max(0, lo - value, value - hi) / Math.max(1e-6, hi - lo);
    score += (band.pass ? 0 : 1) + distance;
  }
  return score;
}

export function missingSearchBands(bands: BandResult[]): string[] {
  return Object.keys(SCORE_BANDS).filter((id) => !bands.some((band) => band.id === id));
}
