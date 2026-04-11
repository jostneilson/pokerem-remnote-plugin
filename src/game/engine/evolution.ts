import type { OwnedPokemon } from '../state/model';
import { EVOLUTION_FROM } from '../data/evolutions';
import { SPECIES_BY_DEX } from '../data/species';
import { maxHpFor } from './progression';

/** Next species-form unlocked purely by level (if any), strictly after current level. */
export function nextFutureLevelEvolution(mon: OwnedPokemon): { minLevel: number; intoName: string } | null {
  if ((mon as { everstone?: boolean }).everstone) return null;
  const entries = EVOLUTION_FROM.get(mon.dexNum);
  if (!entries) return null;
  let best: { minLevel: number; intoName: string } | null = null;
  for (const evo of entries) {
    if (evo.trigger !== 'level' || evo.minLevel == null) continue;
    if (evo.minLevel <= mon.level) continue;
    const target = SPECIES_BY_DEX.get(evo.toDex);
    if (!target) continue;
    if (!best || evo.minLevel < best.minLevel) best = { minLevel: evo.minLevel, intoName: target.name };
  }
  return best;
}

export interface EvolutionResult {
  canEvolve: true;
  intoDexNum: number;
  intoName: string;
}

/**
 * Check if a Pokemon can evolve via level-up.
 * Returns the evolution target if conditions are met, or null.
 */
export function checkLevelEvolution(mon: OwnedPokemon): EvolutionResult | null {
  if ((mon as any).everstone) return null;

  const entries = EVOLUTION_FROM.get(mon.dexNum);
  if (!entries) return null;

  for (const evo of entries) {
    if (evo.trigger === 'level' && evo.minLevel && mon.level >= evo.minLevel) {
      const target = SPECIES_BY_DEX.get(evo.toDex);
      if (target) {
        return { canEvolve: true, intoDexNum: evo.toDex, intoName: target.name };
      }
    }
  }
  return null;
}

/**
 * Check if a Pokemon can evolve using a specific item.
 */
export function checkItemEvolution(mon: OwnedPokemon, itemId: string): EvolutionResult | null {
  if ((mon as any).everstone) return null;

  const entries = EVOLUTION_FROM.get(mon.dexNum);
  if (!entries) return null;

  for (const evo of entries) {
    if (evo.trigger === 'item' && evo.itemId === itemId) {
      const target = SPECIES_BY_DEX.get(evo.toDex);
      if (target) {
        return { canEvolve: true, intoDexNum: evo.toDex, intoName: target.name };
      }
    }
  }
  return null;
}

/**
 * Apply evolution to a Pokemon, returning the evolved version.
 */
export function applyEvolution(mon: OwnedPokemon, result: EvolutionResult): OwnedPokemon {
  const species = SPECIES_BY_DEX.get(result.intoDexNum);
  if (!species) return mon;

  const newMaxHp = maxHpFor(species.baseHp, mon.level);
  const hpRatio = mon.maxHp > 0 ? mon.currentHp / mon.maxHp : 1;

  return {
    ...mon,
    dexNum: result.intoDexNum,
    name: (mon as any).nickname || species.name,
    types: species.types,
    maxHp: newMaxHp,
    currentHp: Math.max(1, Math.round(newMaxHp * hpRatio)),
  };
}
