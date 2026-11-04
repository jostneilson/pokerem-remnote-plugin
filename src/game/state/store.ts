/**
 * Game-state reducers. Each domain lives in ./reducers; this module re-exports the public API
 * so callers keep importing from 'state/store'.
 */
export {
  createInitialStateV4,
  createInitialStateV3,
  createInitialStateV2,
  createInitialTrainerBattleStats,
  parseGameState,
  registerOwnedSpecies,
} from './reducers/persistence';
export {
  dismissBattleResult,
  dismissMainNotice,
  setTab,
  activePokemon,
  applyTypeShareXpBoost,
  isTrainerBattleActive,
  hasTrainerBattle,
  acknowledgeWhatsNew,
  xpProgressPercent,
} from './reducers/core';
export type { QueueCardCompleteOptions, TypeShareXpResult } from './reducers/core';
export {
  clearBattleLog,
  acknowledgeRouteFindNotice,
  onQueueCardComplete,
  activateXpDoubler,
  tickXpDoublerOnCard,
  consumeCatchScopeScan,
  configureStudyDifficulty,
  rollStudyCashBonus,
} from './reducers/encounter';
export {
  catchEncounter,
  resolvePendingCaughtReplace,
  cancelPendingCaught,
  applyCombatTurn,
  defeatEncounter,
  runFromEncounter,
  switchActivePokemon,
} from './reducers/battle';
export type { DefeatFinisher } from './reducers/battle';
export {
  startTrainerBattle,
  startRocketBattle,
  lockTrainerTeam,
  applyTrainerCombatTurn,
  trainerLossFee,
  resolveTrainerBattle,
  claimTrainerCatch,
  dismissTrainerCatchOffer,
  closeTrainerBattle,
  trainerRematchCost,
  rematchTrainer,
} from './reducers/trainer';
export {
  useHealingItem,
  useLeadUtilityItem,
  buyItem,
  teachTutorMove,
  buyRouteTicket,
  buyCardStyle,
  equipCardStyle,
  useEvolutionStone,
  powerUpPokemon,
  useBottleCap,
  nextHealthyPartyMember,
  quickReviveLead,
  bestPotionForLead,
  bestHealItemFor,
  quickHealPokemon,
  quickHealLead,
  pokemonCenterCost,
  pokemonCenterHeal,
  QUICK_BALL_COUNT,
  quickBuyBalls,
} from './reducers/economy';
export type { TrainableIv } from './reducers/economy';
export {
  claimQuest,
  claimAllQuests,
  chooseStarter,
  setAutoMoves,
  forgetMoveAction,
  learnMoveAction,
  renamePokemon,
  releasePokemon,
  moveToStorage,
  moveToParty,
  swapPartyWithStorage,
  claimAchievement,
  claimAllAchievements,
  pendingRewardCount,
  claimMainNotice,
  claimAllTrainerRewards,
  claimAllRewards,
  claimTrainerReward,
  togglePokemonFavorite,
} from './reducers/collection';
