import { describe, expect, it } from 'vitest';
import { buyItem, chooseStarter, createInitialStateV2, parseGameState } from '../state/store';
import { encounterBaseLevel, minWildLevel, pickEverydaySpecies, isEventSpecies } from '../engine/speciesPool';
import { catchTypeBonus, CATCH_TYPE_ADVANTAGE_BONUS } from '../engine/encounters';
import { shopPrice } from '../engine/shop';
import { STARTER_LEVEL } from '../constants';
import { seededRng, simulate } from './simulate';
import type { OwnedPokemon } from '../state/model';

const mon = (level: number): OwnedPokemon =>
  ({ id: `m${level}-${Math.random()}`, dexNum: 16, name: 'Pidgey', level, totalXp: 0, currentHp: 10, maxHp: 10, types: ['Normal', 'Flying'] }) as OwnedPokemon;

describe('species pool', () => {
  it('gates evolved species behind their evolution level', () => {
    expect(minWildLevel(4)).toBe(1); // Charmander
    expect(minWildLevel(5)).toBe(16); // Charmeleon
    expect(minWildLevel(6)).toBe(36); // Charizard
    expect(minWildLevel(26)).toBeGreaterThanOrEqual(20); // Raichu (stone)
  });

  it('never picks an evolved or event species below its level', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 2000; i++) {
      const level = 1 + Math.floor(rng() * 30);
      const dex = pickEverydaySpecies({ level, enabledGens: [1, 2, 3], rng });
      expect(minWildLevel(dex)).toBeLessThanOrEqual(level);
      expect(isEventSpecies(dex)).toBe(false);
    }
  });

  it('scales from the whole party average (1.6.0)', () => {
    expect(encounterBaseLevel([])).toBe(5);
    expect(encounterBaseLevel([mon(30), mon(30), mon(30), mon(2), mon(2), mon(2)])).toBe(16);
    expect(encounterBaseLevel([mon(10), mon(20)])).toBe(15);
  });
});

describe('foundation fixes', () => {
  it('starts the starter at Lv5 with IVs and registers it in the Pokédex', () => {
    const s = chooseStarter(createInitialStateV2(), 4);
    expect(s.party[0]!.level).toBe(STARTER_LEVEL);
    expect(s.party[0]!.ivs).toBeDefined();
    expect(s.collectionDex[4]).toBe(1);
  });

  it('backfills the Pokédex from owned Pokémon on load', () => {
    const s = chooseStarter(createInitialStateV2(), 4);
    const raw = JSON.parse(JSON.stringify({ ...s, collectionDex: {}, storagePokemon: [{ ...s.party[0]!, id: 'x', dexNum: 6 }] }));
    const loaded = parseGameState(raw);
    expect(loaded.collectionDex[4]).toBe(1);
    expect(loaded.collectionDex[6]).toBe(1);
  });

  it('charges the shop price, not whatever the caller passes', () => {
    const s = { ...chooseStarter(createInitialStateV2(), 4), currency: 10_000 };
    const bought = buyItem(s, 'revive', 5);
    expect(bought.bag.revive).toBe((s.bag.revive ?? 0) + 5);
    expect(bought.currency).toBe(10_000 - shopPrice('revive')! * 5);
    expect(buyItem(s, 'master-ball')).toBe(s);
  });

  it('uses one type-advantage catch bonus everywhere', () => {
    expect(catchTypeBonus({ types: ['Water'] }, ['Fire'])).toBe(CATCH_TYPE_ADVANTAGE_BONUS);
    expect(catchTypeBonus({ types: ['Normal'] }, ['Fire'])).toBe(0);
  });
});

describe('simulation harness', () => {
  it('is deterministic for a seed', () => {
    const a = simulate({ cards: 120, seed: 42 });
    const b = simulate({ cards: 120, seed: 42 });
    expect(a.events).toEqual(b.events);
    expect(a.state.cardsReviewed).toBe(120);
    expect(a.events.some((e) => e.kind === 'spawn')).toBe(true);
  });
});
