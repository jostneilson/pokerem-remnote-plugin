import { describe, expect, it } from 'vitest';
import { MOVES } from '../data/moves';
import { SPECIES_LIST } from '../data/species';
import { attackValue, knownMovePool, optimalMoveset } from '../engine/movesetOptimizer';
import { generateTrainer } from '../engine/trainerBattles';
import { xpThresholdForLevel } from '../engine/progression';
import { chooseStarter, createInitialStateV2, learnMoveAction, setAutoMoves, useLeadUtilityItem } from '../state/store';
import { seededRng } from './simulate';
import type { PokeRemGameState } from '../state/model';

const isStatus = (id: string) => (MOVES[id]?.power ?? 0) <= 0;

describe('optimal movesets', () => {
  it('always keep the hardest-hitting unlocked attack, four distinct moves, at most one status move', () => {
    for (const s of SPECIES_LIST.filter((_, i) => i % 7 === 0)) {
      const mon = { dexNum: s.dexNum, level: 50, types: s.types };
      const set = optimalMoveset(mon);
      const pool = knownMovePool(mon).filter((id) => attackValue(mon, id) > 0);
      expect(new Set(set).size, s.name).toBe(set.length);
      expect(set.length, s.name).toBeLessThanOrEqual(4);
      if (pool.length) {
        expect(set.filter(isStatus).length, s.name).toBeLessThanOrEqual(1);
        const best = pool.reduce((a, b) => (attackValue(mon, b) > attackValue(mon, a) ? b : a));
        expect(set[0], s.name).toBe(best);
      }
    }
  });

  it('favour STAB and spread across types for coverage', () => {
    const charizard = { dexNum: 6, level: 60, types: ['Fire', 'Flying'] as const };
    const set = optimalMoveset({ ...charizard, types: [...charizard.types] });
    expect(set.some((id) => MOVES[id]!.type === 'Fire')).toBe(true);
    const attackTypes = set.filter((id) => !isStatus(id)).map((id) => MOVES[id]!.type);
    expect(new Set(attackTypes).size).toBeGreaterThanOrEqual(Math.min(2, attackTypes.length));
  });

  it('update by themselves when a level-up unlocks something better', () => {
    // Find a species whose next level brings a move that beats everything it had.
    let found = false;
    for (const sp of SPECIES_LIST) {
      for (let lv = 5; lv < 40 && !found; lv++) {
        const before = { dexNum: sp.dexNum, level: lv, types: sp.types };
        const after = { ...before, level: lv + 1 };
        const newMoves = knownMovePool(after).filter((id) => !knownMovePool(before).includes(id));
        const top = optimalMoveset(after)[0]!;
        if (!newMoves.includes(top)) continue;
        let s: PokeRemGameState = chooseStarter(createInitialStateV2(), 4);
        s = {
          ...s,
          party: [{ ...s.party[0]!, dexNum: sp.dexNum, name: sp.name, types: sp.types, level: lv, totalXp: xpThresholdForLevel(lv), moves: optimalMoveset(before) }],
          bag: { ...s.bag, 'rare-candy': 1 },
        };
        const leveled = useLeadUtilityItem(s, 'rare-candy');
        expect(leveled.party[0]!.level).toBe(lv + 1);
        expect(leveled.party[0]!.moves).toContain(top);
        found = true;
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });

  it('hand control to the player after a manual teach, and take it back on request', () => {
    let s = chooseStarter(createInitialStateV2(), 4);
    const id = s.party[0]!.id;
    const pool = knownMovePool(s.party[0]!);
    const extra = pool.find((m) => !s.party[0]!.moves!.includes(m));
    if (extra) {
      s = learnMoveAction(s, id, extra, 0);
      expect(s.party[0]!.autoMoves).toBe(false);
      expect(s.party[0]!.moves).toContain(extra);
    }
    s = setAutoMoves(s, id, true);
    expect(s.party[0]!.autoMoves).toBeUndefined();
    expect(s.party[0]!.moves).toEqual(optimalMoveset(s.party[0]!));
  });

  it('are what trainers bring too', () => {
    const { enemies } = generateTrainer({ tier: 'standard', enabledGens: [1], averageLevel: 30, rng: seededRng(4) });
    for (const e of enemies) expect(e.moves).toEqual(optimalMoveset(e));
  });

  it('are quick enough to run on every party update', () => {
    const t = performance.now();
    for (let i = 0; i < 600; i++) optimalMoveset({ dexNum: (i % 400) + 1, level: 20 + (i % 60) });
    expect(performance.now() - t).toBeLessThan(1500);
  });
});
