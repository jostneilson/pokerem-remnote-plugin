import type { PokeRemGameState } from '../state/model';

/*
 * Capacity (SPEC A10, L13). Storage: 60 + 10 per 5 trainer levels + bought slots. Bag: 200 + 20 per 5 trainer
 * levels + bought slots; key items don't count. Party stays 6. Saves already over a cap keep everything; you just
 * can't add more until you're back under.
 */

export const STORAGE_BASE = 60;
export const STORAGE_PER_5_LEVELS = 10;
export const STORAGE_UPGRADE_STEP = 20;
export const STORAGE_UPGRADE_MAX = 200;
export const STORAGE_UPGRADE_PRICE = 8000;
export const STORAGE_UPGRADE_PRICE_STEP = 4000;

export const BAG_BASE = 200;
export const BAG_PER_5_LEVELS = 20;
export const BAG_UPGRADE_STEP = 25;
export const BAG_UPGRADE_MAX = 250;
export const BAG_UPGRADE_PRICE = 6000;
export const BAG_UPGRADE_PRICE_STEP = 3000;

/** Meter turns amber at this share of the cap. */
export const CAPACITY_WARN_SHARE = 0.9;

const KEY_ITEM_IDS = new Set([
  'xp-doubler-common',
  'xp-doubler-rare',
  'xp-doubler-legendary',
  'bottle-cap',
  'gold-bottle-cap',
  'fire-stone',
  'water-stone',
  'thunder-stone',
  'leaf-stone',
  'moon-stone',
  'sun-stone',
  'shiny-stone',
  'dusk-stone',
  'dawn-stone'
]);

/** Key items (XP Doublers, Bottle Caps, evolution stones) never take bag space. Route tickets aren't bag items. */
export function isKeyItem(itemId: string): boolean {
  return KEY_ITEM_IDS.has(itemId);
}

type CapState = Pick<PokeRemGameState, 'trainerLevel' | 'storageBonus' | 'bagBonus'>;

const levelSteps = (state: CapState) => Math.floor(Math.max(1, state.trainerLevel ?? 1) / 5);

export function storageCap(state: CapState): number {
  return STORAGE_BASE + STORAGE_PER_5_LEVELS * levelSteps(state) + (state.storageBonus ?? 0);
}

export function bagCap(state: CapState): number {
  return BAG_BASE + BAG_PER_5_LEVELS * levelSteps(state) + (state.bagBonus ?? 0);
}

/** Items that count against the bag cap. */
export function bagCount(bag: Record<string, number | undefined>): number {
  let n = 0;
  for (const [id, qty] of Object.entries(bag)) if (!isKeyItem(id) && qty && qty > 0) n += qty;
  return n;
}

export function storageRoom(state: CapState & Pick<PokeRemGameState, 'storagePokemon'>): number {
  return Math.max(0, storageCap(state) - state.storagePokemon.length);
}

export function bagRoom(state: CapState & Pick<PokeRemGameState, 'bag'>): number {
  return Math.max(0, bagCap(state) - bagCount(state.bag));
}

/** Price of the next Storage Upgrade, or null at the max. */
export function storageUpgradePrice(state: CapState): number | null {
  const bought = Math.floor((state.storageBonus ?? 0) / STORAGE_UPGRADE_STEP);
  if ((state.storageBonus ?? 0) >= STORAGE_UPGRADE_MAX) return null;
  return STORAGE_UPGRADE_PRICE + STORAGE_UPGRADE_PRICE_STEP * bought;
}

/** Price of the next Bag Upgrade, or null at the max. */
export function bagUpgradePrice(state: CapState): number | null {
  const bought = Math.floor((state.bagBonus ?? 0) / BAG_UPGRADE_STEP);
  if ((state.bagBonus ?? 0) >= BAG_UPGRADE_MAX) return null;
  return BAG_UPGRADE_PRICE + BAG_UPGRADE_PRICE_STEP * bought;
}

/** How much capacity the trainer-level change from `fromLevel` to `toLevel` added (for the level-up card). */
export function capacityGain(fromLevel: number, toLevel: number): { storage: number; bag: number } {
  const steps = Math.floor(Math.max(1, toLevel) / 5) - Math.floor(Math.max(1, fromLevel) / 5);
  return { storage: Math.max(0, steps) * STORAGE_PER_5_LEVELS, bag: Math.max(0, steps) * BAG_PER_5_LEVELS };
}

export type MeterLevel = 'ok' | 'warn' | 'full';

export function meterLevel(used: number, cap: number): MeterLevel {
  if (used >= cap) return 'full';
  return used >= cap * CAPACITY_WARN_SHARE ? 'warn' : 'ok';
}
