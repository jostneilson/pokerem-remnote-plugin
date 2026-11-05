import { BALANCE } from '../balance';
import { ITEMS, type ItemId, type ItemData } from '../data/items';

/** Revive is always in stock at a fixed PokéCoin price (not daily rotation). */
/** Revive costs the same everywhere (shop list, Quick Care, item data). */
export const REVIVE_SHOP_PRICE = 200;

const ALWAYS_TAIL: ItemId[] = ['revive', 'potion', 'exp-candy-s', 'catch-scope', 'bottle-cap', 'gold-bottle-cap'];

/** Matches {@link TRAINER_REWARDS} level 7 — Ultra Ball is always stocked once unlocked. */
export const ULTRA_BALL_UNLOCK_LEVEL = 7;

/** Daily deals exclude items that are also always-unlocked at common trainer levels (see getShopInventory). */
const DAILY_POOL: ItemId[] = [
  'super-potion', 'max-potion', 'oran-berry',
  'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone',
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
    const price = item.price;
    return { item, price, isDaily: false };
  });

  const rng = seededRandom(dailySeed());
  const shuffled = [...DAILY_POOL].sort(() => rng() - 0.5);
  const daily: ShopItem[] = shuffled.slice(0, 3).map((id) => {
    const item = ITEMS.find((i) => i.id === id)!;
    return { item, price: item.price, isDaily: true };
  });

  return [...always, ...daily];
}

/** Today's shop price for an item, or null when the shop doesn't sell it right now. */
export function shopPrice(itemId: string, trainerLevel: number = 1): number | null {
  return getShopInventory(trainerLevel).find((s) => s.item.id === itemId)?.price ?? null;
}

/** Flat parts of the coin rewards (the level-scaled parts live in balance.ts). */
export const CURRENCY_REWARDS = {
  review: BALANCE.coins.review,
  defeat: BALANCE.coins.defeatBase,
  catch: BALANCE.coins.catchBase,
  run: BALANCE.coins.run,
} as const;
