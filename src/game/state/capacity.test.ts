import { describe, expect, it } from 'vitest';
import { bagCap, bagCount, capacityGain, fitFoundItems, storageCap, storageUpgradePrice } from '../engine/capacity';
import { addBagQuantities } from './reducers/core';
import { applyRouteFindToState } from './reducers/persistence';
import { buyBagUpgrade, buyItem, buyStorageUpgrade, catchEncounter, chooseStarter, createInitialStateV4, moveToStorage, parseGameState, quickBuyBalls } from './store';
import type { OwnedPokemon, PokeRemGameState } from './model';

const emptyBag = (s: PokeRemGameState) => Object.fromEntries(Object.keys(s.bag).map((k) => [k, 0])) as PokeRemGameState['bag'];
const started = (): PokeRemGameState => chooseStarter(createInitialStateV4(), 4);
const filler = (n: number, base: OwnedPokemon): OwnedPokemon[] => Array.from({ length: n }, (_, i) => ({ ...base, id: `pk_${10 + i}_s` }));

describe('capacity caps', () => {
  it('storage 60 + 10 per 5 trainer levels + bought; bag 200 + 20 per 5 levels + bought', () => {
    expect(storageCap({ trainerLevel: 1 })).toBe(60);
    expect(storageCap({ trainerLevel: 50 })).toBe(160);
    expect(storageCap({ trainerLevel: 12, storageBonus: 40 })).toBe(60 + 20 + 40);
    expect(bagCap({ trainerLevel: 10, bagBonus: 25 })).toBe(200 + 40 + 25);
    expect(capacityGain(9, 10)).toEqual({ storage: 10, bag: 20 });
    expect(capacityGain(10, 11)).toEqual({ storage: 0, bag: 0 });
  });

  it('key items never count against the bag', () => {
    expect(bagCount({ 'poke-ball': 10, 'fire-stone': 5, 'xp-doubler-rare': 2, 'bottle-cap': 3, potion: 2 })).toBe(12);
  });

  it('a full bag blocks buys but not key items', () => {
    const s0 = started();
    const s = { ...s0, currency: 1_000_000, trainerLevel: 1, bag: { ...emptyBag(s0), 'poke-ball': 200 } };
    expect(buyItem(s, 'poke-ball', 1)).toBe(s);
    expect(quickBuyBalls(s)).toBe(s);
    const roomy = { ...s, bag: { ...s.bag, 'poke-ball': 190 } };
    expect(buyItem(roomy, 'poke-ball', 10).bag['poke-ball']).toBe(200);
    expect(buyItem(roomy, 'poke-ball', 11)).toBe(roomy);
  });

  it('full storage blocks moving a party member in; an over-cap save keeps everything', () => {
    const s0 = started();
    const lead = s0.party[0]!;
    const s = { ...s0, party: [lead, { ...lead, id: 'pk_2_b' }], storagePokemon: filler(75, lead) };
    expect(moveToStorage(s, 'pk_2_b')).toBe(s);
    const round = parseGameState(JSON.parse(JSON.stringify(s)));
    expect(round.storagePokemon).toHaveLength(75);
  });

  it('upgrades cost 8k then +4k (storage), 6k then +3k (bag), up to the max', () => {
    let s = { ...started(), currency: 10_000_000 };
    expect(storageUpgradePrice(s)).toBe(8000);
    s = buyStorageUpgrade(s);
    expect(s.storageBonus).toBe(20);
    expect(storageUpgradePrice(s)).toBe(12000);
    for (let i = 0; i < 20; i++) s = buyStorageUpgrade(s);
    expect(s.storageBonus).toBe(200);
    expect(storageUpgradePrice(s)).toBeNull();
    const before = s.currency;
    s = buyBagUpgrade(s);
    expect(before - s.currency).toBe(6000);
    s = buyBagUpgrade(s);
    expect(s.bagBonus).toBe(50);
    expect(parseGameState(JSON.parse(JSON.stringify({ ...s, storageBonus: 9999, bagBonus: 'x' }))).storageBonus).toBe(200);
  });

  it('full storage blocks a catch (no ball used) but shinies and legendaries get through', () => {
    const s0 = started();
    const lead = s0.party[0]!;
    const full = {
      ...s0,
      party: Array.from({ length: 6 }, (_, i) => ({ ...lead, id: `pk_${i + 1}_p` })),
      storagePokemon: filler(60, lead),
      bag: { ...s0.bag, 'poke-ball': 5 },
      currentEncounter: { dexNum: 16, name: 'Pidgey', level: 3, currentHp: 1, maxHp: 20, types: ['Normal', 'Flying'] }
    } as PokeRemGameState;
    const blocked = catchEncounter(full, 'poke-ball');
    expect(blocked.currentEncounter).not.toBeNull();
    expect(blocked.bag['poke-ball']).toBe(5);
    expect(blocked.lastBattleLog).toMatch(/Storage full/);
    const shiny = catchEncounter({ ...full, currentEncounter: { ...full.currentEncounter!, shiny: true } }, 'poke-ball');
    expect(shiny.bag['poke-ball']).toBe(4);
    const legend = catchEncounter({ ...full, currentEncounter: { ...full.currentEncounter!, dexNum: 150, name: 'Mewtwo' } }, 'poke-ball');
    expect(legend.bag['poke-ball']).toBe(4);
  });

  it('found items that do not fit become coins at half price; key items always fit', () => {
    const s0 = started();
    const s = { ...s0, trainerLevel: 1, bag: { ...emptyBag(s0), 'poke-ball': 198 } };
    const fit = fitFoundItems(s, { potion: 4, 'fire-stone': 1 });
    expect(fit.bag.potion).toBe(2);
    expect(fit.bag['fire-stone']).toBe(1);
    expect(fit.converted).toBe(2);
    expect(fit.coins).toBe(150);
    const claimed = addBagQuantities(s, { potion: 4 });
    expect(claimed.currency - s.currency).toBe(150);
    const found = applyRouteFindToState({ ...s, bag: { ...s.bag, 'poke-ball': 200 } }, {
      itemId: 'potion',
      quantity: 1,
      notice: { itemId: 'potion', quantity: 1, headline: 'Found', subline: 'Potion.', source: 'travel' }
    } as Parameters<typeof applyRouteFindToState>[1]);
    expect(found.bag.potion).toBe(0);
    expect(found.routeFindNotice?.subline).toMatch(/Bag full → ₽75/);
  });
});
