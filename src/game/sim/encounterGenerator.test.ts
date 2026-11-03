import { describe, expect, it } from 'vitest';
import { spawnEncounter, EVENT_MIN_PARTY_LEVEL, EVENT_MIN_REVIEWS } from '../engine/encounters';
import { isEventSpecies, isStarterSpecies, minWildLevel, SCENE_BIOME_TYPES } from '../engine/speciesPool';
import { SPECIES_BY_DEX } from '../data/species';
import { seededRng } from './simulate';
import type { OwnedPokemon } from '../state/model';

const party = (level: number): OwnedPokemon[] =>
  [1, 2, 3].map((i) => ({ id: `p${i}`, dexNum: 4, name: 'Charmander', level, totalXp: 0, currentHp: 10, maxHp: 10, types: ['Fire'] }) as OwnedPokemon);

function roll(n: number, level: number, reviews: number, extra: { sceneIndex?: number; collectionDex?: Record<number, number> } = {}) {
  const rng = seededRng(level * 1000 + reviews + (extra.sceneIndex ?? 0));
  return Array.from({ length: n }, () => spawnEncounter(party(level), reviews, [1, 2, 3, 4], 0, { rng, ...extra }));
}

describe('wild encounter generator', () => {
  it('stays near the party level and never below a species evolution level', () => {
    for (const enc of roll(3000, 18, 5000)) {
      expect(Math.abs(enc.level - 18)).toBeLessThanOrEqual(5);
      expect(minWildLevel(enc.dexNum)).toBeLessThanOrEqual(enc.level);
    }
  });

  it('keeps legendaries out until the player is established, then makes them rare events', () => {
    expect(roll(3000, EVENT_MIN_PARTY_LEVEL - 1, 9999).some((e) => isEventSpecies(e.dexNum))).toBe(false);
    expect(roll(3000, 40, EVENT_MIN_REVIEWS - 1).some((e) => isEventSpecies(e.dexNum))).toBe(false);
    const events = roll(10_000, 40, 5000).filter((e) => isEventSpecies(e.dexNum)).length / 10_000;
    expect(events).toBeGreaterThan(0.005);
    expect(events).toBeLessThan(0.025);
  });

  it('makes other starters obtainable but uncommon', () => {
    const share = roll(10_000, 10, 1000).filter((e) => isStarterSpecies(e.dexNum)).length / 10_000;
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(0.03);
  });

  it('favours the scene types', () => {
    const scene = 11; // Water Surface
    const types = new Set(SCENE_BIOME_TYPES[scene]);
    const fits = (e: { dexNum: number }) => SPECIES_BY_DEX.get(e.dexNum)!.types.some((t) => types.has(t));
    const inScene = roll(4000, 20, 1000, { sceneIndex: scene }).filter(fits).length;
    const elsewhere = roll(4000, 20, 1000, { sceneIndex: 6 }).filter(fits).length;
    expect(inScene).toBeGreaterThan(elsewhere * 1.5);
  });

  it('prefers uncaught species without excluding caught ones', () => {
    const collectionDex: Record<number, number> = {};
    for (const enc of roll(4000, 20, 1000)) collectionDex[enc.dexNum] = 1;
    const caught = roll(4000, 20, 1000, { collectionDex }).filter((e) => (collectionDex[e.dexNum] ?? 0) > 0).length / 4000;
    expect(caught).toBeGreaterThan(0.1);
    expect(caught).toBeLessThan(0.6);
  });
});
