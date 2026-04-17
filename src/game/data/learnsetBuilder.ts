import type { FullSpeciesData } from './pokedex';
import { FULL_POKEDEX } from './pokedex';
import { MOVES } from './moves';
import type { LearnsetEntry } from './learnsetRules';
import { legalMoveIdsForSpeciesTypes, validateLearnsetAgainstSpecies } from './learnsetRules';
import { LEARNSET_OVERRIDES } from './learnsetOverrides';

const DEFAULT_LEVEL_CURVE = [
  1, 1, 1, 5, 10, 15, 20, 25, 30, 36, 42, 48, 54, 60, 68, 76, 84, 92,
] as const;

const LEGENDARY_LEVEL_CURVE = [
  1, 1, 1, 4, 8, 12, 16, 22, 28, 34, 40, 46, 52, 58, 64, 72, 80, 88,
] as const;

const BABY_LEVEL_CURVE = [
  1, 1, 1, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 74, 82, 90, 98,
] as const;

/** Status moves that read as “early kit” debuffs / simple setup. */
const EARLY_STATUS_BIAS = new Set<string>([
  'growl',
  'tailwhip',
  'leer',
  'playnice',
  'defensecurl',
  'stringshot',
  'sweetscent',
  'smokescreen',
  'poisonpowder',
  'stunspore',
  'sleeppowder',
  'watersport',
  'mudsport',
  'harden',
  'splash',
  'foresight',
  'odorsleuth',
  'nobleroar',
  'howl',
  'workup',
]);

const LATE_STATUS_BIAS = new Set<string>([
  'swordsdance',
  'nastyplot',
  'agility',
  'irondefense',
  'lightscreen',
  'reflect',
  'safeguard',
  'rest',
  'recover',
  'amnesia',
  'batonpass',
  'substitute',
]);

function levelCurveForTier(tier: FullSpeciesData['tier']): readonly number[] {
  if (tier === 'Legendary' || tier === 'Mythical') return LEGENDARY_LEVEL_CURVE;
  if (tier === 'Baby') return BABY_LEVEL_CURVE;
  return DEFAULT_LEVEL_CURVE;
}

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

function statusSortScore(moveId: string): number {
  if (EARLY_STATUS_BIAS.has(moveId)) return 0;
  if (LATE_STATUS_BIAS.has(moveId)) return 2;
  return 1;
}

function stratifiedPick<T>(sorted: readonly T[], want: number): T[] {
  if (sorted.length === 0 || want <= 0) return [];
  if (sorted.length <= want) return [...sorted];
  const out: T[] = [];
  for (let i = 0; i < want; i++) {
    const idx = Math.round((i / (want - 1)) * (sorted.length - 1));
    out.push(sorted[idx]!);
  }
  return dedupeStable(out);
}

function dedupeStable<T>(items: readonly T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of items) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** Stable level order; within a level, status moves first, then damaging by ascending power. */
function normalizeLearnsetEntryOrder(entries: LearnsetEntry[]): void {
  const byLevel = new Map<number, LearnsetEntry[]>();
  for (const e of entries) {
    const list = byLevel.get(e.level) ?? [];
    list.push(e);
    byLevel.set(e.level, list);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const out: LearnsetEntry[] = [];
  for (const lv of levels) {
    const group = byLevel.get(lv)!;
    group.sort((a, b) => {
      const pa = MOVES[a.moveId]!.power;
      const pb = MOVES[b.moveId]!.power;
      const aStatus = pa === 0 ? 0 : 1;
      const bStatus = pb === 0 ? 0 : 1;
      if (aStatus !== bStatus) return aStatus - bStatus;
      if (pa !== pb) return pa - pb;
      return a.moveId.localeCompare(b.moveId);
    });
    out.push(...group);
  }
  entries.length = 0;
  entries.push(...out);
}

function damagingPower(moveId: string): number {
  return MOVES[moveId]?.power ?? 0;
}

function buildDefaultLearnset(species: FullSpeciesData): LearnsetEntry[] {
  const legal = legalMoveIdsForSpeciesTypes(species.types);
  const primary = species.types[0]!;
  const secondary = species.types[1];

  const damaging = legal.filter((id) => damagingPower(id) > 0);
  const status = legal.filter((id) => damagingPower(id) === 0);

  const stabFirst = (ids: string[]) => {
    const stab = ids.filter((id) => {
      const t = MOVES[id]!.type;
      return t === primary || (secondary !== undefined && t === secondary);
    });
    const other = ids.filter((id) => !stab.includes(id));
    return [...stab, ...other];
  };

  const damagingSorted = stabFirst(
    [...damaging].sort((a, b) => damagingPower(a) - damagingPower(b) || a.localeCompare(b)),
  );

  const damagingShuffled = deterministicShuffle(damagingSorted, species.dexNum * 2654435761);

  const statusSorted = [...status].sort(
    (a, b) => statusSortScore(a) - statusSortScore(b) || a.localeCompare(b),
  );

  const statusShuffled = deterministicShuffle(statusSorted, species.dexNum * 1597334677);

  const wantDamage = Math.min(10, Math.max(5, Math.ceil(damagingShuffled.length * 0.55)));
  const wantStatus = Math.min(8, Math.max(4, 18 - wantDamage));

  const pickedDamage = stratifiedPick(damagingShuffled, wantDamage);
  const earlyStatus = statusShuffled.filter((id) => statusSortScore(id) === 0).slice(0, 3);
  const midStatus = statusShuffled.filter((id) => statusSortScore(id) === 1).slice(0, 2);
  const lateStatus = statusShuffled.filter((id) => statusSortScore(id) === 2).slice(0, 3);

  const pickedStatus = dedupeStable([...earlyStatus, ...midStatus, ...lateStatus]).slice(0, wantStatus);

  const curve = levelCurveForTier(species.tier);
  const maxSlots = curve.length;

  const damagesOrdered = dedupeStable([...pickedDamage]).sort(
    (a, b) => damagingPower(a) - damagingPower(b) || a.localeCompare(b),
  );
  const statusesOrdered = dedupeStable([...pickedStatus]).sort(
    (a, b) => statusSortScore(a) - statusSortScore(b) || a.localeCompare(b),
  );

  const leadDamage = damagesOrdered[0];
  const slots = dedupeStable(
    leadDamage
      ? [leadDamage, ...statusesOrdered, ...damagesOrdered.slice(1)]
      : [...statusesOrdered, ...damagesOrdered],
  ).slice(0, maxSlots);

  while (slots.length < Math.min(10, maxSlots)) {
    const next = legal.find((id) => !slots.includes(id));
    if (!next) break;
    slots.push(next);
  }

  const entries: LearnsetEntry[] = slots.map((moveId, i) => ({
    level: curve[i] ?? 1 + i * 6,
    moveId,
  }));
  normalizeLearnsetEntryOrder(entries);

  return entries;
}

export function buildLearnsetForSpecies(species: FullSpeciesData): LearnsetEntry[] {
  const override = LEARNSET_OVERRIDES[species.dexNum];
  const entries = override ? [...override] : buildDefaultLearnset(species);
  normalizeLearnsetEntryOrder(entries);
  validateLearnsetAgainstSpecies(species.dexNum, species.types, entries);
  return entries;
}

export function buildAllLearnsets(): Record<number, LearnsetEntry[]> {
  const out: Record<number, LearnsetEntry[]> = {};
  for (const s of FULL_POKEDEX) {
    out[s.dexNum] = buildLearnsetForSpecies(s);
  }
  return out;
}

export function validateEveryLearnset(
  learnsets: Record<number, LearnsetEntry[]>,
  pokedex: readonly FullSpeciesData[],
): void {
  for (const s of pokedex) {
    const ls = learnsets[s.dexNum];
    if (!ls?.length) throw new Error(`[learnset] missing learnset for dex ${s.dexNum} (${s.name})`);
    validateLearnsetAgainstSpecies(s.dexNum, s.types, ls);
  }
}

let cached: Record<number, LearnsetEntry[]> | undefined;

export function getBuiltLearnsets(): Record<number, LearnsetEntry[]> {
  if (!cached) cached = buildAllLearnsets();
  return cached;
}
