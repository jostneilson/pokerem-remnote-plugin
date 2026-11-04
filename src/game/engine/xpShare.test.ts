import { describe, expect, it } from 'vitest';
import type { OwnedPokemon, PokeRemGameState } from '../state/model';
import { createInitialStateV4 } from '../state/store';
import {
  BUDDY_XP_MULT,
  CATCH_UP_MAX_MULT,
  catchUpMult,
  memberXpMult,
  scaledXp,
  splitKnockoutXp
} from './xpShare';

const mon = (id: string, level: number, currentHp = 20) =>
  ({ id, level, currentHp, maxHp: 20, totalXp: 0, dexNum: 1, name: id, types: ['Grass'], moves: [] }) as unknown as OwnedPokemon;

describe('XP Share (SPEC L17)', () => {
  it('knockout XP: lead 60%, the rest split evenly over the bench that can battle', () => {
    const party = [mon('a', 10), mon('b', 10), mon('c', 10), mon('d', 10, 0)];
    const split = splitKnockoutXp(100, party, 'a');
    expect(split.get('a')).toBeCloseTo(60);
    expect(split.get('b')).toBeCloseTo(20);
    expect(split.get('c')).toBeCloseTo(20);
    expect(split.has('d')).toBe(false);
    expect(splitKnockoutXp(100, [mon('a', 10)], 'a').get('a')).toBe(100);
  });

  it('catch-up: ×(1 + 0.12·gap) to the others’ average, capped at ×2', () => {
    const party = [mon('a', 20), mon('b', 20), mon('c', 15)];
    expect(catchUpMult(party[2]!, party)).toBeCloseTo(1.6);
    expect(catchUpMult(party[0]!, party)).toBe(1);
    expect(catchUpMult(mon('z', 1), [mon('z', 1), mon('y', 50)])).toBe(CATCH_UP_MAX_MULT);
    expect(catchUpMult(mon('s', 1), party)).toBe(1); // not in the party
  });

  it('buddy earns ×1.15 and scaledXp rounds fractions fairly', () => {
    const party = [mon('a', 10)];
    const s = { ...createInitialStateV4(), party, starterId: 'a' } as PokeRemGameState;
    expect(memberXpMult(s, party[0]!)).toBeCloseTo(BUDDY_XP_MULT);
    let total = 0;
    for (let i = 0; i < 1000; i++) total += scaledXp({ ...s, starterId: undefined }, party[0]!, 1.6, () => ((i % 10) + 0.5) / 10);
    expect(total).toBe(1600);
  });
});
