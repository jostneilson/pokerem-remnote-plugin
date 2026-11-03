import { describe, expect, it } from 'vitest';
import { ITEM_BY_ID, healAmountFor } from '../data/items';
import { getShopInventory, REVIVE_SHOP_PRICE } from '../engine/shop';
import { battleStats, isPerfectIVs } from '../engine/pokemonStats';
import { bestHealItemFor, chooseStarter, createInitialStateV2, pokemonCenterCost, quickHealPokemon, useBottleCap, useHealingItem, useLeadUtilityItem } from '../state/store';
import { simulate } from './simulate';
import type { OwnedPokemon, PokeRemGameState } from '../state/model';

const base = (): PokeRemGameState => chooseStarter(createInitialStateV2(), 4);
const withMon = (s: PokeRemGameState, patch: Partial<OwnedPokemon>): PokeRemGameState => ({ ...s, party: s.party.map((p) => ({ ...p, ...patch })) });

describe('healing scales with your Pokémon', () => {
  it('potions heal a share of max HP, never less than before', () => {
    const potion = ITEM_BY_ID.get('potion')!;
    expect(healAmountFor(potion, 40)).toBe(20);
    expect(healAmountFor(potion, 200)).toBe(50);
    expect(healAmountFor(ITEM_BY_ID.get('super-potion')!, 200)).toBe(100);
    expect(healAmountFor(ITEM_BY_ID.get('max-potion')!, 321)).toBe(321);
  });

  it('can heal any party member, not just the lead', () => {
    let s = base();
    const bench: OwnedPokemon = { ...s.party[0]!, id: 'bench', currentHp: 1 };
    s = { ...s, party: [...s.party, bench] };
    const healed = useHealingItem(s, 'potion', 'bench');
    expect(healed.party.find((p) => p.id === 'bench')!.currentHp).toBeGreaterThan(1);
    expect(healed.bag.potion).toBe(s.bag.potion - 1);
  });

  it('one-tap Heal picks the smallest potion that tops up, or a Revive when fainted', () => {
    let s = base();
    const lead = s.party[0]!;
    const bench: OwnedPokemon = { ...lead, id: 'bench', maxHp: 100, currentHp: 80 };
    const down: OwnedPokemon = { ...lead, id: 'down', maxHp: 100, currentHp: 0 };
    s = { ...s, party: [lead, bench, down], bag: { ...s.bag, 'oran-berry': 0, potion: 2, 'super-potion': 1, revive: 1 } };
    expect(bestHealItemFor(s.bag, bench)).toBe('potion');
    expect(bestHealItemFor(s.bag, down)).toBe('revive');
    const healed = quickHealPokemon(quickHealPokemon(s, 'bench'), 'down');
    expect(healed.party.find((p) => p.id === 'bench')!.currentHp).toBe(100);
    expect(healed.party.find((p) => p.id === 'down')!.currentHp).toBe(50);
    expect(healed.bag.revive).toBe(0);
  });

  it('Rare Candy can go to a bench Pokémon', () => {
    let s = base();
    const bench: OwnedPokemon = { ...s.party[0]!, id: 'bench' };
    s = { ...s, party: [...s.party, bench], bag: { ...s.bag, 'rare-candy': 1 } };
    const after = useLeadUtilityItem(s, 'rare-candy', 'bench');
    expect(after.party.find((p) => p.id === 'bench')!.level).toBe(bench.level + 1);
    expect(after.party[0]!.level).toBe(s.party[0]!.level);
  });

  it('charges the Pokémon Center more at higher levels', () => {
    const low = withMon(base(), { level: 5, maxHp: 100, currentHp: 50 });
    const high = withMon(base(), { level: 50, maxHp: 100, currentHp: 50 });
    expect(pokemonCenterCost(high)).toBeGreaterThan(pokemonCenterCost(low) * 3);
    expect(pokemonCenterCost(withMon(base(), { level: 30, currentHp: 0 }))).toBeGreaterThanOrEqual(600);
  });

  it('sells Revive at one price everywhere', () => {
    expect(getShopInventory(1).find((i) => i.item.id === 'revive')!.price).toBe(REVIVE_SHOP_PRICE);
    expect(ITEM_BY_ID.get('revive')!.price).toBe(REVIVE_SHOP_PRICE);
  });
});

describe('Bottle Caps', () => {
  it('max one IV, or all of them for a HUNDO', () => {
    let s = withMon(base(), { ivs: { hp: 1, attack: 2, defense: 1 } });
    s = { ...s, bag: { ...s.bag, 'bottle-cap': 1, 'gold-bottle-cap': 1 } };
    const id = s.party[0]!.id;
    const one = useBottleCap(s, id, 'bottle-cap', 'hp');
    expect(one.party[0]!.ivs).toEqual({ hp: 3, attack: 2, defense: 1 });
    expect(one.party[0]!.maxHp).toBe(battleStats({ ...s.party[0]!, ivs: { hp: 3, attack: 2, defense: 1 } }).hp);
    expect(useBottleCap(one, id, 'bottle-cap', 'hp')).toBe(one);
    const gold = useBottleCap(one, id, 'gold-bottle-cap');
    expect(isPerfectIVs(gold.party[0]!.ivs)).toBe(true);
    expect(gold.bag['gold-bottle-cap']).toBe(0);
  });
});

describe('income stays generous', () => {
  it('pays thousands of coins per 100 cards', () => {
    const { state } = simulate({ cards: 600, seed: 9 });
    const per100 = (state.totalCurrencyEarned / 600) * 100;
    expect(per100).toBeGreaterThan(5000);
  });
});
