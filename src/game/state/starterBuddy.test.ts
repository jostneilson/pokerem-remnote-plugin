import { describe, expect, it } from 'vitest';
import { applyEvolution, isStarterLine } from '../engine/evolution';
import type { OwnedPokemon } from './model';
import { chooseStarter, createInitialStateV4, parseGameState } from './store';

const roundTrip = (s: unknown) => parseGameState(JSON.parse(JSON.stringify(s)));
const mon = (id: string, dexNum: number) =>
  ({ id, dexNum, name: `#${dexNum}`, level: 20, totalXp: 8000, currentHp: 50, maxHp: 50, types: ['Normal'], moves: ['tackle'] }) as OwnedPokemon;

describe('starter / buddy (SPEC L16, Appendix S)', () => {
  it('starter lines include every evolution', () => {
    expect([1, 2, 3, 6, 9, 157].every(isStarterLine)).toBe(true);
    expect(isStarterLine(25)).toBe(false);
  });

  it('choosing a starter records it, and evolving keeps it', () => {
    const s = chooseStarter(createInitialStateV4(), 4);
    expect(s.starterId).toBe(s.party[0]!.id);
    const evolved = applyEvolution(s.party[0]!, { canEvolve: true, intoDexNum: 5, intoName: 'Charmeleon' });
    expect(roundTrip({ ...s, party: [evolved] }).starterId).toBe(s.party[0]!.id);
  });

  it('an older save gets the earliest-caught starter-line Pokémon', () => {
    const base = { ...createInitialStateV4(), starterChosen: true };
    const save = {
      ...base,
      party: [mon('pk_2000_b', 25), mon('pk_3000_c', 5)],
      storagePokemon: [mon('pk_1000_a', 158), mon('pk_500_z', 19)]
    } as Record<string, unknown>;
    delete save.starterId;
    expect(roundTrip(save).starterId).toBe('pk_1000_a');
  });

  it('re-picks when the saved starter is gone, and is empty with no starter line owned', () => {
    const base = { ...createInitialStateV4(), starterChosen: true };
    const s = roundTrip({ ...base, party: [mon('pk_10_a', 7), mon('pk_20_b', 26)], starterId: 'pk_gone' });
    expect(s.starterId).toBe('pk_10_a');
    expect(roundTrip({ ...base, party: [mon('pk_20_b', 26)] }).starterId).toBeUndefined();
  });
});
