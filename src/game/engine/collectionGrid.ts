import type { PokemonType } from '../data/species';
import type { OwnedPokemon } from '../state/model';
import { battleStats, isPerfectIVs, ivAverage } from './pokemonStats';
import { isEventSpecies } from './speciesPool';
import { transferTier } from './transfer';

/*
 * View all grid (SPEC U4, U5): sorting, filtering and "Select duplicates (keep best)" over every owned Pokémon.
 * Pure helpers so the screen stays thin and the rules are tested.
 */

export type GridSort = 'level' | 'iv' | 'power' | 'dex' | 'type' | 'caught' | 'rarity';
export type GridFlag = 'shiny' | 'hundo' | 'legendary' | 'favorite' | 'duplicates' | 'party' | 'storage';

export type GridEntry = { mon: OwnedPokemon; inParty: boolean };

export type GridQuery = {
  search?: string;
  flags?: GridFlag[];
  type?: PokemonType | null;
  sort?: GridSort;
  /** true = ascending. Default is descending (highest first), except Dex # and Type, which read A→Z. */
  ascending?: boolean;
};

const RARITY_RANK: Record<string, number> = { Common: 0, Uncommon: 1, Baby: 2, Rare: 3, Ultra: 4, Legendary: 5, Mythical: 6 };

/** Caught order: ids are `pk_<ms>_…`; anything else sorts first. */
export function caughtOrder(mon: Pick<OwnedPokemon, 'id'>): number {
  const m = /^pk_(\d+)/.exec(mon.id);
  return m ? Number(m[1]) : 0;
}

export function rarityRank(mon: Pick<OwnedPokemon, 'dexNum'>): number {
  return RARITY_RANK[transferTier(mon.dexNum)] ?? 0;
}

export function isLegendaryClass(mon: Pick<OwnedPokemon, 'dexNum'>): boolean {
  return isEventSpecies(mon.dexNum) || rarityRank(mon) >= RARITY_RANK.Ultra!;
}

export function allOwned(party: OwnedPokemon[], storage: OwnedPokemon[]): GridEntry[] {
  return [...party.map((mon) => ({ mon, inParty: true })), ...storage.map((mon) => ({ mon, inParty: false }))];
}

function speciesCounts(entries: GridEntry[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const e of entries) counts.set(e.mon.dexNum, (counts.get(e.mon.dexNum) ?? 0) + 1);
  return counts;
}

function sortKey(mon: OwnedPokemon, sort: GridSort): number | string {
  switch (sort) {
    case 'iv':
      return ivAverage(mon);
    case 'power':
      return battleStats(mon).power;
    case 'dex':
      return mon.dexNum;
    case 'type':
      return mon.types[0] ?? '';
    case 'caught':
      return caughtOrder(mon);
    case 'rarity':
      return rarityRank(mon);
    default:
      return mon.level;
  }
}

/** Filter and sort the grid. Ties fall back to level (high first), then Dex #. */
export function queryGrid(entries: GridEntry[], q: GridQuery): GridEntry[] {
  const flags = new Set(q.flags ?? []);
  const search = (q.search ?? '').trim().toLowerCase();
  const counts = flags.has('duplicates') ? speciesCounts(entries) : null;
  const filtered = entries.filter(({ mon, inParty }) => {
    if (search && !`${mon.nickname ?? ''} ${mon.name} ${mon.dexNum}`.toLowerCase().includes(search)) return false;
    if (q.type && !mon.types.includes(q.type)) return false;
    if (flags.has('shiny') && !mon.shiny) return false;
    if (flags.has('hundo') && !isPerfectIVs(mon.ivs)) return false;
    if (flags.has('legendary') && !isLegendaryClass(mon)) return false;
    if (flags.has('favorite') && !mon.favorite) return false;
    if (counts && (counts.get(mon.dexNum) ?? 0) < 2) return false;
    if (flags.has('party') && !flags.has('storage') && !inParty) return false;
    if (flags.has('storage') && !flags.has('party') && inParty) return false;
    return true;
  });
  const sort = q.sort ?? 'level';
  const ascending = q.ascending ?? (sort === 'dex' || sort === 'type');
  const dir = ascending ? 1 : -1;
  return filtered.sort((a, b) => {
    const ka = sortKey(a.mon, sort);
    const kb = sortKey(b.mon, sort);
    const c = typeof ka === 'string' ? ka.localeCompare(kb as string) : ka - (kb as number);
    return c * dir || b.mon.level - a.mon.level || a.mon.dexNum - b.mon.dexNum || a.mon.id.localeCompare(b.mon.id);
  });
}

/**
 * "Select duplicates (keep best)": for each species, keep the highest IV % (ties: higher level) and select the
 * rest. Party members and shiny, HUNDO, favourite, starter and lead Pokémon are never selected.
 */
export function selectDuplicatesKeepBest(entries: GridEntry[], keep: { starterId?: string; activeId?: string | null } = {}): string[] {
  const bySpecies = new Map<number, OwnedPokemon[]>();
  const inParty = new Set(entries.filter((e) => e.inParty).map((e) => e.mon.id));
  for (const { mon } of entries) bySpecies.set(mon.dexNum, [...(bySpecies.get(mon.dexNum) ?? []), mon]);
  const out: string[] = [];
  for (const mons of bySpecies.values()) {
    if (mons.length < 2) continue;
    const ranked = [...mons].sort((a, b) => ivAverage(b) - ivAverage(a) || b.level - a.level || caughtOrder(a) - caughtOrder(b));
    for (const mon of ranked.slice(1)) {
      const protectedMon =
        inParty.has(mon.id) ||
        mon.shiny ||
        isPerfectIVs(mon.ivs) ||
        mon.favorite ||
        mon.id === keep.starterId ||
        mon.id === keep.activeId;
      if (!protectedMon) out.push(mon.id);
    }
  }
  return out;
}
