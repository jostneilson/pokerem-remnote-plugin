import { describe, expect, it } from 'vitest';
import { FULL_POKEDEX } from '../data/pokedex';
import { LEARNSETS } from '../data/learnsets';
import { MOVES } from '../data/moves';
import { allowedTypesForLearnset, validateLearnsetAgainstSpecies } from '../data/learnsetRules';
import { validateEveryLearnset } from '../data/learnsetBuilder';
import { getInitialMoves, getUnlockedLearnsetMoveIds, learnsetMilestonesOrdered, movesetForBattle } from './moveLearn';

describe('getUnlockedLearnsetMoveIds', () => {
  it('includes every move used by getInitialMoves at the same level', () => {
    const lv = 30;
    const u = new Set(getUnlockedLearnsetMoveIds(134, lv));
    for (const id of getInitialMoves(134, lv)) {
      expect(u.has(id)).toBe(true);
    }
  });
});

describe('movesetForBattle / getInitialMoves', () => {
  it('Vaporeon exposes water STAB and no duplicate spam slots', () => {
    const m = getInitialMoves(134, 30);
    expect(m.length).toBeLessThanOrEqual(4);
    expect(new Set(m).size).toBe(m.length);
    expect(m.some((id) => id === 'watergun' || id === 'bubblebeam' || id === 'waterpulse')).toBe(true);
    expect(m).not.toContain('batonpass');
  });

  it('Jolteon and Flareon have distinct damaging specials at mid level', () => {
    const j = movesetForBattle({ dexNum: 135, level: 25, moves: undefined });
    const f = movesetForBattle({ dexNum: 136, level: 25, moves: undefined });
    expect(j.some((id) => id === 'spark' || id === 'thundershock')).toBe(true);
    expect(f.some((id) => id === 'ember' || id === 'firefang')).toBe(true);
  });
});

describe('learnset system', () => {
  it('has a non-empty learnset for every pokedex species', () => {
    validateEveryLearnset(LEARNSETS, FULL_POKEDEX);
    for (const s of FULL_POKEDEX) {
      expect(LEARNSETS[s.dexNum]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('only teaches moves matching the species typings or Normal', () => {
    for (const s of FULL_POKEDEX) {
      const allow = allowedTypesForLearnset(s.types);
      for (const e of LEARNSETS[s.dexNum] ?? []) {
        const m = MOVES[e.moveId];
        expect(m, `unknown move ${e.moveId}`).toBeTruthy();
        expect(allow.has(m!.type), `${s.name} (${s.dexNum}): ${e.moveId} is ${m!.type}`).toBe(true);
      }
    }
  });

  it('damaging learn milestones never get weaker (strictly non-decreasing power)', () => {
    for (const s of FULL_POKEDEX) {
      const ms = learnsetMilestonesOrdered(s.dexNum);
      let lastPower = -1;
      for (const { moveId } of ms) {
        const p = MOVES[moveId]?.power ?? 0;
        if (p <= 0) continue;
        expect(
          p >= lastPower,
          `${s.name}: damaging power dropped ${lastPower} -> ${p} at ${moveId}`,
        ).toBe(true);
        lastPower = p;
      }
    }
  });

  it('rejects illegal learnsets at validation time', () => {
    expect(() =>
      validateLearnsetAgainstSpecies(9, ['Water'], [{ level: 1, moveId: 'ember' }]),
    ).toThrow(/illegal move/);
  });
});
