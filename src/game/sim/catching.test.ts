import { describe, expect, it, vi } from 'vitest';
import {
  catchStatusMultiplier,
  isGuaranteedCatch,
  recommendedBall,
  wildCatchChancePreview,
} from '../engine/encounters';
import { applyCombatTurn, catchEncounter, chooseStarter, createInitialStateV2 } from '../state/store';
import { planAutoAttack } from '../engine/autoAttack';
import { SPECIES_BY_DEX } from '../data/species';
import type { EncounterPokemon, PokeRemGameState } from '../state/model';

function wild(dexNum: number, level: number, extra: Partial<EncounterPokemon> = {}): EncounterPokemon {
  const s = SPECIES_BY_DEX.get(dexNum)!;
  return { dexNum, name: s.name, level, maxHp: 60, currentHp: 60, types: s.types, ivs: { hp: 2, attack: 2, defense: 2 }, ...extra };
}

function battling(enc: EncounterPokemon, bag: Partial<PokeRemGameState['bag']> = {}): PokeRemGameState {
  const s = chooseStarter(createInitialStateV2(), 4);
  return { ...s, currentEncounter: enc, bag: { ...s.bag, 'poke-ball': 5, 'great-ball': 5, 'ultra-ball': 5, ...bag } };
}

describe('catch odds', () => {
  it('rewards status conditions like the main series', () => {
    expect(catchStatusMultiplier({ ailment: 'sleep' })).toBe(2);
    expect(catchStatusMultiplier({ ailment: 'paralysis' })).toBe(1.5);
    expect(catchStatusMultiplier(undefined)).toBe(1);
    const lead = battling(wild(16, 5)).party[0];
    const awake = wildCatchChancePreview(wild(147, 20, { currentHp: 30 }), lead, 'poke-ball');
    const asleep = wildCatchChancePreview(wild(147, 20, { currentHp: 30, condition: { ailment: 'sleep' } }), lead, 'poke-ball');
    expect(asleep).toBeCloseTo(Math.min(0.92, awake * 2), 5);
  });

  it('one-tap Catch saves good balls for hard catches', () => {
    const s = battling(wild(16, 5));
    expect(recommendedBall(s.bag, s.currentEncounter!, s.party[0])).toBe('poke-ball');
    const hard = wild(147, 30, { currentHp: 60 });
    expect(recommendedBall(s.bag, hard, s.party[0])).toBe('ultra-ball');
    expect(recommendedBall({ ...s.bag, 'ultra-ball': 0 }, hard, s.party[0])).toBe('great-ball');
  });
});

describe('shiny legendaries', () => {
  const mewtwo = wild(150, 70, { shiny: true });

  it('are always caught by the first Poké Ball at full HP', () => {
    expect(isGuaranteedCatch(mewtwo)).toBe(true);
    expect(isGuaranteedCatch({ ...mewtwo, shiny: false })).toBe(false);
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    try {
      const after = catchEncounter(battling(mewtwo), 'poke-ball');
      expect(after.currentEncounter).toBeNull();
      expect([...after.party, ...after.storagePokemon].some((p) => p.dexNum === 150 && p.shiny)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('can never be knocked out, and stay when your lead faints', () => {
    let s = battling({ ...mewtwo, level: 5, maxHp: 4, currentHp: 4 });
    s = { ...s, party: s.party.map((p) => ({ ...p, level: 60 })) };
    for (let i = 0; i < 10; i++) s = applyCombatTurn(s);
    expect(s.currentEncounter?.dexNum).toBe(150);
    expect(s.currentEncounter!.currentHp).toBeGreaterThan(0);

    let weak = battling(mewtwo);
    weak = { ...weak, party: weak.party.map((p) => ({ ...p, currentHp: 1 })) };
    weak = applyCombatTurn(weak);
    expect(weak.currentEncounter?.dexNum).toBe(150);
  });
});

describe('auto attack', () => {
  it('keeps going through sleep and paralysis', () => {
    const s = battling(wild(16, 5, { maxHp: 200, currentHp: 200, condition: { ailment: 'sleep' } }));
    expect(planAutoAttack(s).moveId).toBeDefined();
  });
});
