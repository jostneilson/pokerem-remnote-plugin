import { describe, expect, it, vi } from 'vitest';
import { STARTER_DEX_ALL } from '../data/pokedex';
import { SPECIES_LIST } from '../data/species';
import {
  averagePartyLevel,
  computeCatchChance,
  isWildDexGenerationComplete,
  SHINY_ODDS_POST_DEX_COMPLETE,
  SHINY_ODDS_PRE_DEX_COMPLETE,
  spawnEncounter,
  tryCatch,
  wildEncounterSpeciesDexSet,
} from './encounters';
import type { OwnedPokemon } from '../state/model';

function mon(level: number): OwnedPokemon {
  return {
    id: 'x',
    dexNum: 1,
    name: 'A',
    level,
    totalXp: 0,
    currentHp: 10,
    maxHp: 10,
    types: ['Normal'],
  };
}

describe('computeCatchChance', () => {
  it('matches tryCatch roll threshold', () => {
    const c = computeCatchChance(0.2, 255, 1);
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValueOnce(c - 0.001);
    expect(tryCatch(0.2, 255, 1)).toBe(true);
    spy.mockReturnValueOnce(c + 0.001);
    expect(tryCatch(0.2, 255, 1)).toBe(false);
    spy.mockRestore();
  });
});

describe('averagePartyLevel', () => {
  it('returns 1 for empty party', () => {
    expect(averagePartyLevel([])).toBe(1);
  });

  it('rounds mean and clamps to 1', () => {
    expect(averagePartyLevel([mon(1), mon(2), mon(3)])).toBe(2);
    expect(averagePartyLevel([mon(1), mon(1)])).toBe(1);
  });

  it('caps at 100', () => {
    expect(averagePartyLevel([mon(100), mon(100)])).toBe(100);
  });
});

describe('wild dex completion + encounter pool', () => {
  const enabledGens = [1] as const;

  it('isWildDexGenerationComplete is false when any roster species is uncaught', () => {
    const universe = wildEncounterSpeciesDexSet([...enabledGens]);
    expect(universe.size).toBeGreaterThan(2);
    const collection: Record<number, number> = {};
    for (const d of universe) collection[d] = 1;
    const one = [...universe][0]!;
    delete collection[one];
    expect(isWildDexGenerationComplete(collection, [...enabledGens])).toBe(false);
  });

  it('isWildDexGenerationComplete is true when every roster species is caught', () => {
    const universe = wildEncounterSpeciesDexSet([...enabledGens]);
    const collection: Record<number, number> = {};
    for (const d of universe) collection[d] = 1;
    expect(isWildDexGenerationComplete(collection, [...enabledGens])).toBe(true);
  });

  it('before completion, spawn only picks uncaught Common gen1 species when that is the only uncaught in pool', () => {
    const starterSet = new Set(STARTER_DEX_ALL as readonly number[]);
    const wildCommonG1 = SPECIES_LIST.filter(
      (s) => s.tier === 'Common' && s.generation === 1 && !starterSet.has(s.dexNum),
    );
    expect(wildCommonG1.length).toBeGreaterThan(0);
    const target = wildCommonG1[0]!;
    const collection: Record<number, number> = {};
    const universe = wildEncounterSpeciesDexSet([1]);
    for (const d of universe) collection[d] = 1;
    collection[target.dexNum] = 0;

    let i = 0;
    const seq = [0, 0, 0, 0.999];
    const rng = () => {
      const v = seq[Math.min(i, seq.length - 1)]!;
      i += 1;
      return v;
    };

    const enc = spawnEncounter([mon(5)], 0, [1], 0, { collectionDex: collection, rng });
    expect(enc.dexNum).toBe(target.dexNum);
  });

  it('after completion, shiny uses 1/200 (post-complete odds)', () => {
    const universe = wildEncounterSpeciesDexSet([1]);
    const collection: Record<number, number> = {};
    for (const d of universe) collection[d] = 1;
    expect(SHINY_ODDS_POST_DEX_COMPLETE).toBe(1 / 200);
    expect(SHINY_ODDS_PRE_DEX_COMPLETE).toBe(1 / 1000);

    let i = 0;
    const seq = [0, 0, 0, 0.001];
    const rng = () => {
      const v = seq[Math.min(i, seq.length - 1)]!;
      i += 1;
      return v;
    };
    const enc = spawnEncounter([mon(5)], 0, [1], 0, { collectionDex: collection, rng });
    expect(enc.shiny).toBe(true);
  });

  it('before completion, shiny uses 1/1000 baseline', () => {
    const universe = wildEncounterSpeciesDexSet([1]);
    const collection: Record<number, number> = {};
    for (const d of universe) collection[d] = 1;
    const one = [...universe][0]!;
    collection[one] = 0;

    let i = 0;
    const seq = [0, 0, 0, 0.0005];
    const rng = () => {
      const v = seq[Math.min(i, seq.length - 1)]!;
      i += 1;
      return v;
    };
    const enc = spawnEncounter([mon(5)], 0, [1], 0, { collectionDex: collection, rng });
    expect(enc.shiny).toBe(true);
  });

  it('before completion, shiny roll above 1/1000 is not shiny', () => {
    const universe = wildEncounterSpeciesDexSet([1]);
    const collection: Record<number, number> = {};
    for (const d of universe) collection[d] = 1;
    const one = [...universe][0]!;
    collection[one] = 0;

    let i = 0;
    const seq = [0, 0, 0, 0.002];
    const rng = () => {
      const v = seq[Math.min(i, seq.length - 1)]!;
      i += 1;
      return v;
    };
    const enc = spawnEncounter([mon(5)], 0, [1], 0, { collectionDex: collection, rng });
    expect(enc.shiny).toBe(false);
  });
});
