import { STORAGE_FULL_MESSAGE, catchBlockedByStorage, fitFoundItems } from '../../engine/capacity';
import { formatCoins } from '../../../ui/format/coins';
import { resolveExchange, TRAINER_FOE_DAMAGE_SCALE } from '../../engine/moveMechanics';
import { ITEM_BY_ID, type ItemId } from '../../data/items';
import { dedupeMoveIds, getInitialMoves, movesetForBattle } from '../../engine/moveLearn';
import { xpFromPlayerAttack, xpFromTakingHit } from '../../engine/combatXp';
import { xpDoublerItemForTier } from '../../engine/xpDoublers';
import { isBuddy, scaledXp, splitKnockoutXp } from '../../engine/xpShare';
import { BALANCE } from '../../balance';
import {
  averageOwnedPartyLevel,
  generateTrainer,
  generateTrainerRewards,
  trainerCatchChance,
  trainerEnemyAsEncounter,
} from '../../engine/trainerBattles';
import { chooseFoeMove } from '../../engine/foeAi';
import {
  LEADER_LEVEL_BONUS,
  generateRocketGrunt,
  generateRocketLeader,
  gruntRewards,
  isLeaderNext,
  leaderCoins,
  nextGruntType,
  rocketAfterWin,
  rollLeaderPrize
} from '../../engine/rocket';
import type {
  EncounterPokemon,
  PokeRemGameState,
  OwnedPokemon,
  RocketBattleInfo,
  TrainerBattleState,
  TrainerEnemyMon,
  TrainerIdentity,
  TrainerRewardSnapshot,
  TrainerBattleStats,
  TrainerTier,
} from '../model';
import {
  TRAINER_KO_XP_MULT,
  activePokemon,
  addTrainerXp,
  applyTypeShareXpBoost,
  bestMoveAgainst,
  grantCatch,
  growPokemonWithXp,
  knockoutXp,
  withTouch,
} from './core';
import { bumpBattleOutcome, createInitialTrainerBattleStats } from './persistence';
import { pokemonCenterCost } from './economy';

/**
 * Spawn a trainer battle in `team_select` phase. Generates archetype, identity, and 3 enemies
 * scaled to the player's average party level; respects enabled generations.
 *
 * Idempotent: returns state unchanged if a trainer battle is already in progress, a wild encounter
 * is active, or the player hasn't picked a starter yet.
 */
export function startTrainerBattle(
  state: PokeRemGameState,
  tier: TrainerTier,
  enabledGens: number[],
  rng: () => number = Math.random
): PokeRemGameState {
  if (state.currentTrainerBattle || state.currentEncounter) return state;
  if (!state.starterChosen || state.party.length === 0) return state;
  const avgLevel = averageOwnedPartyLevel(state.party);
  const { identity, enemies } = generateTrainer({
    tier,
    enabledGens: enabledGens && enabledGens.length > 0 ? enabledGens : [1],
    averageLevel: avgLevel,
    rng,
  });
  return beginTrainerBattle(state, tier, identity, enemies, rng);
}

/**
 * Spawn a Team Rocket battle: the Rocket Leader once the Radar is full, else a one-type grunt whose type
 * hasn't been beaten this cycle (SPEC A9). Same guards as {@link startTrainerBattle}.
 */
export function startRocketBattle(
  state: PokeRemGameState,
  enabledGens: number[],
  rng: () => number = Math.random
): PokeRemGameState {
  if (state.currentTrainerBattle || state.currentEncounter) return state;
  if (!state.starterChosen || state.party.length === 0) return state;
  const gens = enabledGens && enabledGens.length > 0 ? enabledGens : [1];
  const avgLevel = averageOwnedPartyLevel(state.party);
  if (isLeaderNext(state)) {
    const { identity, enemies } = generateRocketLeader(avgLevel, gens, rng);
    const prize = rollLeaderPrize(avgLevel + LEADER_LEVEL_BONUS, gens, state.collectionDex, rng);
    return beginTrainerBattle(state, 'elite', identity, enemies, rng, { kind: 'leader' }, prize);
  }
  const type = nextGruntType(state.rocket, gens, rng);
  const { identity, enemies } = generateRocketGrunt(type, avgLevel, gens, state.collectionDex, rng);
  return beginTrainerBattle(state, 'standard', identity, enemies, rng, { kind: 'grunt', type });
}

function beginTrainerBattle(
  state: PokeRemGameState,
  tier: TrainerTier,
  identity: TrainerIdentity,
  enemies: TrainerEnemyMon[],
  rng: () => number,
  rocket?: RocketBattleInfo,
  prize?: EncounterPokemon
): PokeRemGameState {
  const battle: TrainerBattleState = {
    id: `tb_${Date.now()}_${Math.floor(rng() * 1e6)}`,
    phase: 'team_select',
    tier,
    trainer: identity,
    enemies,
    activeEnemyIndex: 0,
    selectedPartyIds: [],
    faintedSelectedIds: [],
    catchOfferActive: false,
    catchOfferClaimed: false,
    feedbackSeq: 0,
    ...(rocket ? { rocket } : {}),
    ...(prize ? { prize } : {}),
  };
  const who = `${identity.className}${identity.displayName ? ' ' + identity.displayName : ''}`;
  const typed = rocket?.kind === 'grunt' && rocket.type ? ` (${rocket.type})` : '';
  return withTouch({
    ...state,
    currentTrainerBattle: battle,
    trainerBattleCounter: 0,
    selectedTab: 'status',
    ...bumpBattleOutcome(state, 'spawn', `${who}${typed} challenges you!`),
  });
}

/** Coins, items and trainer XP for beating Team Rocket (SPEC Appendix R). */
function rocketRewards(rocket: RocketBattleInfo, averageLevel: number, rng: () => number): TrainerRewardSnapshot {
  if (rocket.kind === 'leader') {
    return { coins: leaderCoins(rng), trainerXp: 150, items: {}, headline: 'The Rocket Leader is beaten! The Leader’s prize awaits.' };
  }
  const loot = gruntRewards(averageLevel, rng);
  return {
    coins: loot.coins + loot.cache,
    trainerXp: 60,
    items: loot.items,
    headline: loot.cache > 0 ? `You found a Rocket cache worth ${formatCoins(loot.cache)}!` : 'The grunt retreats! Catch their ace?',
  };
}

/**
 * Lock in three party Pokémon for the trainer battle and transition to `active`. Validates that
 * each id is in the party and not fainted; auto-fills with available battle-ready party members
 * if fewer than 3 valid ids are supplied (ensures the fight always starts).
 */
export function lockTrainerTeam(state: PokeRemGameState, ids: string[]): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'team_select') return state;
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const mon = state.party.find((p) => p.id === id);
    if (!mon || mon.currentHp <= 0) continue;
    seen.add(id);
    picked.push(id);
    if (picked.length === 3) break;
  }
  if (picked.length < 3) {
    for (const p of state.party) {
      if (picked.length >= 3) break;
      if (seen.has(p.id) || p.currentHp <= 0) continue;
      seen.add(p.id);
      picked.push(p.id);
    }
  }
  if (picked.length === 0) return state;
  const lead = picked[0]!;
  return withTouch({
    ...state,
    activePokemonId: lead,
    currentTrainerBattle: {
      ...battle,
      phase: 'active',
      selectedPartyIds: picked,
      activeEnemyIndex: 0,
      feedbackSeq: battle.feedbackSeq + 1,
      lastLog: `${battle.trainer.className} sent out ${battle.enemies[0]?.name ?? 'their first Pokémon'}!`,
    },
  });
}

/** Find next non-fainted, selected party id (cycles forward from current lead). */
function nextSelectedPartyId(
  battle: TrainerBattleState,
  party: OwnedPokemon[],
  startId: string | null
): string | null {
  const order = battle.selectedPartyIds;
  if (order.length === 0) return null;
  const startIdx = startId ? order.indexOf(startId) : -1;
  for (let i = 1; i <= order.length; i++) {
    const id = order[(startIdx + i + order.length) % order.length]!;
    if (battle.faintedSelectedIds.includes(id)) continue;
    const mon = party.find((p) => p.id === id);
    if (!mon || mon.currentHp <= 0) continue;
    return id;
  }
  return null;
}

/**
 * One trainer-battle combat exchange: player chosen mon strikes the active enemy; if it survives,
 * the enemy strikes back. Drives KOs, enemy advancement, party fainting (no switching back),
 * and final win/loss resolution.
 */
export function applyTrainerCombatTurn(state: PokeRemGameState, moveId?: string): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'active') return state;

  let aid = state.activePokemonId;
  if (!aid || !battle.selectedPartyIds.includes(aid)) {
    const next = nextSelectedPartyId(battle, state.party, null);
    if (!next) return resolveTrainerBattle(state, 'loss');
    aid = next;
  }
  const activeIdx = state.party.findIndex((p) => p.id === aid);
  if (activeIdx < 0) return resolveTrainerBattle(state, 'loss');
  const active = state.party[activeIdx]!;
  if (active.currentHp <= 0) {
    return continueAfterPartyFaint(state, battle, aid!);
  }

  const enemy = battle.enemies[battle.activeEnemyIndex];
  if (!enemy || enemy.defeated || enemy.currentHp <= 0) {
    return advanceEnemyOrFinish(state, battle);
  }

  const legalMoves = movesetForBattle(active);
  if (legalMoves.length === 0) return state;
  let chosen: string;
  if (moveId) {
    if (!legalMoves.includes(moveId)) return state;
    chosen = moveId;
  } else {
    const pick = bestMoveAgainst(active, enemy, legalMoves);
    if (!pick) return state;
    chosen = pick;
  }

  const enemyMoves = dedupeMoveIds(
    enemy.moves?.length ? enemy.moves : getInitialMoves(enemy.dexNum, enemy.level)
  );
  const wMoveId = chooseFoeMove(
    enemy,
    active,
    enemyMoves,
    Math.random,
    battle.tier === 'elite' ? 'elite' : 'trainer'
  );
  const exchange = resolveExchange(
    { ...active, isBuddy: isBuddy(state, active) },
    enemy,
    chosen,
    wMoveId,
    `trainer:${battle.id}`,
    Math.random,
    false,
    TRAINER_FOE_DAMAGE_SCALE
  );
  // XP Share: the lead keeps 60% of the knockout XP, the bench shares the rest; hit XP is the lead's.
  const koShares =
    exchange.wild.currentHp <= 0
      ? splitKnockoutXp(Math.round(knockoutXp(enemy, active) * TRAINER_KO_XP_MULT), state.party, active.id)
      : new Map<string, number>();
  const hitXp =
    (xpFromPlayerAttack({ damage: exchange.pDamage, moveId: chosen, defenderTypes: enemy.types }) +
      xpFromTakingHit({
        damage: exchange.wDamage,
        wildMoveId: wMoveId,
        playerTypes: active.types,
      })) *
    BALANCE.xp.fightMult;
  const xp = scaledXp(state, active, hitXp + (koShares.get(active.id) ?? 0));
  const grown = growPokemonWithXp(active, xp).pokemon;
  const party = state.party.map((p, i) => {
    if (i === activeIdx) return { ...grown, currentHp: exchange.player.currentHp, condition: exchange.player.condition };
    const share = koShares.get(p.id) ?? 0;
    return share > 0 ? growPokemonWithXp(p, scaledXp(state, p, share)).pokemon : p;
  });
  const enemies = battle.enemies.map((e, i) =>
    i === battle.activeEnemyIndex
      ? {
          ...e,
          currentHp: exchange.wild.currentHp,
          condition: exchange.wild.condition,
          defeated: exchange.wild.currentHp <= 0,
        }
      : e
  );
  const updated = {
    ...battle,
    enemies,
    lastLog: exchange.log,
    feedbackSeq: battle.feedbackSeq + 1,
  };
  let next = { ...state, party, currentTrainerBattle: updated };
  if (exchange.player.currentHp <= 0) {
    const faintedSelectedIds = [...new Set([...battle.faintedSelectedIds, aid!])];
    const afterFaint = {
      ...updated,
      faintedSelectedIds,
      lastLog: `${exchange.log} ${active.nickname || active.name} fainted!`,
    };
    return continueAfterPartyFaint({ ...next, currentTrainerBattle: afterFaint }, afterFaint, aid!);
  }
  if (exchange.wild.currentHp <= 0) {
    const boost = applyTypeShareXpBoost(
      next.party,
      next.storagePokemon,
      enemy.types,
      active.id,
      enemy.level,
      state
    );
    next = { ...next, party: boost.party, storagePokemon: boost.storagePokemon };
    return advanceEnemyOrFinish(next, updated);
  }
  return withTouch(next);
}

/** Bring out the next selected party Pokémon, or end the battle in defeat if none remain. */
function continueAfterPartyFaint(
  state: PokeRemGameState,
  battle: TrainerBattleState,
  faintedId: string
): PokeRemGameState {
  const next = nextSelectedPartyId(battle, state.party, faintedId);
  if (!next) {
    return resolveTrainerBattle(state, 'loss');
  }
  return withTouch({
    ...state,
    activePokemonId: next,
    currentTrainerBattle: {
      ...battle,
      lastLog: `Go, ${state.party.find((p) => p.id === next)?.nickname ?? state.party.find((p) => p.id === next)?.name ?? 'next'}!`,
      feedbackSeq: battle.feedbackSeq + 1,
    },
  });
}

/** Advance to the next enemy slot (or end in victory if all are KO'd). */
function advanceEnemyOrFinish(
  state: PokeRemGameState,
  battle: TrainerBattleState
): PokeRemGameState {
  const nextIdx = battle.enemies.findIndex(
    (e, i) => i > battle.activeEnemyIndex && !e.defeated && e.currentHp > 0
  );
  if (nextIdx === -1) {
    const anyAlive = battle.enemies.some((e) => !e.defeated && e.currentHp > 0);
    if (!anyAlive) return resolveTrainerBattle(state, 'win');
    return state;
  }
  const enemy = battle.enemies[nextIdx]!;
  return withTouch({
    ...state,
    currentTrainerBattle: {
      ...battle,
      activeEnemyIndex: nextIdx,
      lastLog: `${battle.trainer.className} sent out ${enemy.name}!`,
      feedbackSeq: battle.feedbackSeq + 1,
    },
  });
}

/**
 * Finalize a trainer battle. On `win`, generates rewards (coins/items/trainer XP/optional XP doubler),
 * applies them to state, and surfaces a catch offer. On `loss`, leaves party HP/faint states intact.
 */
/** Losing to a trainer costs a little: 5% of your coins, capped by party level (main-series style). */
export function trainerLossFee(state: PokeRemGameState): number {
  const cap = 40 * averageOwnedPartyLevel(state.party);
  return Math.max(0, Math.min(cap, Math.floor((state.currency ?? 0) * 0.05)));
}

export function resolveTrainerBattle(
  state: PokeRemGameState,
  outcome: 'win' | 'loss',
  rng: () => number = Math.random
): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle) return state;
  if (battle.phase === 'post_win' || battle.phase === 'post_loss') return state;

  const stats = state.trainerBattleStats ?? createInitialTrainerBattleStats();
  const isElite = battle.tier === 'elite';

  if (outcome === 'loss') {
    const updatedStats: TrainerBattleStats = {
      ...stats,
      standardLost: stats.standardLost + (isElite ? 0 : 1),
      eliteLost: stats.eliteLost + (isElite ? 1 : 0),
      currentWinStreak: 0,
    };
    const post: TrainerBattleState = {
      ...battle,
      phase: 'post_loss',
      lastLog: battle.trainer.victoryLine,
      feedbackSeq: battle.feedbackSeq + 1,
    };
    const fee = trainerLossFee(state);
    return withTouch({
      ...state,
      currency: Math.max(0, (state.currency ?? 0) - fee),
      currentTrainerBattle: post,
      trainerBattleStats: updatedStats,
      ...bumpBattleOutcome(
        state,
        'faint',
        fee > 0
          ? `Defeated by ${battle.trainer.className}. You paid ${formatCoins(fee)} to the winner.`
          : `Defeated by ${battle.trainer.className}. Better luck next session.`
      ),
    });
  }

  const avgLevel = averageOwnedPartyLevel(state.party);
  const reward = battle.rocket ? rocketRewards(battle.rocket, avgLevel, rng) : generateTrainerRewards(battle.tier, avgLevel, rng);
  const found: Partial<Record<string, number>> = { ...reward.items };
  if (reward.xpDoublerTier) {
    const doublerItem = xpDoublerItemForTier(reward.xpDoublerTier);
    found[doublerItem] = (found[doublerItem] ?? 0) + 1;
  }
  const fit = fitFoundItems(state, found);
  const bag = fit.bag;

  const newStreak = stats.currentWinStreak + 1;
  const updatedStats: TrainerBattleStats = {
    ...stats,
    standardWon: stats.standardWon + (isElite ? 0 : 1),
    eliteWon: stats.eliteWon + (isElite ? 1 : 0),
    totalWon: stats.totalWon + 1,
    currentWinStreak: newStreak,
    longestWinStreak: Math.max(stats.longestWinStreak, newStreak),
  };

  const isLeader = battle.rocket?.kind === 'leader';
  const post: TrainerBattleState = {
    ...battle,
    phase: 'post_win',
    // The Leader's team can't be caught: the prize appears when you close the battle.
    catchOfferActive: !isLeader,
    catchOfferClaimed: false,
    rewardSnapshot: reward,
    lastLog: battle.trainer.defeatLine,
    feedbackSeq: battle.feedbackSeq + 1,
  };

  const subline = [
    `+${formatCoins(reward.coins)}`,
    reward.xpDoublerTier
      ? `${reward.xpDoublerTier === 'rare' ? 'Rare' : reward.xpDoublerTier === 'legendary' ? 'Legendary' : 'Common'} XP Doubler`
      : '',
    `+${reward.trainerXp} TR XP`,
    fit.converted > 0 ? `Bag full → ${formatCoins(fit.coins)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const noticeQueue = [...(state.mainNoticeQueue ?? [])];
  noticeQueue.push({
    kind: 'trainer_battle_result',
    id: `tb_result_${battle.id}`,
    title: isLeader ? 'Rocket Leader defeated!' : battle.rocket ? 'Rocket Grunt defeated!' : isElite ? `Elite Trainer defeated!` : `Trainer defeated!`,
    subtitle: subline.slice(0, 220),
  });

  return withTouch(
    addTrainerXp(
      {
        ...state,
        bag,
        currency: (state.currency ?? 0) + reward.coins + fit.coins,
        totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + reward.coins + fit.coins,
        currentTrainerBattle: post,
        trainerBattleStats: updatedStats,
        mainNoticeQueue: noticeQueue.slice(-12),
        ...(battle.rocket ? { rocket: rocketAfterWin(state.rocket, battle.rocket.kind, battle.rocket.type) } : {}),
        ...bumpBattleOutcome(
          state,
          'defeat',
          `${battle.trainer.className} was defeated! ${reward.headline}`
        ),
      },
      reward.trainerXp
    )
  );
}

/**
 * Attempt to catch one of the three defeated enemies (post-win pick). Mirrors wild-catch rules:
 * on a miss the ball is consumed but the offer stays active so the player can try again (with
 * the same or a different Pokémon, or buy more balls from the shop). On a successful catch the
 * offer is marked `catchOfferClaimed` and the Pokémon is added to the collection.
 */
export function claimTrainerCatch(
  state: PokeRemGameState,
  enemyIndex: number,
  ball: 'poke-ball' | 'great-ball' | 'ultra-ball' = 'poke-ball'
): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'post_win') return state;
  if (!battle.catchOfferActive || battle.catchOfferClaimed) return state;
  if (enemyIndex < 0 || enemyIndex >= battle.enemies.length) return state;
  // A grunt only offers its ace.
  if (battle.rocket?.kind === 'grunt' && enemyIndex !== battle.enemies.length - 1) return state;
  const ballCount = state.bag[ball] ?? 0;
  if (ballCount <= 0) return state;
  const enemy = battle.enemies[enemyIndex]!;
  if (catchBlockedByStorage(state, enemy)) {
    return withTouch({ ...state, currentTrainerBattle: { ...battle, feedbackSeq: battle.feedbackSeq + 1, lastLog: STORAGE_FULL_MESSAGE } });
  }
  const active = activePokemon(state);
  const chance = trainerCatchChance(enemy, active, ball, battle.tier);
  const success = Math.random() < chance;
  const bag: Record<ItemId, number> = { ...state.bag, [ball]: Math.max(0, ballCount - 1) };
  if (!success) {
    // Miss: consume the ball, bump feedback, leave the catch offer open so the player can retry.
    const stillOpen: TrainerBattleState = {
      ...battle,
      catchOfferActive: true,
      catchOfferClaimed: false,
      feedbackSeq: battle.feedbackSeq + 1,
      lastLog: `${enemy.name} broke free!`,
    };
    return withTouch({ ...state, bag, currentTrainerBattle: stillOpen });
  }

  const closed: TrainerBattleState = {
    ...battle,
    catchOfferActive: false,
    catchOfferClaimed: true,
    feedbackSeq: battle.feedbackSeq + 1,
    lastLog: `${enemy.name} was caught!`,
  };

  return grantCatch(
    { ...state, bag, currentTrainerBattle: closed },
    trainerEnemyAsEncounter(enemy)
  );
}

/**
 * Player gives up on the post-win catch offer without actually throwing. Closes the catch window
 * but keeps the rest of the post-win banner visible so the player can still review rewards and
 * then head back to studying.
 */
export function dismissTrainerCatchOffer(state: PokeRemGameState): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'post_win') return state;
  if (!battle.catchOfferActive) return state;
  return withTouch({
    ...state,
    currentTrainerBattle: {
      ...battle,
      catchOfferActive: false,
      catchOfferClaimed: true,
      feedbackSeq: battle.feedbackSeq + 1,
      lastLog: 'Walked away from the catch offer.',
    },
  });
}

/** Close the trainer battle popup and return to studying. */
export function closeTrainerBattle(state: PokeRemGameState): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle) return state;
  if (battle.phase === 'post_win' && battle.prize) {
    // Beating the Rocket Leader: the prize legendary appears, and waits until you catch it or give up.
    return withTouch({
      ...state,
      currentTrainerBattle: null,
      currentEncounter: { ...battle.prize, pendingPrize: true },
      wildIdleCards: 0,
      selectedTab: 'status',
      ...bumpBattleOutcome(state, 'spawn', `THE LEADER’S PRIZE: ${battle.prize.name} appeared!`),
    });
  }
  return withTouch({
    ...state,
    currentTrainerBattle: null,
    selectedTab: state.selectedTab === 'status' ? 'status' : state.selectedTab,
  });
}

/** Coins a rematch costs after a loss: a full Pokémon Center heal of the party. */
export function trainerRematchCost(state: PokeRemGameState): number {
  return state.currentTrainerBattle?.phase === 'post_loss' ? pokemonCenterCost(state) : 0;
}

/**
 * After a loss, heal the party at the Center and face the same trainer again with fresh enemy HP.
 * Returns the state unchanged when there was no loss or the heal can't be afforded.
 */
export function rematchTrainer(state: PokeRemGameState): PokeRemGameState {
  const battle = state.currentTrainerBattle;
  if (!battle || battle.phase !== 'post_loss') return state;
  const cost = pokemonCenterCost(state);
  if ((state.currency ?? 0) < cost) return state;
  return withTouch({
    ...state,
    currency: (state.currency ?? 0) - cost,
    party: state.party.map((p) => ({ ...p, currentHp: p.maxHp, condition: undefined })),
    currentTrainerBattle: {
      ...battle,
      phase: 'team_select',
      enemies: battle.enemies.map((e) => ({ ...e, currentHp: e.maxHp, condition: undefined })),
      activeEnemyIndex: 0,
      selectedPartyIds: [],
      faintedSelectedIds: [],
      catchOfferActive: false,
      catchOfferClaimed: false,
      lastLog: `${battle.trainer.className} accepts your rematch!`,
      feedbackSeq: battle.feedbackSeq + 1,
    },
    ...bumpBattleOutcome(state, 'spawn', `Rematch against ${battle.trainer.className}!`),
  });
}
