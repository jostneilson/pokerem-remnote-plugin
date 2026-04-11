import { ITEMS, type ItemId, type ItemData } from '../data/items';

const ALWAYS_TAIL: ItemId[] = ['potion', 'exp-candy-s', 'catch-scope'];

/** Matches {@link TRAINER_REWARDS} level 7 — Ultra Ball is always stocked once unlocked. */
export const ULTRA_BALL_UNLOCK_LEVEL = 7;

/** Daily deals exclude items that are also always-unlocked at common trainer levels (see getShopInventory). */
const DAILY_POOL: ItemId[] = [
  'super-potion', 'max-potion', 'revive', 'oran-berry',
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

export function getShopInventory(trainerLevel: number = 1): ShopItem[] {
  const alwaysIds: ItemId[] = ['poke-ball', 'great-ball'];
  if (trainerLevel >= ULTRA_BALL_UNLOCK_LEVEL) alwaysIds.push('ultra-ball');
  alwaysIds.push(...ALWAYS_TAIL);

  const always: ShopItem[] = alwaysIds.map((id) => {
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
