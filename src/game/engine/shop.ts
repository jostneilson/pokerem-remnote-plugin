import { ITEMS, type ItemId, type ItemData } from '../data/items';

const ALWAYS_AVAILABLE: ItemId[] = ['poke-ball', 'great-ball', 'potion', 'exp-candy-s', 'catch-scope'];
const DAILY_POOL: ItemId[] = [
  'ultra-ball', 'super-potion', 'max-potion', 'revive', 'oran-berry',
  'rare-candy', 'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone',
];

function dailySeed(): number {
  return Math.floor(Date.now() / 86400000);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface ShopItem {
  item: ItemData;
  price: number;
  isDaily: boolean;
}

export function getShopInventory(): ShopItem[] {
  const always: ShopItem[] = ALWAYS_AVAILABLE.map((id) => {
    const item = ITEMS.find((i) => i.id === id)!;
    return { item, price: item.price, isDaily: false };
  });

  const rng = seededRandom(dailySeed());
  const shuffled = [...DAILY_POOL].sort(() => rng() - 0.5);
  const daily: ShopItem[] = shuffled.slice(0, 3).map((id) => {
    const item = ITEMS.find((i) => i.id === id)!;
    return { item, price: item.price, isDaily: true };
  });

  return [...always, ...daily];
}

export const CURRENCY_REWARDS = {
  review: 10,
  defeat: 50,
  catch: 100,
  run: 25,
} as const;
