import { planAutoAttack } from './engine/autoAttack';
import { recommendedBall, type CatchBall } from './engine/encounters';
import { applyQueueAction } from './queueActions';
import type { PokeRemGameState } from './state/model';
import * as store from './state/store';

/*
 * Every state change a widget makes is a named command with plain-data arguments, so it can be sent to the
 * plugin host and applied there in the same serial queue as card reviews (see commandChannel.ts). Widgets run
 * in separate iframes, and a per-iframe lock can't stop two of them overwriting each other's save.
 */

/** Use a bag item on a Pokémon: candies go through the utility path, everything else heals. */
function useBagItem(state: PokeRemGameState, itemId: string, targetId?: string): PokeRemGameState {
  return itemId === 'rare-candy' || itemId === 'exp-candy-s'
    ? store.useLeadUtilityItem(state, itemId, targetId)
    : store.useHealingItem(state, itemId as Parameters<typeof store.useHealingItem>[1], targetId);
}

/** Throw `ball`, or the recommended one when none is given. */
function catchWithBall(state: PokeRemGameState, ball?: CatchBall): PokeRemGameState {
  if (!state.currentEncounter) return state;
  return store.catchEncounter(state, ball ?? recommendedBall(state.bag, state.currentEncounter, store.activePokemon(state)));
}

/**
 * One Auto attack turn, only if the lead and encounter are still the ones the player saw.
 * `expectedEncounter` is the JSON of the encounter when the turn was planned.
 */
function autoAttackStep(state: PokeRemGameState, expectedActiveId: string, expectedEncounter: string): PokeRemGameState {
  if (state.activePokemonId !== expectedActiveId || JSON.stringify(state.currentEncounter) !== expectedEncounter) return state;
  const plan = planAutoAttack(state);
  return plan.moveId ? store.applyCombatTurn(state, plan.moveId, true) : state;
}

export const GAME_COMMANDS = {
  acknowledgeRouteFindNotice: store.acknowledgeRouteFindNotice,
  acknowledgeWhatsNew: store.acknowledgeWhatsNew,
  activateXpDoubler: store.activateXpDoubler,
  applyCombatTurn: store.applyCombatTurn,
  applyTrainerCombatTurn: store.applyTrainerCombatTurn,
  autoAttackStep,
  buyCardStyle: store.buyCardStyle,
  buyItem: store.buyItem,
  buyRouteTicket: store.buyRouteTicket,
  cancelPendingCaught: store.cancelPendingCaught,
  catchWithBall,
  chooseStarter: store.chooseStarter,
  claimAchievement: store.claimAchievement,
  claimAllAchievements: store.claimAllAchievements,
  claimAllQuests: store.claimAllQuests,
  claimAllRewards: store.claimAllRewards,
  claimAllTrainerRewards: store.claimAllTrainerRewards,
  claimMainNotice: store.claimMainNotice,
  claimQuest: store.claimQuest,
  claimTrainerCatch: store.claimTrainerCatch,
  claimTrainerReward: store.claimTrainerReward,
  closeTrainerBattle: store.closeTrainerBattle,
  configureStudyDifficulty: store.configureStudyDifficulty,
  consumeCatchScopeScan: store.consumeCatchScopeScan,
  dismissBattleResult: store.dismissBattleResult,
  dismissMainNotice: store.dismissMainNotice,
  dismissTrainerCatchOffer: store.dismissTrainerCatchOffer,
  equipCardStyle: store.equipCardStyle,
  forgetMoveAction: store.forgetMoveAction,
  learnMoveAction: store.learnMoveAction,
  lockTrainerTeam: store.lockTrainerTeam,
  moveToParty: store.moveToParty,
  moveToStorage: store.moveToStorage,
  pokemonCenterHeal: store.pokemonCenterHeal,
  powerUpPokemon: store.powerUpPokemon,
  queueAction: applyQueueAction,
  quickBuyBalls: store.quickBuyBalls,
  quickHealLead: store.quickHealLead,
  quickHealPokemon: store.quickHealPokemon,
  quickReviveLead: store.quickReviveLead,
  releasePokemon: store.releasePokemon,
  rematchTrainer: store.rematchTrainer,
  renamePokemon: store.renamePokemon,
  resolvePendingCaughtReplace: store.resolvePendingCaughtReplace,
  runFromEncounter: store.runFromEncounter,
  setAutoMoves: store.setAutoMoves,
  setTab: store.setTab,
  swapPartyWithStorage: store.swapPartyWithStorage,
  switchActivePokemon: store.switchActivePokemon,
  teachTutorMove: store.teachTutorMove,
  togglePokemonFavorite: store.togglePokemonFavorite,
  transferPokemon: store.transferPokemon,
  useBagItem,
  useBottleCap: store.useBottleCap,
  useEvolutionStone: store.useEvolutionStone
};

export type GameCommandName = keyof typeof GAME_COMMANDS;
type Rest<F> = F extends (state: PokeRemGameState, ...args: infer A) => PokeRemGameState ? A : never;
export type GameCommandArgs<N extends GameCommandName> = Rest<(typeof GAME_COMMANDS)[N]>;

/** A command as it travels between iframes: a registry name and plain-data arguments. */
export type GameCommand = { name: GameCommandName; args: unknown[] };

export function gameCommand<N extends GameCommandName>(name: N, ...args: GameCommandArgs<N>): GameCommand {
  return { name, args };
}

export function isGameCommand(value: unknown): value is GameCommand {
  if (!value || typeof value !== 'object') return false;
  const v = value as { name?: unknown; args?: unknown };
  return typeof v.name === 'string' && Object.prototype.hasOwnProperty.call(GAME_COMMANDS, v.name) && Array.isArray(v.args);
}

/** Apply one command. Unknown names leave the state untouched. */
export function applyGameCommand(state: PokeRemGameState, command: GameCommand): PokeRemGameState {
  if (!isGameCommand(command)) return state;
  const fn = GAME_COMMANDS[command.name] as (s: PokeRemGameState, ...args: unknown[]) => PokeRemGameState;
  return fn(state, ...command.args);
}
