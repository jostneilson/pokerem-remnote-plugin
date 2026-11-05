import { BALANCE, type TransferTier } from '../balance';
import { SPECIES_BY_DEX } from '../data/species';
import type { OwnedPokemon, PokeRemGameState } from '../state/model';
import { isStarterLine } from './evolution';
import { isPerfectIVs } from './pokemonStats';
import { isEventSpecies } from './speciesPool';
import { isBuddy } from './xpShare';

/*
 * Transfer (SPEC A5, L7): send Pokémon away for coins, and XP for every owned Pokémon sharing a type.
 * Permanent; the Pokédex keeps the entry.
 */

/** Everyday Pokémon split by catch rate: hard catches (≤ 45) and starter lines are Rare, ≤ 120 Uncommon. */
export function transferTier(dexNum: number): TransferTier {
  const s = SPECIES_BY_DEX.get(dexNum);
  if (!s) return 'Common';
  if (s.tier !== 'Common') return s.tier;
  const rate = s.baseCatchRate ?? 255;
  if (rate <= 45 || isStarterLine(dexNum)) return 'Rare';
  if (rate <= 120) return 'Uncommon';
  return 'Common';
}

/** Coins for transferring one Pokémon. */
export function transferCoins(mon: Pick<OwnedPokemon, 'dexNum' | 'level' | 'shiny' | 'ivs'>): number {
  const t = BALANCE.transfer;
  const tier = transferTier(mon.dexNum);
  let coins = t.base[tier] * (1 + Math.max(1, mon.level) / t.perLevelDiv);
  if (tier === 'Common') coins = Math.min(t.commonMax, coins);
  if (mon.shiny) coins *= t.shinyMult;
  if (isPerfectIVs(mon.ivs)) coins *= t.hundoMult;
  return Math.round(coins);
}

/** Base XP each same-type Pokémon in the party gets from one transfer (storage gets `storageXpShare` of it). */
export function transferXpBase(mon: Pick<OwnedPokemon, 'level'>): number {
  return BALANCE.transfer.xpBase + BALANCE.transfer.xpPerLevel * Math.max(1, mon.level);
}

export type TransferWarning = 'shiny' | 'hundo' | 'legendary' | 'starter' | 'favorite';

export interface TransferPreview {
  ids: string[];
  mons: OwnedPokemon[];
  coins: number;
  /** Base XP before doublers and boosts, summed over the Pokémon that will receive it. */
  xp: number;
  warnings: TransferWarning[];
  /** Why the transfer can't happen, if it can't. */
  blocked?: 'favorite' | 'last-party' | 'in-battle' | 'none';
}

/** What transferring `ids` would pay and warn about. */
export function transferPreview(state: PokeRemGameState, ids: readonly string[]): TransferPreview {
  const wanted = new Set(ids);
  const owned = [...state.party, ...state.storagePokemon];
  const mons = owned.filter((p) => wanted.has(p.id));
  const leaving = new Set(mons.map((m) => m.id));
  const warnings = new Set<TransferWarning>();
  let coins = 0;
  let xp = 0;
  for (const m of mons) {
    coins += transferCoins(m);
    if (m.shiny) warnings.add('shiny');
    if (isPerfectIVs(m.ivs)) warnings.add('hundo');
    if (isEventSpecies(m.dexNum)) warnings.add('legendary');
    if (isBuddy(state, m)) warnings.add('starter');
    if (m.favorite) warnings.add('favorite');
    const base = transferXpBase(m);
    for (const o of owned) {
      if (leaving.has(o.id) || !o.types.some((t) => m.types.includes(t))) continue;
      xp += state.party.some((p) => p.id === o.id) ? base : base * BALANCE.transfer.storageXpShare;
    }
  }
  const battle = state.currentTrainerBattle;
  const blocked =
    mons.length === 0
      ? 'none'
      : mons.some((m) => m.favorite)
        ? 'favorite'
        : state.party.length > 0 && state.party.every((p) => leaving.has(p.id))
          ? 'last-party'
          : battle && battle.phase === 'active' && mons.some((m) => battle.selectedPartyIds.includes(m.id))
            ? 'in-battle'
            : undefined;
  return { ids: mons.map((m) => m.id), mons, coins, xp: Math.round(xp), warnings: [...warnings], ...(blocked ? { blocked } : {}) };
}
