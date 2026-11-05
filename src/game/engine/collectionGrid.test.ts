import { describe, expect, it } from 'vitest';
import type { OwnedPokemon } from '../state/model';
import { allOwned, queryGrid, selectDuplicatesKeepBest } from './collectionGrid';

const mon = (id: string, dexNum: number, level: number, extra: Partial<OwnedPokemon> = {}): OwnedPokemon => ({
  id,
  dexNum,
  name: `Mon${dexNum}`,
  level,
  totalXp: 0,
  currentHp: 10,
  maxHp: 10,
  types: dexNum === 4 ? ['Fire'] : ['Normal'],
  ivs: { hp: 1, attack: 1, defense: 1 },
  ...extra
});

describe('collection grid', () => {
  const party = [mon('pk_1_a', 4, 20), mon('pk_5_b', 19, 8)];
  const storage = [
    mon('pk_2_c', 19, 12, { ivs: { hp: 3, attack: 2, defense: 2 } }),
    mon('pk_3_d', 19, 15),
    mon('pk_4_e', 19, 3, { shiny: true }),
    mon('pk_6_f', 4, 5, { favorite: true })
  ];
  const all = allOwned(party, storage);

  it('sorts by level high first by default, and by caught order when asked', () => {
    expect(queryGrid(all, {}).map((e) => e.mon.id)[0]).toBe('pk_1_a');
    expect(queryGrid(all, { sort: 'caught', ascending: true }).map((e) => e.mon.id)).toEqual([
      'pk_1_a',
      'pk_2_c',
      'pk_3_d',
      'pk_4_e',
      'pk_5_b',
      'pk_6_f'
    ]);
  });

  it('filters by type, flags, place and search', () => {
    expect(queryGrid(all, { type: 'Fire' })).toHaveLength(2);
    expect(queryGrid(all, { flags: ['shiny'] }).map((e) => e.mon.id)).toEqual(['pk_4_e']);
    expect(queryGrid(all, { flags: ['party'] })).toHaveLength(2);
    expect(queryGrid(all, { flags: ['storage', 'favorite'] }).map((e) => e.mon.id)).toEqual(['pk_6_f']);
    expect(queryGrid(all, { search: 'mon19' })).toHaveLength(4);
    expect(queryGrid([all[0]!, all[1]!], { flags: ['duplicates'] })).toHaveLength(0);
  });

  it('keep best keeps the top IV of each species and never picks shiny, favourite, starter or lead', () => {
    // Species 19: pk_2_c has the best IVs, pk_4_e is shiny, pk_5_b is in the party → only pk_3_d goes.
    expect(selectDuplicatesKeepBest(all, { activeId: 'pk_1_a' })).toEqual(['pk_3_d']);
    const allStored = allOwned([], [...party, ...storage]);
    expect(selectDuplicatesKeepBest(allStored).sort()).toEqual(['pk_3_d', 'pk_5_b']);
    expect(selectDuplicatesKeepBest(allStored, { starterId: 'pk_5_b' })).toEqual(['pk_3_d']);
  });
});
