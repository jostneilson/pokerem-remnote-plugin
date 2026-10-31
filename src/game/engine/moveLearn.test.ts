import { describe, expect, it } from 'vitest';
import { FULL_POKEDEX, POKEDEX_BY_DEX } from '../data/pokedex';
import { LEARNSETS, LEARNSET_SOURCE_VERSION_GROUP } from '../data/learnsets';
import { MOVES } from '../data/moves';
import { validateLearnsetAgainstSpecies } from '../data/learnsetRules';
import { validateEveryLearnset } from '../data/learnsetBuilder';
import {
  getInitialMoves,
  getUnlockedLearnsetMoveIds,
  learnsetMilestonesOrdered,
  movesetForBattle,
} from './moveLearn';

describe('canonical level-up data', () => {
  it('uses Scarlet/Violet where available and retains canonical levels', () => {
    expect(LEARNSET_SOURCE_VERSION_GROUP[4]).toBe('scarlet-violet');
    expect(LEARNSET_SOURCE_VERSION_GROUP[25]).toBe('scarlet-violet');
    expect(LEARNSETS[4]).toContainEqual({ level: 4, moveId: 'ember' });
    expect(LEARNSETS[25]).toContainEqual({ level: 36, moveId: 'thunderbolt' });
  });

  it('keeps level-zero evolution moves available for recall', () => {
    expect(LEARNSETS[134]).toContainEqual({ level: 0, moveId: 'watergun' });
    expect(getUnlockedLearnsetMoveIds(134, 1)).toContain('watergun');
  });

  it('includes legitimate off-type coverage moves', () => {
    const gyarados = POKEDEX_BY_DEX.get(130)!;
    expect(gyarados.types).toEqual(['Water', 'Flying']);
    expect(LEARNSETS[130]).toContainEqual({ level: 24, moveId: 'crunch' });
    expect(MOVES.crunch.type).toBe('Dark');
  });

  it('imports battle metadata needed by shared combat mechanics', () => {
    expect(MOVES.ember).toMatchObject({
      category: 'special', power: 40, accuracy: 100, ailment: 'burn', ailmentChance: 10,
    });
    expect(MOVES.crunch.statChanges).toEqual([{ stat: 'defense', change: -1 }]);
    expect(MOVES.recover.healing).toBe(50);
  });
});

describe('move selection compatibility', () => {
  it('initial moves are unlocked, unique, and capped at four', () => {
    const level = 30;
    const unlocked = new Set(getUnlockedLearnsetMoveIds(134, level));
    const initial = getInitialMoves(134, level);
    expect(initial.length).toBeLessThanOrEqual(4);
    expect(new Set(initial).size).toBe(initial.length);
    for (const id of initial) expect(unlocked.has(id)).toBe(true);
  });

  it('uses an explicitly equipped four-move set unchanged', () => {
    expect(movesetForBattle({
      dexNum: 130,
      level: 30,
      moves: ['waterfall', 'crunch', 'icefang', 'dragondance'],
    })).toEqual(['waterfall', 'crunch', 'icefang', 'dragondance']);
  });
});

describe('learnset validation', () => {
  it('has a valid non-empty learnset for every supported species', () => {
    expect(() => validateEveryLearnset(LEARNSETS, FULL_POKEDEX)).not.toThrow();
    for (const species of FULL_POKEDEX) {
      expect(LEARNSETS[species.dexNum]?.length ?? 0, species.name).toBeGreaterThan(0);
      expect(LEARNSET_SOURCE_VERSION_GROUP[species.dexNum], species.name).toBeTruthy();
    }
  });

  it('keeps milestone ordering canonical instead of forcing power monotonicity', () => {
    const milestones = learnsetMilestonesOrdered(4);
    expect(milestones.find((entry) => entry.moveId === 'ember')?.level).toBe(4);
    expect(milestones.find((entry) => entry.moveId === 'smokescreen')?.level).toBe(8);
  });

  it('rejects unknown, duplicate, and out-of-range entries but permits coverage', () => {
    expect(() => validateLearnsetAgainstSpecies(130, ['Water', 'Flying'], [
      { level: 24, moveId: 'crunch' },
    ])).not.toThrow();
    expect(() => validateLearnsetAgainstSpecies(9, ['Water'], [
      { level: 1, moveId: 'notarealmove' },
    ])).toThrow(/unknown move/);
    expect(() => validateLearnsetAgainstSpecies(9, ['Water'], [
      { level: 1, moveId: 'tackle' }, { level: 2, moveId: 'tackle' },
    ])).toThrow(/duplicate move/);
    expect(() => validateLearnsetAgainstSpecies(9, ['Water'], [
      { level: 101, moveId: 'tackle' },
    ])).toThrow(/out of range/);
  });
});
