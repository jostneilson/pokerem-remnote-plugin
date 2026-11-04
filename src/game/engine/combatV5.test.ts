import { describe, expect, it } from 'vitest';
import { damageCeiling, resolveExchange, type Fighter } from './moveMechanics';
import { battleStats } from './pokemonStats';
import { planAutoAttack } from './autoAttack';
import { createInitialStateV4 } from '../state/store';
import type { EncounterPokemon, OwnedPokemon } from '../state/model';

const fighter = (overrides: Partial<Fighter> = {}): Fighter => ({
  dexNum: 4,
  level: 30,
  types: ['Fire'],
  currentHp: 80,
  maxHp: 80,
  ivs: { hp: 2, attack: 2, defense: 2 },
  name: 'Charmander',
  ...overrides,
});

describe('v5 canonical move mechanics', () => {
  it('persists Growl stages across turns with the same encounter key', () => {
    const player = fighter();
    const wild = fighter({ dexNum: 7, types: ['Water'], name: 'Squirtle' });
    const first = resolveExchange(player, wild, 'growl', 'splash', 'wild:1', () => 0.5);
    expect(first.wild.condition?.stages?.attack).toBe(-1);
    const second = resolveExchange(first.player, first.wild, 'growl', 'splash', 'wild:1', () => 0.5);
    expect(second.wild.condition?.stages?.attack).toBe(-2);
  });

  it('Harden reduces physical damage and Recover heals without exceeding max HP', () => {
    const player = fighter({ currentHp: 30, maxHp: 100 });
    const wild = fighter({ dexNum: 7, types: ['Water'], name: 'Squirtle' });
    const plain = resolveExchange(player, wild, 'splash', 'tackle', 'plain', () => 0.5);
    const hardened = resolveExchange(player, wild, 'harden', 'tackle', 'harden', () => 0.5);
    expect(hardened.player.condition?.stages?.defense).toBe(1);
    expect(hardened.wDamage).toBeLessThan(plain.wDamage);

    const recovered = resolveExchange(
      fighter({ dexNum: 65, types: ['Psychic'], name: 'Alakazam', currentHp: 60, maxHp: 100 }),
      wild,
      'recover',
      'splash',
      'recover',
      () => 0.5,
    );
    expect(recovered.player.currentHp).toBe(100);
  });

  it('IVs affect offense and survival, and physical/special use different base stats', () => {
    const defender = fighter({ dexNum: 143, types: ['Normal'], ivs: { hp: 2, attack: 2, defense: 2 } });
    const lowAttack = fighter({ ivs: { hp: 2, attack: 1, defense: 2 } });
    const highAttack = fighter({ ivs: { hp: 2, attack: 3, defense: 2 } });
    expect(damageCeiling(highAttack, defender, 'scratch', false))
      .toBeGreaterThan(damageCeiling(lowAttack, defender, 'scratch', false));

    const lowDefense = fighter({ dexNum: 143, types: ['Normal'], ivs: { hp: 2, attack: 2, defense: 1 } });
    const highDefense = fighter({ dexNum: 143, types: ['Normal'], ivs: { hp: 2, attack: 2, defense: 3 } });
    expect(damageCeiling(highAttack, highDefense, 'scratch', false))
      .toBeLessThan(damageCeiling(highAttack, lowDefense, 'scratch', false));

    const alakazam = fighter({ dexNum: 65, types: ['Psychic'], name: 'Alakazam' });
    expect(damageCeiling(alakazam, defender, 'swift', false))
      .toBeGreaterThan(damageCeiling(alakazam, defender, 'aerialace', false));
  });

  it('auto attack and committed exchange stop at the critical knockout ceiling', () => {
    const base = createInitialStateV4();
    const leadStats = battleStats({ dexNum: 4, level: 20, ivs: { hp: 2, attack: 2, defense: 2 } });
    const lead: OwnedPokemon = {
      id: 'lead', dexNum: 4, name: 'Charmander', level: 20, totalXp: 0,
      currentHp: leadStats.hp, maxHp: leadStats.hp, types: ['Fire'],
      moves: ['scratch'], ivs: { hp: 2, attack: 2, defense: 2 } as const,
    };
    const wild = fighter({ dexNum: 1, types: ['Grass'], level: 20, name: 'Bulbasaur' });
    const ceiling = damageCeiling(lead, wild, 'scratch', true);
    const encounter: EncounterPokemon = {
      dexNum: wild.dexNum, name: wild.name!, level: wild.level, types: wild.types,
      ivs: wild.ivs, currentHp: ceiling, maxHp: Math.max(wild.maxHp, ceiling),
    };
    const state = { ...base, starterChosen: true, activePokemonId: lead.id, party: [lead], currentEncounter: encounter };
    expect(planAutoAttack(state).moveId).toBeUndefined();
    const result = resolveExchange(lead, encounter, 'scratch', 'splash', 'wild:safe', () => 0, true);
    expect(result.wild.currentHp).toBe(ceiling);
    expect(result.log).toContain('try Catch');
  });
});

describe('buddy accuracy (SPEC L16)', () => {
  it('halves the miss chance of your starter', () => {
    const p = { dexNum: 4, level: 20, types: ['Fire'], currentHp: 80, maxHp: 80, name: 'Charmander' } as Fighter;
    const w = { dexNum: 19, level: 20, types: ['Normal'], currentHp: 80, maxHp: 80, name: 'Rattata' } as Fighter;
    // Hypnosis is 60% accurate: a roll of 0.75 misses normally (miss 40%) but hits for a buddy (miss 20%).
    const roll = () => 0.75;
    const plain = resolveExchange(p, w, 'hypnosis', 'splash', 'k1', roll);
    const buddy = resolveExchange({ ...p, isBuddy: true }, w, 'hypnosis', 'splash', 'k2', roll);
    expect(plain.log).toContain('The attack missed!');
    expect(buddy.log).not.toContain('The attack missed!');
  });
});
