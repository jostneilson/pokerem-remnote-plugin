import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { transferCoins, transferPreview, transferTier, transferXpBase } from '../engine/transfer';
import type { OwnedPokemon, PokeRemGameState } from './model';
import { chooseStarter, createInitialStateV4, parseGameState, transferPokemon } from './store';

const mon = (id: string, dexNum: number, level: number, extra: Partial<OwnedPokemon> = {}) =>
  ({
    id,
    dexNum,
    name: `#${dexNum}`,
    level,
    totalXp: 1000,
    currentHp: 40,
    maxHp: 40,
    types: ['Normal'],
    moves: ['tackle'],
    ivs: { hp: 1, attack: 1, defense: 1 },
    ...extra
  }) as OwnedPokemon;

function world(): PokeRemGameState {
  const s = chooseStarter(createInitialStateV4(), 4);
  const starter = s.party[0]!;
  return {
    ...s,
    currency: 0,
    totalCurrencyEarned: 0,
    party: [starter, mon('pk_2_rat', 19, 20, { types: ['Normal'] })],
    storagePokemon: [
      mon('pk_3_rat2', 19, 10, { types: ['Normal'] }),
      mon('pk_4_pidgey', 16, 12, { types: ['Normal', 'Flying'] }),
      mon('pk_5_oddish', 43, 12, { types: ['Grass', 'Poison'] })
    ]
  };
}

describe('transfer payout (SPEC A5)', () => {
  it('pays by tier and level, ×3 shiny, ×2 HUNDO', () => {
    expect(transferTier(19)).toBe('Common');
    expect(transferTier(147)).toBe('Rare'); // Dratini, catch rate 45
    expect(transferTier(150)).toBe('Legendary');
    expect(transferCoins(mon('a', 147, 25))).toBe(Math.round(150 * 2));
    expect(transferCoins(mon('a', 150, 25))).toBe(3000);
    expect(transferCoins(mon('a', 150, 25, { shiny: true }))).toBe(9000);
    expect(transferCoins(mon('a', 150, 25, { ivs: { hp: 3, attack: 3, defense: 3 } }))).toBe(6000);
  });

  it('a plain Common is always worth less than a Poké Ball', () => {
    for (let lv = 1; lv <= 100; lv++) expect(transferCoins(mon('a', 19, lv))).toBeLessThan(100);
  });
});

describe('transferPokemon', () => {
  it('removes them, pays coins, and gives same-type Pokémon XP (storage half)', () => {
    const s = world();
    const after = transferPokemon(s, ['pk_3_rat2']);
    expect(after.storagePokemon.some((p) => p.id === 'pk_3_rat2')).toBe(false);
    expect(after.currency).toBe(transferCoins(mon('x', 19, 10)));
    expect(after.collectionDex[19]).toBeGreaterThan(0); // the Pokédex keeps the entry
    const base = transferXpBase({ level: 10 });
    const gain = (id: string) =>
      [...after.party, ...after.storagePokemon].find((p) => p.id === id)!.totalXp - [...s.party, ...s.storagePokemon].find((p) => p.id === id)!.totalXp;
    expect(gain('pk_2_rat')).toBe(base); // party, shares Normal
    expect(gain('pk_4_pidgey')).toBe(base * BALANCE.transfer.storageXpShare); // storage, shares Normal
    expect(gain('pk_5_oddish')).toBe(0);
    expect(after.totalTransferred).toBe(1);
  });

  it('refuses favourites, the last party member and Pokémon in a trainer fight', () => {
    const s = world();
    const fav = { ...s, storagePokemon: s.storagePokemon.map((p) => (p.id === 'pk_3_rat2' ? { ...p, favorite: true } : p)) };
    expect(transferPokemon(fav, ['pk_3_rat2', 'pk_4_pidgey'])).toBe(fav);
    expect(transferPokemon(s, s.party.map((p) => p.id))).toBe(s);
    expect(transferPreview(s, s.party.map((p) => p.id)).blocked).toBe('last-party');
  });

  it('warns about shiny, HUNDO, legendary and starter, and transferring the starter ends the buddy', () => {
    const s = world();
    const shinyLeg = { ...s, storagePokemon: [...s.storagePokemon, mon('pk_9_mew', 151, 30, { shiny: true, ivs: { hp: 3, attack: 3, defense: 3 } })] };
    expect(transferPreview(shinyLeg, ['pk_9_mew']).warnings.sort()).toEqual(['hundo', 'legendary', 'shiny']);
    expect(transferPreview(s, [s.starterId!]).warnings).toContain('starter');
    const after = transferPokemon(s, [s.starterId!]);
    expect(after.starterId).toBe('');
    expect(after.activePokemonId).toBe('pk_2_rat');
    // The backfill must not hand the buddy bonus to another starter-line Pokémon.
    const withAnotherStarter = { ...after, storagePokemon: [...after.storagePokemon, mon('pk_10_bulba', 1, 5)] };
    expect(parseGameState(JSON.parse(JSON.stringify(withAnotherStarter))).starterId).toBe('');
  });
});
