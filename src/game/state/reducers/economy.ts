import {
  BAG_UPGRADE_MAX,
  BAG_UPGRADE_STEP,
  STORAGE_UPGRADE_MAX,
  STORAGE_UPGRADE_STEP,
  bagRoom,
  bagUpgradePrice,
  isKeyItem,
  storageUpgradePrice
} from '../../engine/capacity';
import { REVIVE_SHOP_PRICE, shopPrice } from '../../engine/shop';
import { themePrice } from '../../balance';
import { ALL_TYPES } from '../../data/typeChart';
import { ivsFor, isPerfectIVs, battleStats, powerUpCost } from '../../engine/pokemonStats';
import { healAmountFor, ITEM_BY_ID, type ItemId } from '../../data/items';
import { checkItemEvolution, applyEvolution } from '../../engine/evolution';
import {
  ROUTE_BIOME_BY_ID,
  ROUTE_TICKET_PRICE,
  ROUTE_TICKET_WILDS,
  TRAINER_CARD_STYLE_BY_ID,
  tutorOptions,
} from '../../engine/sinks';
import { xpThresholdForLevel } from '../../engine/progression';
import { TRAINER_XP_SOURCES } from '../../engine/trainerLevel';
import { moveDisplayName } from '../../engine/combatExchange';
import type { PokeRemGameState, OwnedPokemon } from '../model';
import {
  activePokemon,
  addTrainerXp,
  growPokemonWithXp,
  isTrainerBattleActive,
  withTouch,
} from './core';
import { bumpBattleOutcome } from './persistence';

const EXP_CANDY_S_XP = 45;

/** Use a heal item on `targetId` (any party member), or on the lead when omitted. */
export function useHealingItem(
  state: PokeRemGameState,
  itemId: string,
  targetId?: string
): PokeRemGameState {
  if (isTrainerBattleActive(state)) return state;
  const activeId = targetId ?? state.activePokemonId;
  if (!activeId) return state;
  const count = state.bag[itemId as keyof typeof state.bag] ?? 0;
  if (count <= 0) return state;

  const item = ITEM_BY_ID.get(itemId as any);
  if (!item || item.kind !== 'heal') return state;

  const idx = state.party.findIndex((p) => p.id === activeId);
  if (idx < 0) return state;
  const mon = state.party[idx]!;

  if (item.id === 'revive') {
    if (mon.currentHp > 0) return state;
    const newHp = Math.max(1, Math.floor(mon.maxHp * 0.5));
    const party = state.party.map((p, i) =>
      i === idx ? { ...p, currentHp: Math.min(p.maxHp, newHp) } : p
    );
    const bag = { ...state.bag, [itemId]: Math.max(0, count - 1) };
    return withTouch({ ...state, bag, party });
  }

  if (mon.currentHp <= 0) {
    const msg = 'Fainted Pokémon must be revived with a Revive before they can be healed.';
    return withTouch({ ...state, ...bumpBattleOutcome(state, 'none', msg) });
  }

  if (mon.currentHp >= mon.maxHp) return state;
  const healBy = healAmountFor(item, mon.maxHp);
  if (healBy <= 0) return state;
  const party = state.party.map((p, i) =>
    i === idx ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + healBy) } : p
  );
  const bag = { ...state.bag, [itemId]: Math.max(0, count - 1) };
  return withTouch({ ...state, bag, party });
}

/** Rare Candy / Exp. Candy S on the lead (or `targetId`) Pokémon (consumes one from the bag). */
export function useLeadUtilityItem(
  state: PokeRemGameState,
  itemId: string,
  targetId?: string
): PokeRemGameState {
  if (isTrainerBattleActive(state)) return state;
  const activeId = targetId ?? state.activePokemonId;
  if (!activeId) return state;
  const id = itemId as ItemId;
  const count = state.bag[id] ?? 0;
  if (count <= 0) return state;
  const item = ITEM_BY_ID.get(id);
  if (!item || item.kind !== 'utility') return state;
  if (itemId !== 'rare-candy' && itemId !== 'exp-candy-s') return state;

  const idx = state.party.findIndex((p) => p.id === activeId);
  if (idx < 0) return state;
  const mon = state.party[idx]!;

  if (itemId === 'rare-candy') {
    if (mon.level >= 100) return state;
    const newLevel = Math.min(100, mon.level + 1);
    const targetTotalXp = xpThresholdForLevel(newLevel);
    const delta = targetTotalXp - mon.totalXp;
    const grown = growPokemonWithXp(mon, delta);
    const party = state.party.map((p, i) => (i === idx ? grown.pokemon : p));
    const bag = { ...state.bag, [id]: Math.max(0, count - 1) };
    return withTouch({ ...state, bag, party });
  }

  const grown = growPokemonWithXp(mon, EXP_CANDY_S_XP);
  const party = state.party.map((p, i) => (i === idx ? grown.pokemon : p));
  const bag = { ...state.bag, [id]: Math.max(0, count - 1) };
  return withTouch({ ...state, bag, party });
}

/** Buy `quantity` of an item at today's shop price (the shop inventory is the only price source). */
export function buyItem(state: PokeRemGameState, itemId: string, quantity = 1): PokeRemGameState {
  const price = shopPrice(itemId, state.trainerLevel ?? 1);
  const qty = Math.max(1, Math.floor(quantity));
  if (price == null) return state;
  const total = price * qty;
  if ((state.currency ?? 0) < total) return state;
  // A full bag blocks buys (key items never take space).
  if (!isKeyItem(itemId) && bagRoom(state) < qty) return state;
  const bag = { ...state.bag, [itemId]: (state.bag[itemId as keyof typeof state.bag] ?? 0) + qty };
  return withTouch({
    ...state,
    bag,
    currency: (state.currency ?? 0) - total,
    totalShopPurchases: (state.totalShopPurchases ?? 0) + qty,
  });
}

/** Teach a move from the tutor (see engine/sinks.ts). Auto best moves decides whether it goes in the four. */
export function teachTutorMove(
  state: PokeRemGameState,
  pokemonId: string,
  moveId: string
): PokeRemGameState {
  if (isTrainerBattleActive(state)) return state;
  const mon = [...state.party, ...state.storagePokemon].find((p) => p.id === pokemonId);
  if (!mon) return state;
  const option = tutorOptions(mon).find((o) => o.moveId === moveId);
  if (!option || (state.currency ?? 0) < option.price) return state;
  const teach = (p: OwnedPokemon): OwnedPokemon => {
    if (p.id !== pokemonId) return p;
    const tutorMoves = [...(p.tutorMoves ?? []), moveId];
    // With auto moves off, a free slot takes the new move; otherwise the player swaps it in by hand.
    const moves =
      p.autoMoves === false && (p.moves?.length ?? 0) < 4 ? [...(p.moves ?? []), moveId] : p.moves;
    return { ...p, tutorMoves, moves };
  };
  return withTouch({
    ...state,
    party: state.party.map(teach),
    storagePokemon: state.storagePokemon.map(teach),
    currency: (state.currency ?? 0) - option.price,
    lastBattleLog: `${mon.nickname || mon.name} learned ${moveDisplayName(moveId)} from the Move Tutor!`,
  });
}

/** Buy a route ticket. More of the same biome stacks; a different biome waits until this one is used up. */
export function buyRouteTicket(state: PokeRemGameState, biomeId: string): PokeRemGameState {
  if (!ROUTE_BIOME_BY_ID.has(biomeId) || (state.currency ?? 0) < ROUTE_TICKET_PRICE) return state;
  const current = state.routeTicket;
  if (current && current.remaining > 0 && current.biome !== biomeId) return state;
  return withTouch({
    ...state,
    currency: (state.currency ?? 0) - ROUTE_TICKET_PRICE,
    routeTicket: { biome: biomeId, remaining: (current?.remaining ?? 0) + ROUTE_TICKET_WILDS },
    totalShopPurchases: (state.totalShopPurchases ?? 0) + 1,
  });
}

export function buyCardStyle(state: PokeRemGameState, styleId: string): PokeRemGameState {
  const style = TRAINER_CARD_STYLE_BY_ID.get(styleId);
  const owned = state.ownedCardStyles ?? [];
  if (
    !style ||
    style.id === 'classic' ||
    owned.includes(style.id) ||
    (state.currency ?? 0) < style.price
  )
    return state;
  return withTouch({
    ...state,
    currency: (state.currency ?? 0) - style.price,
    ownedCardStyles: [...owned, style.id],
    trainerCardStyle: style.id,
    totalShopPurchases: (state.totalShopPurchases ?? 0) + 1,
  });
}

export function equipCardStyle(state: PokeRemGameState, styleId: string): PokeRemGameState {
  if (styleId !== 'classic' && !(state.ownedCardStyles ?? []).includes(styleId)) return state;
  const next = styleId === 'classic' ? undefined : styleId;
  return next === state.trainerCardStyle ? state : withTouch({ ...state, trainerCardStyle: next });
}

/** Buy a type theme (SPEC A12/U11) and equip it. A voucher, if used, takes 20% off and is spent. */
export function buyTheme(state: PokeRemGameState, themeId: string, useVoucher = false): PokeRemGameState {
  const owned = state.themesOwned ?? [];
  const vouchers = state.themeVouchers ?? 0;
  if (!(ALL_TYPES as string[]).includes(themeId) || owned.includes(themeId) || (useVoucher && vouchers < 1)) return state;
  const price = themePrice(useVoucher);
  if ((state.currency ?? 0) < price) return state;
  return withTouch({
    ...state,
    currency: (state.currency ?? 0) - price,
    themesOwned: [...owned, themeId],
    themeActive: themeId,
    ...(useVoucher ? { themeVouchers: vouchers - 1 } : {}),
    totalShopPurchases: (state.totalShopPurchases ?? 0) + 1,
  });
}

/** Equip an owned theme, or `'default'` for the free arcade look. */
export function equipTheme(state: PokeRemGameState, themeId: string): PokeRemGameState {
  if (themeId !== 'default' && !(state.themesOwned ?? []).includes(themeId)) return state;
  const next = themeId === 'default' ? undefined : themeId;
  return next === state.themeActive ? state : withTouch({ ...state, themeActive: next });
}

/** Consume exactly one compatible stone after all guards pass. No save migration. */
export function useEvolutionStone(
  state: PokeRemGameState,
  pokemonId: string,
  itemId: string
): PokeRemGameState {
  if (isTrainerBattleActive(state) || state.currentEncounter) return state;
  const item = ITEM_BY_ID.get(itemId as ItemId);
  if (!item || item.kind !== 'evolution' || (state.bag[item.id] ?? 0) < 1) return state;
  const mon = [...state.party, ...state.storagePokemon].find((p) => p.id === pokemonId);
  if (!mon || mon.currentHp <= 0) return state;
  const evolution = checkItemEvolution(mon, itemId);
  if (!evolution) return state;
  const evolved = applyEvolution(mon, evolution);
  return withTouch(
    addTrainerXp(
      {
        ...state,
        bag: { ...state.bag, [item.id]: state.bag[item.id] - 1 },
        party: state.party.map((p) => (p.id === pokemonId ? evolved : p)),
        storagePokemon: state.storagePokemon.map((p) => (p.id === pokemonId ? evolved : p)),
        collectionDex: {
          ...state.collectionDex,
          [evolution.intoDexNum]: Math.max(1, state.collectionDex[evolution.intoDexNum] ?? 0),
        },
        totalEvolutions: (state.totalEvolutions ?? 0) + 1,
        ...bumpBattleOutcome(
          state,
          'evolution',
          `${mon.nickname || mon.name} evolved into ${evolution.intoName}!`
        ),
      },
      TRAINER_XP_SOURCES.evolution
    )
  );
}

export function powerUpPokemon(
  state: PokeRemGameState,
  id: string,
  expectedLevel: number
): PokeRemGameState {
  if (state.currentEncounter || state.currentTrainerBattle || state.pendingCaughtMon) return state;
  const mon = [...state.party, ...state.storagePokemon].find((p) => p.id === id);
  if (!mon || mon.level !== expectedLevel || mon.level >= 100) return state;
  const cost = powerUpCost(mon.level);
  if (state.currency < cost) return state;
  const result = growPokemonWithXp(
    mon,
    Math.max(0, xpThresholdForLevel(mon.level + 1) - mon.totalXp)
  );
  if (result.pokemon.level <= mon.level) return state;
  const grown = {
    ...result.pokemon,
    currentHp:
      mon.currentHp <= 0
        ? 0
        : Math.min(result.pokemon.maxHp, mon.currentHp + result.pokemon.maxHp - mon.maxHp),
  };
  const next = {
    ...state,
    currency: state.currency - cost,
    party: state.party.map((p) => (p.id === id ? grown : p)),
    storagePokemon: state.storagePokemon.map((p) => (p.id === id ? grown : p)),
    totalEvolutions: state.totalEvolutions + (result.evolvedMon ? 1 : 0),
    ...bumpBattleOutcome(
      state,
      result.evolvedMon ? 'evolution' : 'none',
      `${mon.nickname || mon.name} powered up to Lv${grown.level}!`
    ),
  };
  return withTouch(result.evolvedMon ? addTrainerXp(next, TRAINER_XP_SOURCES.evolution) : next);
}

export type TrainableIv = 'hp' | 'attack' | 'defense';

/**
 * Hyper training: a Bottle Cap maxes one IV, a Gold Bottle Cap maxes all three. HP keeps its
 * current share of max HP.
 */
export function useBottleCap(
  state: PokeRemGameState,
  pokemonId: string,
  itemId: 'bottle-cap' | 'gold-bottle-cap',
  stat?: TrainableIv
): PokeRemGameState {
  if (state.currentEncounter || isTrainerBattleActive(state)) return state;
  if ((state.bag[itemId] ?? 0) <= 0) return state;
  const mon = [...state.party, ...state.storagePokemon].find((p) => p.id === pokemonId);
  if (!mon) return state;
  const ivs = ivsFor(mon);
  if (itemId === 'bottle-cap' && (!stat || ivs[stat] >= 3)) return state;
  if (itemId === 'gold-bottle-cap' && isPerfectIVs(ivs)) return state;
  const trained =
    itemId === 'gold-bottle-cap'
      ? ({ hp: 3, attack: 3, defense: 3 } as const)
      : { ...ivs, [stat!]: 3 };
  const maxHp = battleStats({ ...mon, ivs: trained }).hp;
  const ratio = mon.maxHp > 0 ? mon.currentHp / mon.maxHp : 1;
  const updated: OwnedPokemon = {
    ...mon,
    ivs: trained,
    maxHp,
    currentHp: mon.currentHp <= 0 ? 0 : Math.max(1, Math.round(maxHp * ratio)),
  };
  const swap = (p: OwnedPokemon) => (p.id === pokemonId ? updated : p);
  const name = mon.nickname || mon.name;
  const msg = isPerfectIVs(trained)
    ? `${name} is now a HUNDO!`
    : `${name}'s ${stat === 'hp' ? 'HP' : stat === 'attack' ? 'Attack' : 'Defense'} is now maxed.`;
  return withTouch({
    ...state,
    bag: { ...state.bag, [itemId]: (state.bag[itemId] ?? 0) - 1 },
    party: state.party.map(swap),
    storagePokemon: state.storagePokemon.map(swap),
    ...bumpBattleOutcome(state, 'none', msg),
  });
}

// ── Quick care (1.4.1): fix the team from Play without visiting Shop, Bag, and Party. ─────

/** Per fainted Pokémon, per level: reviving a Lv30 costs ₽600. */
const CENTER_FAINT_COST_PER_LEVEL = 20;

/** Next conscious party member after the lead, for one-tap switching. */
export function nextHealthyPartyMember(state: PokeRemGameState): OwnedPokemon | null {
  return state.party.find((p) => p.id !== state.activePokemonId && p.currentHp > 0) ?? null;
}

/** Revive the fainted lead with one from the Bag, buying one first if the Bag has none. */
export function quickReviveLead(state: PokeRemGameState): PokeRemGameState {
  const lead = activePokemon(state);
  if (!lead || lead.currentHp > 0 || isTrainerBattleActive(state)) return state;
  const owned = (state.bag.revive ?? 0) > 0;
  if (!owned && (state.currency ?? 0) < REVIVE_SHOP_PRICE) return state;
  const stocked = owned ? state : buyItem(state, 'revive');
  const revived = useHealingItem(stocked, 'revive');
  return withTouch({
    ...revived,
    ...bumpBattleOutcome(revived, 'none', `${lead.nickname || lead.name} is back on its feet!`),
  });
}

/** Which potion {@link quickHealLead} would use: the smallest that covers the damage, else the strongest. */
export function bestPotionForLead(
  state: PokeRemGameState
): { id: ItemId; owned: boolean; price: number } | null {
  const lead = activePokemon(state);
  if (!lead || lead.currentHp <= 0 || lead.currentHp >= lead.maxHp) return null;
  const missing = lead.maxHp - lead.currentHp;
  const potions = (['potion', 'super-potion', 'max-potion'] as const)
    .filter((id) => (state.bag[id] ?? 0) > 0)
    .map((id) => ITEM_BY_ID.get(id)!);
  const pick =
    potions.find((i) => healAmountFor(i, lead.maxHp) >= missing) ?? potions[potions.length - 1];
  if (pick) return { id: pick.id, owned: true, price: 0 };
  const potion = ITEM_BY_ID.get('potion')!;
  return { id: potion.id, owned: false, price: potion.price };
}

/** The owned item a one-tap Heal would use on this party member: Revive when fainted, else the smallest potion that tops it up. */
export function bestHealItemFor(
  bag: PokeRemGameState['bag'],
  mon: OwnedPokemon | undefined
): ItemId | null {
  if (!mon) return null;
  if (mon.currentHp <= 0) return (bag.revive ?? 0) > 0 ? 'revive' : null;
  if (mon.currentHp >= mon.maxHp) return null;
  const missing = mon.maxHp - mon.currentHp;
  const potions = (['oran-berry', 'potion', 'super-potion', 'max-potion'] as const)
    .filter((id) => ITEM_BY_ID.has(id) && (bag[id] ?? 0) > 0)
    .map((id) => ITEM_BY_ID.get(id)!);
  return (
    (potions.find((i) => healAmountFor(i, mon.maxHp) >= missing) ?? potions[potions.length - 1])
      ?.id ?? null
  );
}

export function quickHealPokemon(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  const item = bestHealItemFor(
    state.bag,
    state.party.find((p) => p.id === pokemonId)
  );
  return item ? useHealingItem(state, item, pokemonId) : state;
}

export function quickHealLead(state: PokeRemGameState): PokeRemGameState {
  const pick = bestPotionForLead(state);
  if (!pick || isTrainerBattleActive(state)) return state;
  if (!pick.owned && (state.currency ?? 0) < pick.price) return state;
  const stocked = pick.owned ? state : buyItem(state, pick.id);
  return useHealingItem(stocked, pick.id);
}

/**
 * Coins to fully restore the party. Healing costs more per HP as Pokémon level up (1 per HP per
 * 10 levels), and each fainted Pokémon costs 20 per level, so potions stay worth carrying.
 */
export function pokemonCenterCost(state: PokeRemGameState): number {
  return state.party.reduce((sum, p) => {
    const perHp = Math.max(1, Math.round(p.level / 10));
    const faint = p.currentHp <= 0 ? CENTER_FAINT_COST_PER_LEVEL * Math.max(1, p.level) : 0;
    return sum + Math.max(0, p.maxHp - p.currentHp) * perHp + faint;
  }, 0);
}

export function pokemonCenterHeal(state: PokeRemGameState): PokeRemGameState {
  if (state.currentEncounter || isTrainerBattleActive(state)) return state;
  const cost = pokemonCenterCost(state);
  if (cost <= 0 || (state.currency ?? 0) < cost) return state;
  return withTouch({
    ...state,
    currency: state.currency - cost,
    party: state.party.map((p) => ({ ...p, currentHp: p.maxHp })),
    ...bumpBattleOutcome(state, 'none', 'Your team is fully healed. We hope to see you again!'),
  });
}

export const QUICK_BALL_COUNT = 5;

/** Restock Poké Balls mid-encounter (as many of five as coins allow). */
export function quickBuyBalls(state: PokeRemGameState): PokeRemGameState {
  const price = ITEM_BY_ID.get('poke-ball')!.price;
  const count = Math.min(QUICK_BALL_COUNT, Math.floor((state.currency ?? 0) / price), bagRoom(state));
  if (count <= 0) return state;
  return withTouch({
    ...state,
    currency: state.currency - count * price,
    bag: { ...state.bag, 'poke-ball': (state.bag['poke-ball'] ?? 0) + count },
    totalShopPurchases: (state.totalShopPurchases ?? 0) + count,
  });
}

/** Shop "Storage Upgrade +20" (SPEC L13). */
export function buyStorageUpgrade(state: PokeRemGameState): PokeRemGameState {
  const price = storageUpgradePrice(state);
  if (price == null || (state.currency ?? 0) < price) return state;
  return withTouch({
    ...state,
    currency: state.currency - price,
    storageBonus: Math.min(STORAGE_UPGRADE_MAX, (state.storageBonus ?? 0) + STORAGE_UPGRADE_STEP),
    totalShopPurchases: (state.totalShopPurchases ?? 0) + 1,
  });
}

/** Shop "Bag Upgrade +25" (SPEC L13). */
export function buyBagUpgrade(state: PokeRemGameState): PokeRemGameState {
  const price = bagUpgradePrice(state);
  if (price == null || (state.currency ?? 0) < price) return state;
  return withTouch({
    ...state,
    currency: state.currency - price,
    bagBonus: Math.min(BAG_UPGRADE_MAX, (state.bagBonus ?? 0) + BAG_UPGRADE_STEP),
    totalShopPurchases: (state.totalShopPurchases ?? 0) + 1,
  });
}
