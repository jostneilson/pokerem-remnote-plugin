import { storageCap } from '../game/engine/capacity';
import { EvolutionScene, useEvolutionWatcher } from '../ui/battle/EvolutionScene';
import '../style.css';
import { SidebarNavigation } from '../ui/components/SidebarNavigation';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppEvents, renderWidget, useAPIEventListener, useOnMessageBroadcast, usePlugin } from '@remnote/plugin-sdk';
import { usePokeRemBattleActions } from '../hooks/usePokeRemBattleActions';
import { REVIEWS_PER_ENCOUNTER, STORAGE_KEY, SYNC_BROADCAST_KEY, getSyncedGameRaw } from '../game/constants';
import { POKEREM_AUTHOR } from '../releaseMeta';
import { submitGameCommands } from '../game/commandChannel';
import { gameCommand, type GameCommand } from '../game/commands';
import {
  chooseStarter,
  claimAchievement,
  configureStudyDifficulty,
  createInitialStateV3,
  parseGameState,
  setTab,
  switchActivePokemon,
  useHealingItem,
  quickHealPokemon,
  dismissBattleResult,
  setAutoMoves,
  useEvolutionStone,
  powerUpPokemon,
  togglePokemonFavorite,
  useLeadUtilityItem,
  activePokemon,
  forgetMoveAction,
  learnMoveAction,
  renamePokemon,
  releasePokemon,
  moveToStorage,
  moveToParty,
  swapPartyWithStorage,
  buyItem,
  buyRouteTicket,
  buyCardStyle,
  equipCardStyle,
  teachTutorMove,
  useBottleCap,
  claimAllQuests,
  claimQuest,
  claimTrainerReward,
  claimAllTrainerRewards,
  rematchTrainer,
  trainerRematchCost,
  resolvePendingCaughtReplace,
  cancelPendingCaught,
  consumeCatchScopeScan,
  acknowledgeRouteFindNotice,
  dismissMainNotice,
  claimMainNotice,
  claimAllRewards,
  pendingRewardCount,
  lockTrainerTeam,
  applyTrainerCombatTurn,
  claimTrainerCatch,
  dismissTrainerCatchOffer,
  closeTrainerBattle,
  activateXpDoubler,
  claimAllAchievements,
  acknowledgeWhatsNew,
} from '../game/state/store';
import type { PokeRemGameState, SectionTab } from '../game/state/model';
import { StarterPickerScreen } from '../ui/screens/StarterPickerScreen';
import { StudyDifficultyScreen } from '../ui/screens/StudyDifficultyScreen';
import { StatusScreen } from '../ui/screens/StatusScreen';
import { PartyScreen } from '../ui/screens/PartyScreen';
import { ItemsScreen } from '../ui/screens/ItemsScreen';
const CollectionScreen = lazy(() =>
  import('../ui/screens/CollectionScreen').then((m) => ({ default: m.CollectionScreen })),
);
const ProgressScreen = lazy(() =>
  import('../ui/screens/ProgressScreen').then((m) => ({ default: m.ProgressScreen })),
);
import { SettingsScreen } from '../ui/screens/SettingsScreen';
const TypeChartScreen = lazy(() =>
  import('../ui/screens/TypeChartScreen').then((m) => ({ default: m.TypeChartScreen })),
);
import { RewardsScreen } from '../ui/screens/RewardsScreen';
import { neutralizeBrokenRegisterCSS } from '../neutralizeRemNoteCssApi';
import { BattleReviewSurface } from '../ui/battle/BattleReviewSurface';
import { TrainerBattleSurface } from '../ui/battle/TrainerBattleSurface';
import { ULTRA_BALL_UNLOCK_LEVEL } from '../game/engine/shop';
import { WhatsNewCard } from '../ui/components/WhatsNewCard';
import { POKEREM_VERSION } from '../releaseMeta';
import { battleAmbienceCssVars, getBattleAmbience } from '../game/engine/battleAmbience';
import {
  getUnclaimedAchievements,
  allAchievementRewardsClaimed,
} from '../game/engine/achievements';
import { getUnclaimedRewards } from '../game/engine/trainerLevel';
import { OnboardingTipsBar } from '../ui/components/OnboardingTipsBar';
import { QuickCarePanel } from '../ui/components/QuickCarePanel';
const ALL_TABS: SectionTab[] = ['status', 'party', 'bag', 'shop', 'dex', 'types', 'progress', 'rewards'];


const ONBOARDING_TIPS_DISMISSED_KEY = 'pokerem.onboardingTipsDismissed';
/** The getting-started tip stops showing once a player has reviewed this many cards. */
const ONBOARDING_TIPS_MAX_CARDS = 30;
/** Empty first reads to retry (and the gap between them) before treating the save as new. */
const EMPTY_SAVE_RETRIES = 4;
const EMPTY_SAVE_RETRY_MS = 250;
function PokeRemSidebar() {
  const plugin = usePlugin();
  neutralizeBrokenRegisterCSS(plugin);
  const [state, setState] = useState<PokeRemGameState>(() => createInitialStateV3());
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [compact, setCompact] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => { void plugin.storage.getSession('pokerem.compactView').then((v) => setCompact(v === true)).catch(() => {}); }, [plugin]);
  const toggleCompact = () => { setCompact((v) => { const next = !v; void plugin.storage.setSession('pokerem.compactView', next).catch(() => {}); return next; }); };
  const [encounterRate, setEncounterRate] = useState(REVIEWS_PER_ENCOUNTER);
  const [encounterPacingModulo, setEncounterPacingModulo] = useState(1);
  const [pluginReviewWeight, setPluginReviewWeight] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showDailyHeaderStats, setShowDailyHeaderStats] = useState(true);
  const [onboardingTipsLoaded, setOnboardingTipsLoaded] = useState(false);
  const [onboardingTipsDismissed, setOnboardingTipsDismissed] = useState(false);

  const rewardsTabAttention = useMemo(() => {
    const claimed = state.claimedRewardLevels ?? [];
    return getUnclaimedRewards(state.trainerLevel ?? 1, claimed).length > 0;
  }, [state.trainerLevel, state.claimedRewardLevels]);

  const unclaimedAchievements = useMemo(
    () => getUnclaimedAchievements(state),
    [state.achievements, state.claimedAchievementIds],
  );

  const allAchievementsFullyClaimed = useMemo(() => allAchievementRewardsClaimed(state), [
    state.achievements,
    state.claimedAchievementIds,
  ]);

  /** Yellow tab glow only when at least one achievement reward is claimable (not for “close to goal” alone). */
  const progressTabGlow =
    !allAchievementsFullyClaimed && unclaimedAchievements.length > 0;

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        // Synced, so a dismissal survives restarts and other devices. Older builds kept it per session.
        const v =
          (await plugin.storage.getSynced(ONBOARDING_TIPS_DISMISSED_KEY)) === true ||
          (await plugin.storage.getSession(ONBOARDING_TIPS_DISMISSED_KEY)) === true;
        if (!cancel) {
          setOnboardingTipsDismissed(v);
          setOnboardingTipsLoaded(true);
        }
      } catch {
        if (!cancel) {
          setOnboardingTipsDismissed(false);
          setOnboardingTipsLoaded(true);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [plugin]);

  /** Full plugin root — width tracks RemNote’s sidebar pane for layout + ResizeObserver. */
  const sidebarRootRef = useRef<HTMLDivElement | null>(null);

  const battle = usePokeRemBattleActions(plugin, (next) => setState(next), state);

  const refreshFromStorage = useCallback(async () => {
    const raw = await getSyncedGameRaw(plugin);
    const s = parseGameState(raw);
    setState(s);
    setLoaded(true);
    return s;
  }, [plugin]);

  // First load: RemNote's synced storage can briefly read empty while it starts up, so an empty
  // read is retried before this is treated as a brand-new player (who would see the starter picker).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < EMPTY_SAVE_RETRIES; attempt++) {
        const raw = await getSyncedGameRaw(plugin);
        if ((raw != null && raw !== '') || cancelled) break;
        await new Promise((r) => window.setTimeout(r, EMPTY_SAVE_RETRY_MS));
      }
      if (!cancelled) await refreshFromStorage();
    })().catch(() => setSaveError('Could not load your save. Reopen the sidebar to retry.'));
    return () => {
      cancelled = true;
    };
  }, [plugin, refreshFromStorage]);

  useEffect(() => {
    if (!state.starterChosen || !state.studyDifficultyConfigured) return;
    const id = window.setInterval(() => void refreshFromStorage(), 2000);
    return () => window.clearInterval(id);
  }, [state.starterChosen, state.studyDifficultyConfigured, refreshFromStorage]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (mounted) await plugin.storage.setSession('pokerem.sidebarVisible', true);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      mounted = false;
      void (async () => {
        try {
          await plugin.storage.setSession('pokerem.sidebarVisible', false);
        } catch {
          /* non-fatal */
        }
      })();
    };
  }, [plugin]);

  useEffect(() => {
    (async () => {
      try {
        const rate = await plugin.settings.getSetting('pokerem.encounterRate');
        if (typeof rate === 'string') {
          const parsed = parseInt(rate, 10);
          if (!isNaN(parsed) && parsed >= 1) setEncounterRate(parsed);
        }
      } catch { /* use default */ }
    })();
  }, [plugin]);

  useEffect(() => {
    void (async () => {
      try {
        const pace = await plugin.settings.getSetting<string>('pokerem.encounterPacing');
        setEncounterPacingModulo(pace === 'every_2_reviews' ? 2 : 1);
      } catch {
        setEncounterPacingModulo(1);
      }
    })();
  }, [plugin]);

  useEffect(() => {
    void (async () => {
      try {
        const rq = await plugin.settings.getSetting<string>('pokerem.reviewProgress');
        if (rq === 'light') setPluginReviewWeight(0.75);
        else if (rq === 'half') setPluginReviewWeight(0.5);
        else setPluginReviewWeight(1);
      } catch {
        setPluginReviewWeight(1);
      }
    })();
  }, [plugin]);

  useEffect(() => {
    (async () => {
      try {
        const rm = await plugin.settings.getSetting<boolean>('pokerem.reducedMotion');
        setReducedMotion(rm === true);
      } catch { /* default off */ }
    })();
  }, [plugin]);

  useEffect(() => {
    (async () => {
      try {
        const v = await plugin.settings.getSetting<boolean>('pokerem.ui.showDailyHeaderStats');
        setShowDailyHeaderStats(v !== false);
      } catch {
        setShowDailyHeaderStats(true);
      }
    })();
  }, [plugin]);

  useAPIEventListener(AppEvents.StorageSyncedChange, STORAGE_KEY, () => {
    void refreshFromStorage();
  });

  /** Re-read after index finishes writing synced state (immediate refresh can race the write). */
  const bumpRefreshAfterQueueCard = useCallback(() => {
    void refreshFromStorage();
    window.setTimeout(() => void refreshFromStorage(), 48);
    window.setTimeout(() => void refreshFromStorage(), 160);
    window.setTimeout(() => void refreshFromStorage(), 420);
  }, [refreshFromStorage]);

  useAPIEventListener(AppEvents.QueueCompleteCard, undefined, bumpRefreshAfterQueueCard);

  useOnMessageBroadcast(SYNC_BROADCAST_KEY, () => {
    void refreshFromStorage();
  });

  /** Send one change to the plugin host (the single writer; see commandChannel.ts) and show the saved result. */
  const dispatch = async (command: GameCommand) => {
    if (savingRef.current || !loaded) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      setState(await submitGameCommands(plugin, [command]));
    } catch (error) {
      console.error('[PokéRem] Action save failed', error);
      setSaveError('That action could not be saved. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const active = activePokemon(state);
  const sidebarTab = state.selectedTab === 'battle' ? 'status' : state.selectedTab;
  // Rewards now lives inside the Trainer screen; saves that remember the old tab land there.
  const effectiveTab = sidebarTab === 'rewards' ? 'progress' : ALL_TABS.includes(sidebarTab) ? sidebarTab : 'status';
  useEffect(() => { if (showSettings || effectiveTab !== 'status') battle.stopAutoAttack(); }, [showSettings, effectiveTab, battle.stopAutoAttack]);
  const canCatch = (state.bag['poke-ball'] ?? 0) > 0 || (state.bag['great-ball'] ?? 0) > 0 || (state.bag['ultra-ball'] ?? 0) > 0;

  const ambienceStyle = battleAmbienceCssVars(getBattleAmbience(state.battleSceneIndex ?? 0));

  const dismissOnboardingTips = () => {
    setOnboardingTipsDismissed(true);
    void plugin.storage.setSynced(ONBOARDING_TIPS_DISMISSED_KEY, true).catch(() => undefined);
  };
  // Only for new players: anyone past their first few dozen cards already knows their way around.
  const showOnboardingTips =
    state.starterChosen &&
    state.studyDifficultyConfigured &&
    state.cardsReviewed < ONBOARDING_TIPS_MAX_CARDS &&
    onboardingTipsLoaded &&
    !onboardingTipsDismissed &&
    !showSettings;

  const effectiveEncounterRate = state.studyDifficultyConfigured
    ? state.studyReviewsPerEncounter
    : encounterRate;

  const wildReviewWeight = state.studyDifficultyConfigured ? state.studyCardWeight : pluginReviewWeight;

  const scrollAreaClass =
    'pkr-sidebar-scroll-body pkr-no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto';

  const renderSidebarScrollTail = () => (
    <>
      {state.whatsNewSeenVersion !== POKEREM_VERSION ? (
        <div className="mx-2 mt-2">
          <WhatsNewCard
            seenVersion={state.whatsNewSeenVersion}
            onDismiss={() => void dispatch(gameCommand('acknowledgeWhatsNew', POKEREM_VERSION))}
          />
        </div>
      ) : null}
      {showOnboardingTips ? (
        <OnboardingTipsBar
          onOpenSettings={() => {
            dismissOnboardingTips();
            setShowSettings(true);
          }}
          onDismiss={dismissOnboardingTips}
        />
      ) : null}

      <div className="pkr-seam shrink-0" />



      <div className="pkr-content-vignette min-w-0 shrink-0 p-2">
        <div key={showSettings ? 'settings' : `tab-${effectiveTab}`} className="pkr-panel-mount min-w-0">
          {showSettings ? (
            <SettingsScreen
              plugin={plugin}
              compact={compact}
              onToggleCompact={toggleCompact}
              onAfterGameReset={async () => {
                await refreshFromStorage();
                setShowSettings(false);
              }}
              studyProfile={{
                configured: state.studyDifficultyConfigured,
                preset: state.studyDifficultyPreset,
                reviews: state.studyReviewsPerEncounter,
                weight: state.studyCardWeight,
              }}
              onConfigureStudy={(preset, custom) =>
                void dispatch(gameCommand('configureStudyDifficulty', preset, custom))
              }
            />
          ) : (
            <Suspense fallback={<p className="py-4 text-center pkr-fine font-semibold" style={{ color: 'var(--pkr-ink-dim)' }}>Loading…</p>}>
              {effectiveTab === 'status' && active ? (
                <StatusScreen rootURL={plugin.rootURL} state={state} active={active} />
              ) : null}
              {effectiveTab === 'party' ? (
                <PartyScreen
                  rootURL={plugin.rootURL}
                  storageCap={storageCap(state)}
                  party={state.party}
                  starterId={state.starterId}
                  gameState={state}
                  onTransfer={(ids) => void dispatch(gameCommand('transferPokemon', ids))}
                  bag={state.bag}
                  currency={state.currency}
                  powerUpBlocked={!!state.currentEncounter || !!state.currentTrainerBattle || !!state.pendingCaughtMon}
                  onPowerUp={(id,level)=>void dispatch(gameCommand('powerUpPokemon', id,level))}
                  onToggleFavorite={(id)=>void dispatch(gameCommand('togglePokemonFavorite', id))}
                  evolutionBlocked={!!state.currentEncounter || !!state.currentTrainerBattle}
                  evolutionMessage={state.lastOutcomeKind === 'evolution' ? state.lastBattleLog : undefined}
                  onEvolve={(pid, item) => void dispatch(gameCommand('useEvolutionStone', pid, item))}
                  onBottleCap={(pid, item, stat) => void dispatch(gameCommand('useBottleCap', pid, item, stat))}
                  onTutor={(pid, moveId) => void dispatch(gameCommand('teachTutorMove', pid, moveId))}
                  onHeal={(pid) => void dispatch(gameCommand('quickHealPokemon', pid))}
                  onSetAutoMoves={(pid, on) => void dispatch(gameCommand('setAutoMoves', pid, on))}
                  healBlocked={!!state.currentTrainerBattle}
                  storagePokemon={state.storagePokemon}
                  activeId={state.activePokemonId}
                  onSwitch={(id) => void dispatch(gameCommand('switchActivePokemon', id))}
                  onForgetMove={(pid, mid) => void dispatch(gameCommand('forgetMoveAction', pid, mid))}
                  onLearnMove={(pid, mid, rep) => void dispatch(gameCommand('learnMoveAction', pid, mid, rep))}
                  onRename={(pid, name) => void dispatch(gameCommand('renamePokemon', pid, name))}
                  onRelease={(pid) => void dispatch(gameCommand('releasePokemon', pid))}
                  onMoveToStorage={(pid) => void dispatch(gameCommand('moveToStorage', pid))}
                  onMoveToParty={(pid) => void dispatch(gameCommand('moveToParty', pid))}
                  onSwapStorageForParty={(sid, rid) => void dispatch(gameCommand('swapPartyWithStorage', sid, rid))}
                />
              ) : null}
              {effectiveTab === 'bag' || effectiveTab === 'shop' ? (
                <ItemsScreen
                  initialView={effectiveTab === 'shop' ? 'shop' : 'inventory'}
                  reducedMotion={reducedMotion}
                  onBuy={(itemId, qty) => void dispatch(gameCommand('buyItem', itemId, qty))}
                  onBuyRouteTicket={(id) => void dispatch(gameCommand('buyRouteTicket', id))}
                  onBuyCardStyle={(id) => void dispatch(gameCommand('buyCardStyle', id))}
                  onEquipCardStyle={(id) => void dispatch(gameCommand('equipCardStyle', id))}
                  onBuyStorageUpgrade={() => void dispatch(gameCommand('buyStorageUpgrade'))}
                  onBuyBagUpgrade={() => void dispatch(gameCommand('buyBagUpgrade'))}
                  rootURL={plugin.rootURL}
                  state={state}
                  onUseItem={(itemId, targetId) =>
                    void dispatch(gameCommand('useBagItem', itemId, targetId))
                  }
                  onActivateXpDoubler={(tier) =>
                    void dispatch(gameCommand('activateXpDoubler', tier))
                  }
                />
              ) : null}
              {effectiveTab === 'dex' ? (
                <CollectionScreen
                  rootURL={plugin.rootURL}
                  collectionDex={state.collectionDex}
                  shinyLog={state.shinyLog}
                  ownedPokemon={[...state.party, ...state.storagePokemon]}
                />
              ) : null}
              {effectiveTab === 'types' ? (
                <TypeChartScreen rootURL={plugin.rootURL} />
              ) : null}
              {effectiveTab === 'progress' ? (
                <ProgressScreen
                  state={state}
                  reducedMotion={reducedMotion}
                  onClaimAchievement={(id) => {
                    void dispatch(gameCommand('claimAchievement', id));
                  }}
                  onClaimAllAchievements={() => {
                    void dispatch(gameCommand('claimAllAchievements'));
                  }}
                  onClaimQuest={(id) => void dispatch(gameCommand('claimQuest', id))}
                  onClaimAllQuests={() => void dispatch(gameCommand('claimAllQuests'))}
                  rewards={
                    <RewardsScreen
                      embedded
                      state={state}
                      reducedMotion={reducedMotion}
                      onClaimReward={(level) => void dispatch(gameCommand('claimTrainerReward', level))}
                      onClaimAll={() => void dispatch(gameCommand('claimAllTrainerRewards'))}
                    />
                  }
                />
              ) : null}
            </Suspense>
          )}
        </div>

        {!showSettings ? (
          <div className="mt-3 pt-2">
            <div className="pkr-seam mb-2" />
            {state.currentEncounter && effectiveTab === 'status' ? (
              <p className="text-center pkr-fine font-semibold" style={{ color: 'rgba(252,211,77,0.9)' }}>
                Wild encounter — use <strong className="font-black" style={{ color: 'var(--pkr-ink-gold)' }}>Catch</strong>,{' '}
                <strong className="font-black" style={{ color: 'var(--pkr-ink-gold)' }}>Fight</strong> (first damaging move), or{' '}
                <strong className="font-black" style={{ color: 'var(--pkr-ink-gold)' }}>Run</strong> above, or the RemNote command palette / queue menu.
              </p>
            ) : (
              <p className="text-center pkr-fine font-semibold" style={{ color: 'var(--pkr-ui-muted, #64748b)' }}>
                Developed by {POKEREM_AUTHOR}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </>
  );

  const [evolutions, nextEvolution] = useEvolutionWatcher(useMemo(() => [...state.party, ...state.storagePokemon], [state.party, state.storagePokemon]), loaded);

  return (
    <div
      ref={sidebarRootRef}
      className={`pokerem-sidebar pkr-pixel-ui flex h-full min-h-0 min-w-0 w-full max-w-none flex-1 flex-col gap-0 self-stretch overflow-hidden ${compact ? 'pkr-focus-mode' : ''} ${showSettings || effectiveTab !== 'status' ? 'pkr-menu-view' : ''}`}
      data-reduced-motion={reducedMotion}
      aria-busy={saving}
      style={ambienceStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {loaded && (state.currentTrainerBattle || state.currentEncounter || state.pendingCaughtMon) && (showSettings || effectiveTab !== 'status') ? <button type="button" className="pkr-return-battle" onClick={() => {setShowSettings(false); void dispatch(gameCommand('setTab', 'status'));}}>{state.currentTrainerBattle ? 'TRAINER CHALLENGE' : 'WILD ENCOUNTER'} · Return to Play</button> : null}
      {saveError ? <div className="pkr-save-feedback" role="alert">{saveError}</div> : null}
      {evolutions[0] ? <EvolutionScene key={evolutions[0].key} event={evolutions[0]} rootURL={plugin.rootURL} reducedMotion={reducedMotion} onDone={nextEvolution} /> : null}
      {/* ── Starter selection ── */}
      {!loaded ? <div className="pkr-loading" role="status"><span>Loading your adventure…</span><div className="pkr-loading-skeleton" /><div className="pkr-loading-skeleton" /></div> : !state.starterChosen ? (
        <div className="pkr-setup-scroll pkr-no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-2 pb-2 pt-2">
          <StarterPickerScreen rootURL={plugin.rootURL} onChoose={(dex) => void dispatch(gameCommand('chooseStarter', dex))} />
        </div>
      ) : !state.studyDifficultyConfigured ? (
        <div className="pkr-setup-scroll pkr-no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-2 pb-2 pt-2">
          <StudyDifficultyScreen
            onChoose={(preset, custom) => {
              void dispatch(gameCommand('configureStudyDifficulty', preset, custom));
            }}
          />
        </div>
      ) : (
        <>
                <SidebarNavigation active={effectiveTab} settings={showSettings} rewardsAttention={rewardsTabAttention} progressAttention={progressTabGlow}
        onSelect={(tab) => { setShowSettings(false); void dispatch(gameCommand('setTab', tab)); }}
        onSettings={() => setShowSettings((v) => !v)} />
          {/* Menus use the full panel; Play owns the arena. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {!showSettings && effectiveTab === 'status' ? <QuickCarePanel state={state} busy={saving || battle.battleBusy} onApply={(command) => void dispatch(command)} /> : null}
            {!showSettings && effectiveTab === 'status' && state.currentTrainerBattle && !state.pendingCaughtMon ? (
              <div className={scrollAreaClass}>
                <TrainerBattleSurface
                  key={state.currentTrainerBattle.id}
                  state={state}
                  rootURL={plugin.rootURL}
                  reducedMotion={reducedMotion}
                  onLockTeam={(ids) => void dispatch(gameCommand('lockTrainerTeam', ids))}
                  busy={saving}
                  onCombatTurn={(mid) => void dispatch(gameCommand('applyTrainerCombatTurn', mid))}
                  onClaimCatch={(idx, ball) =>
                    void dispatch(gameCommand('claimTrainerCatch', idx, ball))
                  }
                  onDismissCatchOffer={() => void dispatch(gameCommand('dismissTrainerCatchOffer'))}
                  onBuyBall={(id) => void dispatch(gameCommand('buyItem', id))}
                  onClose={() => void dispatch(gameCommand('closeTrainerBattle'))}
                  onRematch={() => void dispatch(gameCommand('rematchTrainer'))}
                  rematchCost={trainerRematchCost(state)}
                  ballPrices={[
                    { id: 'poke-ball', price: 100, unlocked: true },
                    { id: 'great-ball', price: 300, unlocked: true },
                    {
                      id: 'ultra-ball',
                      price: 600,
                      unlocked: (state.trainerLevel ?? 1) >= ULTRA_BALL_UNLOCK_LEVEL,
                    },
                  ]}
                />
                {renderSidebarScrollTail()}
              </div>
            ) : !showSettings && effectiveTab === 'status' && active ? (
              <BattleReviewSurface
                widthSourceRef={sidebarRootRef}
                rootURL={plugin.rootURL}
                state={state}
                active={active}
                hasEncounter={!!state.currentEncounter}
                wild={state.currentEncounter}
                canCatch={canCatch}
                battleBusy={battle.battleBusy}
                flowPhase={battle.getFlowPhase(state)}
                outcomeKind={state.lastOutcomeKind}
                feedbackSeq={state.battleFeedbackSeq}
                busyAction={battle.busyAction}
                onCatch={battle.makeCatch}
                autoAttacking={battle.autoAttacking}
                autoAttackMessage={battle.autoAttackMessage}
                onToggleAutoAttack={() => battle.autoAttacking ? battle.stopAutoAttack() : void battle.startAutoAttack(state)}
                onFightMove={(id) => battle.makeFightMove(id)}
                onRun={battle.makeRun}
                encounterRate={effectiveEncounterRate}
                currency={state.currency}
                reducedMotion={reducedMotion}
                pendingCaughtMon={state.pendingCaughtMon ?? null}
                partyForReplace={state.party}
                activePartyId={state.activePokemonId}
                onPendingCatchReplace={(pid) => void dispatch(gameCommand('resolvePendingCaughtReplace', pid))}
                onPendingCatchCancel={() => void dispatch(gameCommand('cancelPendingCaught'))}
                onCatchScope={() => void dispatch(gameCommand('consumeCatchScopeScan'))}
                encounterPacingModulo={encounterPacingModulo}
                wildReviewWeight={wildReviewWeight}
                onAcknowledgeRouteFind={() => void dispatch(gameCommand('acknowledgeRouteFindNotice'))}
                showDailyHeaderStats={showDailyHeaderStats}
                onDismissMainNotice={(id) => void dispatch(gameCommand('dismissMainNotice', id))}
                onClaimMainNotice={(id) => void dispatch(gameCommand('claimMainNotice', id))}
                onClaimAllRewards={() => void dispatch(gameCommand('claimAllRewards'))}
                onDismissResult={() => void dispatch(gameCommand('dismissBattleResult'))}
                pendingRewards={pendingRewardCount(state)}
                sidebarSplitLayout={({ sticky, lower }) => (
                  <>
                    {sticky}
                    <div className={scrollAreaClass}>
                      {lower}
                      {renderSidebarScrollTail()}
                    </div>
                  </>
                )}
              />
            ) : (
              <div className={scrollAreaClass}>{renderSidebarScrollTail()}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

renderWidget(PokeRemSidebar);
