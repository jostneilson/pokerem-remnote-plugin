import { POKEREM_VERSION } from '../../../releaseMeta';
import { rollIVs, battleStats } from '../../engine/pokemonStats';
import { ITEM_BY_ID, type ItemId } from '../../data/items';
import { SPECIES_BY_DEX } from '../../data/species';
import { STARTER_DEX_ALL } from '../../data/pokedex';
import {
  ACHIEVEMENT_DEFS,
  achievementItemBonus,
  achievementTrainerXpReward,
} from '../../engine/achievements';
import { withOptimalMoves } from '../../engine/movesetOptimizer';
import { dedupeMoveIds, getInitialMoves, getUnlockedLearnsetMoveIds } from '../../engine/moveLearn';
import { MOVES } from '../../data/moves';
import { questViews } from '../../engine/quests';
import { xpThresholdForLevel } from '../../engine/progression';
import { STARTER_LEVEL } from '../../constants';
import { TRAINER_REWARDS } from '../../engine/trainerLevel';
import type { PokeRemGameState, OwnedPokemon } from '../model';
import { addBagQuantities, addTrainerXp, dismissMainNotice, withTouch } from './core';
import { uid } from './persistence';

/** Claim a finished daily or weekly quest's coins and items. */
export function claimQuest(state: PokeRemGameState, questId: string): PokeRemGameState {
  const view = questViews(state).find((q) => q.id === questId);
  if (!view || !view.done || view.claimed || !state.quests) return state;
  const bag = { ...state.bag };
  for (const [id, n] of Object.entries(view.items ?? {})) {
    if (n && n > 0 && ITEM_BY_ID.has(id as ItemId))
      bag[id as ItemId] = (bag[id as ItemId] ?? 0) + n;
  }
  return withTouch({
    ...state,
    bag,
    currency: (state.currency ?? 0) + view.coins,
    totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + view.coins,
    quests: { ...state.quests, claimed: [...state.quests.claimed, questId] },
  });
}

/** Claim every finished quest at once. */
export function claimAllQuests(state: PokeRemGameState): PokeRemGameState {
  return questViews(state)
    .filter((q) => q.done && !q.claimed)
    .reduce((s, q) => claimQuest(s, q.id), state);
}

export function chooseStarter(state: PokeRemGameState, dexNum: number): PokeRemGameState {
  if (!(STARTER_DEX_ALL as readonly number[]).includes(dexNum)) return state;
  // Never replace an existing team (for example if the picker showed before the save loaded).
  if (state.party.length > 0 || state.storagePokemon.length > 0) return state;
  const species = SPECIES_BY_DEX.get(dexNum);
  if (!species) return state;
  const level = STARTER_LEVEL;
  const ivs = rollIVs();
  const maxHp = battleStats({ dexNum, level, ivs }).hp;
  const starter: OwnedPokemon = {
    id: uid(),
    dexNum,
    name: species.name,
    level,
    totalXp: xpThresholdForLevel(level),
    currentHp: maxHp,
    maxHp,
    types: species.types,
    ivs,
    moves: getInitialMoves(dexNum, level),
  };
  return withTouch({
    ...state,
    starterChosen: true,
    // A new trainer has nothing to catch up on, so release notes start as read.
    whatsNewSeenVersion:
      state.cardsReviewed === 0 && state.storagePokemon.length === 0
        ? POKEREM_VERSION
        : state.whatsNewSeenVersion,
    party: [starter],
    activePokemonId: starter.id,
    selectedTab: 'status',
  });
}

/** Turn automatic best-move picking on (re-picks now) or off for one Pokémon. */
export function setAutoMoves(
  state: PokeRemGameState,
  pokemonId: string,
  on: boolean
): PokeRemGameState {
  const apply = (p: OwnedPokemon) =>
    p.id === pokemonId
      ? on
        ? withOptimalMoves({ ...p, autoMoves: undefined })
        : { ...p, autoMoves: false }
      : p;
  return withTouch({
    ...state,
    party: state.party.map(apply),
    storagePokemon: state.storagePokemon.map(apply),
  });
}

export function forgetMoveAction(
  state: PokeRemGameState,
  pokemonId: string,
  moveId: string
): PokeRemGameState {
  const party = state.party.map((p) => {
    if (p.id !== pokemonId) return p;
    return { ...p, autoMoves: false, moves: (p.moves ?? []).filter((m) => m !== moveId) };
  });
  const storagePokemon = state.storagePokemon.map((p) => {
    if (p.id !== pokemonId) return p;
    return { ...p, autoMoves: false, moves: (p.moves ?? []).filter((m) => m !== moveId) };
  });
  return withTouch({ ...state, party, storagePokemon });
}

/**
 * Teach a move manually from the Party screen. Only moves unlocked on this species' level-up
 * table at its current level (plus type legality). If the moveset is full (4),
 * pass `replaceIndex` 0–3 to overwrite that slot.
 */
export function learnMoveAction(
  state: PokeRemGameState,
  pokemonId: string,
  moveId: string,
  replaceIndex?: number
): PokeRemGameState {
  const move = MOVES[moveId];
  if (!move) return state;

  const apply = (mon: OwnedPokemon): OwnedPokemon | null => {
    if (mon.id !== pokemonId) return null;
    const unlocked = new Set([
      ...getUnlockedLearnsetMoveIds(mon.dexNum, mon.level),
      ...(mon.tutorMoves ?? []),
    ]);
    if (!unlocked.has(moveId)) return null;

    const cur = dedupeMoveIds([...(mon.moves ?? [])]);
    if (cur.includes(moveId)) return null;
    let next: string[];
    if (cur.length < 4) {
      next = [...cur, moveId];
    } else {
      if (replaceIndex === undefined || replaceIndex < 0 || replaceIndex > 3) return null;
      next = [...cur];
      next[replaceIndex] = moveId;
    }
    return { ...mon, autoMoves: false, moves: next };
  };

  let partyHit = false;
  const party = state.party.map((p) => {
    const u = apply(p);
    if (u) {
      partyHit = true;
      return u;
    }
    return p;
  });
  if (partyHit) return withTouch({ ...state, party });

  let storageHit = false;
  const storagePokemon = state.storagePokemon.map((p) => {
    const u = apply(p);
    if (u) {
      storageHit = true;
      return u;
    }
    return p;
  });
  if (storageHit) return withTouch({ ...state, storagePokemon });

  return state;
}

export function renamePokemon(
  state: PokeRemGameState,
  pokemonId: string,
  nickname: string
): PokeRemGameState {
  const party = state.party.map((p) =>
    p.id === pokemonId ? { ...p, nickname: nickname || undefined } : p
  );
  const storagePokemon = state.storagePokemon.map((p) =>
    p.id === pokemonId ? { ...p, nickname: nickname || undefined } : p
  );
  return withTouch({ ...state, party, storagePokemon });
}

export function releasePokemon(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  if ([...state.party, ...state.storagePokemon].some((p) => p.id === pokemonId && p.favorite))
    return state;
  if (state.party.length <= 1 && state.party.some((p) => p.id === pokemonId)) return state;
  const party = state.party.filter((p) => p.id !== pokemonId);
  const storagePokemon = state.storagePokemon.filter((p) => p.id !== pokemonId);
  let activePokemonId = state.activePokemonId;
  if (activePokemonId === pokemonId) {
    activePokemonId = party[0]?.id ?? null;
  }
  return withTouch({ ...state, party, storagePokemon, activePokemonId });
}

export function moveToStorage(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  if (state.party.length <= 1) return state;
  const mon = state.party.find((p) => p.id === pokemonId);
  if (!mon) return state;
  const remaining = state.party.filter((p) => p.id !== pokemonId);
  let activePokemonId = state.activePokemonId;
  if (pokemonId === state.activePokemonId) {
    activePokemonId = remaining[0]?.id ?? null;
  }
  return withTouch({
    ...state,
    activePokemonId,
    party: remaining,
    storagePokemon: [...state.storagePokemon, mon],
  });
}

export function moveToParty(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  if (state.party.length >= 6) return state;
  const mon = state.storagePokemon.find((p) => p.id === pokemonId);
  if (!mon) return state;
  return withTouch({
    ...state,
    party: [...state.party, mon],
    storagePokemon: state.storagePokemon.filter((p) => p.id !== pokemonId),
  });
}

/** Swap one party slot for a Pokémon from storage (party stays same size). */
export function swapPartyWithStorage(
  state: PokeRemGameState,
  storagePokemonId: string,
  replacePartyPokemonId: string
): PokeRemGameState {
  const incoming = state.storagePokemon.find((p) => p.id === storagePokemonId);
  const idx = state.party.findIndex((p) => p.id === replacePartyPokemonId);
  if (!incoming || idx < 0) return state;
  const outgoing = state.party[idx]!;
  const party = [...state.party];
  party[idx] = incoming;
  const storagePokemon = [
    ...state.storagePokemon.filter((p) => p.id !== storagePokemonId),
    outgoing,
  ];
  let activePokemonId = state.activePokemonId;
  if (activePokemonId === replacePartyPokemonId) {
    activePokemonId = incoming.id;
  }
  return withTouch({ ...state, party, storagePokemon, activePokemonId });
}

export function claimAchievement(state: PokeRemGameState, id: string): PokeRemGameState {
  const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
  if (!def || !state.achievements[id]) return state;
  const claimed = state.claimedAchievementIds ?? [];
  if (claimed.includes(id)) return state;
  let next: PokeRemGameState = {
    ...state,
    claimedAchievementIds: [...claimed, id],
    lastUpdatedAt: Date.now(),
  };
  next = addTrainerXp(next, achievementTrainerXpReward(def));
  next = addBagQuantities(next, achievementItemBonus(def));
  if (def.prestigeBadgeId) {
    const existing = next.prestigeBadges ?? [];
    if (!existing.includes(def.prestigeBadgeId)) {
      next = { ...next, prestigeBadges: [...existing, def.prestigeBadgeId] };
    }
  }
  next.mainNoticeQueue = (next.mainNoticeQueue ?? []).filter(
    (n) => !(n.kind === 'achievement_unlock' && n.id === id)
  );
  return withTouch(next);
}

/** Claim every unlocked-but-unclaimed achievement in one go. */
export function claimAllAchievements(state: PokeRemGameState): PokeRemGameState {
  let next = state;
  const claimed = new Set(state.claimedAchievementIds ?? []);
  for (const def of ACHIEVEMENT_DEFS) {
    if (!state.achievements[def.id]) continue;
    if (claimed.has(def.id)) continue;
    next = claimAchievement(next, def.id);
  }
  return next;
}

/** Trainer-level rewards reached but not yet claimed. */
function unclaimedTrainerRewardLevels(state: PokeRemGameState): number[] {
  const claimed = new Set(state.claimedRewardLevels ?? []);
  return TRAINER_REWARDS.filter(
    (r) => r.level <= (state.trainerLevel ?? 1) && !claimed.has(r.level)
  ).map((r) => r.level);
}

/** Everything waiting to be claimed: achievements, trainer rewards and finished quests. */
export function pendingRewardCount(state: PokeRemGameState): number {
  const claimed = new Set(state.claimedAchievementIds ?? []);
  const achievements = ACHIEVEMENT_DEFS.filter(
    (d) => state.achievements[d.id] && !claimed.has(d.id)
  ).length;
  const quests = state.starterChosen
    ? questViews(state).filter((q) => q.done && !q.claimed).length
    : 0;
  return achievements + unclaimedTrainerRewardLevels(state).length + quests;
}

/** Claim the reward behind a banner notice, then clear the banner. */
export function claimMainNotice(state: PokeRemGameState, id: string): PokeRemGameState {
  const notice = (state.mainNoticeQueue ?? []).find((n) => n.id === id);
  if (!notice) return state;
  if (notice.kind === 'achievement_unlock')
    return dismissMainNotice(claimAchievement(state, id), id);
  if (notice.kind === 'trainer_reward') {
    const level = Number(id.replace('reward-', ''));
    return dismissMainNotice(Number.isFinite(level) ? claimTrainerReward(state, level) : state, id);
  }
  return dismissMainNotice(state, id);
}

/** One tap for every pending reward: achievements, trainer rewards and quests. */
export function claimAllTrainerRewards(state: PokeRemGameState): PokeRemGameState {
  let next = state;
  for (const level of unclaimedTrainerRewardLevels(next)) next = claimTrainerReward(next, level);
  return next;
}

export function claimAllRewards(state: PokeRemGameState): PokeRemGameState {
  let next = claimAllAchievements(state);
  for (const level of unclaimedTrainerRewardLevels(next)) next = claimTrainerReward(next, level);
  if (next.starterChosen) next = claimAllQuests(next);
  const queue = (next.mainNoticeQueue ?? []).filter(
    (n) => n.kind !== 'achievement_unlock' && n.kind !== 'trainer_reward'
  );
  return withTouch({ ...next, mainNoticeQueue: queue });
}

export function claimTrainerReward(state: PokeRemGameState, level: number): PokeRemGameState {
  const reward = TRAINER_REWARDS.find((r) => r.level === level);
  if (!reward) return state;
  if ((state.trainerLevel ?? 1) < level) return state;
  const claimed = state.claimedRewardLevels ?? [];
  if (claimed.includes(level)) return state;

  let next = { ...state, claimedRewardLevels: [...claimed, level] };
  if (reward.items) {
    const bag = { ...next.bag };
    for (const [itemId, qty] of Object.entries(reward.items)) {
      bag[itemId as keyof typeof bag] = ((bag as any)[itemId] ?? 0) + (qty as number);
    }
    next = { ...next, bag };
  }
  if (reward.trainerRankTitle) {
    next = { ...next, trainerRank: reward.trainerRankTitle };
  }
  next = {
    ...next,
    mainNoticeQueue: (next.mainNoticeQueue ?? []).filter(
      (n) => !(n.kind === 'trainer_reward' && n.id === `reward-${level}`)
    ),
  };
  return withTouch(next);
}

export function togglePokemonFavorite(state: PokeRemGameState, id: string): PokeRemGameState {
  const update = (p: OwnedPokemon) => (p.id === id ? { ...p, favorite: !p.favorite } : p);
  return withTouch({
    ...state,
    party: state.party.map(update),
    storagePokemon: state.storagePokemon.map(update),
  });
}
