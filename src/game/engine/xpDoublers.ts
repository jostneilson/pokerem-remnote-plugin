import type { ItemId } from '../data/items';
import type { PokeRemGameState, XpDoublerEntry, XpDoublerTier } from '../state/model';

/** Cards-of-x2 each tier grants. Anchored on the spec: 25 / 50 / 100. */
export const XP_DOUBLER_CARDS: Record<XpDoublerTier, number> = {
  common: 25,
  rare: 50,
  legendary: 100,
};

/** Multiplier applied to Pokémon XP while a doubler is active. Trainer XP is *not* multiplied. */
export const XP_DOUBLER_MULTIPLIER = 2;

/** Sanity cap for queue length to keep storage + UI tidy. */
export const XP_DOUBLER_QUEUE_MAX = 8;

const ITEM_TO_TIER: Record<string, XpDoublerTier> = {
  'xp-doubler-common': 'common',
  'xp-doubler-rare': 'rare',
  'xp-doubler-legendary': 'legendary',
};

const TIER_TO_ITEM: Record<XpDoublerTier, ItemId> = {
  common: 'xp-doubler-common',
  rare: 'xp-doubler-rare',
  legendary: 'xp-doubler-legendary',
};

export function xpDoublerItemForTier(tier: XpDoublerTier): ItemId {
  return TIER_TO_ITEM[tier];
}

export function xpDoublerTierForItem(itemId: string): XpDoublerTier | null {
  return ITEM_TO_TIER[itemId] ?? null;
}

export function isXpDoublerItemId(itemId: string): boolean {
  return itemId in ITEM_TO_TIER;
}

export function makeXpDoublerEntry(tier: XpDoublerTier): XpDoublerEntry {
  const total = XP_DOUBLER_CARDS[tier];
  return { tier, cardsTotal: total, cardsRemaining: total };
}

export function xpDoublerLabel(tier: XpDoublerTier): string {
  if (tier === 'common') return 'XP Doubler (Common)';
  if (tier === 'rare') return 'XP Doubler (Rare)';
  return 'XP Doubler (Legendary)';
}

/** True when an XP doubler is currently counting down on this state snapshot. */
export function isXpDoublerActive(state: PokeRemGameState): boolean {
  return !!state.xpBoosterActive && state.xpBoosterActive.cardsRemaining > 0;
}

/** Apply the doubler multiplier to a base Pokémon-XP delta if a doubler is active. */
export function applyXpDoublerMultiplier(state: PokeRemGameState, baseXp: number): number {
  if (baseXp <= 0) return baseXp;
  return isXpDoublerActive(state) ? baseXp * XP_DOUBLER_MULTIPLIER : baseXp;
}
