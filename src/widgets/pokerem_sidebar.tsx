import '../style.css';
import { SidebarNavigation } from '../ui/components/SidebarNavigation';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppEvents, renderWidget, useAPIEventListener, useOnMessageBroadcast, usePlugin } from '@remnote/plugin-sdk';
import { usePokeRemBattleActions } from '../hooks/usePokeRemBattleActions';
import { REVIEWS_PER_ENCOUNTER, STORAGE_KEY, SYNC_BROADCAST_KEY, getSyncedGameRaw } from '../game/constants';
import { POKEREM_AUTHOR } from '../releaseMeta';
import { withSyncedGameWrite } from '../game/state/syncedGameWriteLock';
import {
  chooseStarter,
  claimAchievement,
  configureStudyDifficulty,
  createInitialStateV3,
  parseGameState,
  setTab,
  switchActivePokemon,
  useHealingItem,
  useEvolutionStone,
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
  claimTrainerReward,
  resolvePendingCaughtReplace,
  cancelPendingCaught,
  consumeCatchScopeScan,
  acknowledgeRouteFindNotice,
  dismissMainNotice,
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
import { GameIcon, type GameIconName } from '../ui/components/GameIcon';
import { battleAmbienceCssVars, getBattleAmbience } from '../game/engine/battleAmbience';
import {
  getUnclaimedAchievements,
  allAchievementRewardsClaimed,
} from '../game/engine/achievements';
import { getUnclaimedRewards } from '../game/engine/trainerLevel';
import { OnboardingTipsBar } from '../ui/components/OnboardingTipsBar';
const ALL_TABS: SectionTab[] = ['status', 'party', 'bag', 'shop', 'dex', 'types', 'progress', 'rewards'];

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
  const stateRef = useRef(state);
  stateRef.current = state;

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
        const v = await plugin.storage.getSession('pokerem.onboardingTipsDismissed');
        if (!cancel) {
          setOnboardingTipsDismissed(v === true);
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

  const battle = usePokeRemBattleActions(plugin, (next) => setState(next));
  const battleRef = useRef(battle);
  battleRef.current = battle;

  const refreshFromStorage = useCallback(async () => {
    const raw = await getSyncedGameRaw(plugin);
    const s = parseGameState(raw);
    setState(s);
    setLoaded(true);
    return s;
  }, [plugin]);

  useEffect(() => { void refreshFromStorage().catch(() => setSaveError('Could not load your save. Reopen the sidebar to retry.')); }, [refreshFromStorage]);

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

  useOnMessageBroadcast('pokerem_cmd', (msg: any) => {
    const s = stateRef.current;
    const b = battleRef.current;
    if (!s.currentEncounter || !s.starterChosen) return;
    if (msg?.action === 'catch') b.makeCatch();
    else if (msg?.action === 'defeat' || msg?.action === 'fight_first') b.makeFightMove();
    else if (msg?.action === 'run') b.makeRun();
  });

  const applyReducer = async (fn: (s: PokeRemGameState) => PokeRemGameState) => {
    if (savingRef.current || !loaded) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const next = await withSyncedGameWrite(async () => {
        const raw = await getSyncedGameRaw(plugin);
        const prev = parseGameState(raw);
        const n = fn(prev);
        if (n === prev) return prev;
        await plugin.storage.setSynced(STORAGE_KEY, n);
        try { await plugin.messaging.broadcast({ channel: SYNC_BROADCAST_KEY, at: n.lastUpdatedAt }); } catch { /* non-fatal */ }
        return n;
      });
      setState(next);
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
  const effectiveTab = ALL_TABS.includes(sidebarTab) ? sidebarTab : 'status';
  useEffect(() => { if (showSettings || effectiveTab !== 'status') battle.stopAutoAttack(); }, [showSettings, effectiveTab, battle.stopAutoAttack]);
  const canCatch = (state.bag['poke-ball'] ?? 0) > 0 || (state.bag['great-ball'] ?? 0) > 0 || (state.bag['ultra-ball'] ?? 0) > 0;

  const ambienceStyle = battleAmbienceCssVars(getBattleAmbience(state.battleSceneIndex ?? 0));

  const showOnboardingTips =
    state.starterChosen &&
    state.studyDifficultyConfigured &&
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
            onDismiss={() => void applyReducer((s) => acknowledgeWhatsNew(s, POKEREM_VERSION))}
          />
        </div>
      ) : null}
      {showOnboardingTips ? (
        <OnboardingTipsBar
          onOpenSettings={() => setShowSettings(true)}
          onDismiss={() => {
            setOnboardingTipsDismissed(true);
            void (async () => {
              try {
                await plugin.storage.setSession('pokerem.onboardingTipsDismissed', true);
              } catch {
                /* non-fatal */
              }
            })();
          }}
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
                void applyReducer((s) => configureStudyDifficulty(s, preset, custom))
              }
            />
          ) : (
            <Suspense fallback={<p className="py-4 text-center text-[10px] font-semibold" style={{ color: '#64748b' }}>Loading…</p>}>
              {effectiveTab === 'status' && active ? (
                <StatusScreen rootURL={plugin.rootURL} state={state} active={active} />
              ) : null}
              {effectiveTab === 'party' ? (
                <PartyScreen
                  rootURL={plugin.rootURL}
                  party={state.party}
                  bag={state.bag}
                  evolutionBlocked={!!state.currentEncounter || !!state.currentTrainerBattle}
                  evolutionMessage={state.lastOutcomeKind === 'evolution' ? state.lastBattleLog : undefined}
                  onEvolve={(pid, item) => void applyReducer(s => useEvolutionStone(s, pid, item))}
                  storagePokemon={state.storagePokemon}
                  activeId={state.activePokemonId}
                  onSwitch={(id) => void applyReducer((s) => switchActivePokemon(s, id))}
                  onForgetMove={(pid, mid) => void applyReducer((s) => forgetMoveAction(s, pid, mid))}
                  onLearnMove={(pid, mid, rep) => void applyReducer((s) => learnMoveAction(s, pid, mid, rep))}
                  onRename={(pid, name) => void applyReducer((s) => renamePokemon(s, pid, name))}
                  onRelease={(pid) => void applyReducer((s) => releasePokemon(s, pid))}
                  onMoveToStorage={(pid) => void applyReducer((s) => moveToStorage(s, pid))}
                  onMoveToParty={(pid) => void applyReducer((s) => moveToParty(s, pid))}
                  onSwapStorageForParty={(sid, rid) => void applyReducer((s) => swapPartyWithStorage(s, sid, rid))}
                />
              ) : null}
              {effectiveTab === 'bag' || effectiveTab === 'shop' ? (
                <ItemsScreen
                  initialView={effectiveTab === 'shop' ? 'shop' : 'inventory'}
                  reducedMotion={reducedMotion}
                  onBuy={(itemId, price) => void applyReducer((s) => buyItem(s, itemId, price))}
                  rootURL={plugin.rootURL}
                  state={state}
                  onUseItem={(itemId) =>
                    void applyReducer((s) =>
                      itemId === 'rare-candy' || itemId === 'exp-candy-s'
                        ? useLeadUtilityItem(s, itemId)
                        : useHealingItem(s, itemId as any),
                    )
                  }
                  onActivateXpDoubler={(tier) =>
                    void applyReducer((s) => activateXpDoubler(s, tier))
                  }
                />
              ) : null}
              {effectiveTab === 'dex' ? (
                <CollectionScreen rootURL={plugin.rootURL} collectionDex={state.collectionDex} />
              ) : null}
              {effectiveTab === 'types' ? (
                <TypeChartScreen rootURL={plugin.rootURL} />
              ) : null}
              {effectiveTab === 'progress' ? (
                <ProgressScreen
                  state={state}
                  reducedMotion={reducedMotion}
                  onClaimAchievement={(id) => {
                    void applyReducer((s) => claimAchievement(s, id));
                  }}
                  onClaimAllAchievements={() => {
                    void applyReducer((s) => claimAllAchievements(s));
                  }}
                />
              ) : null}
              {effectiveTab === 'rewards' ? (
                <RewardsScreen
                  state={state}
                  reducedMotion={reducedMotion}
                  onClaimReward={(level) => void applyReducer((s) => claimTrainerReward(s, level))}
                />
              ) : null}
            </Suspense>
          )}
        </div>

        {!showSettings ? (
          <div className="mt-3 pt-2">
            <div className="pkr-seam mb-2" />
            {state.currentEncounter && effectiveTab === 'status' ? (
              <p className="text-center text-[10px] font-semibold" style={{ color: 'rgba(252,211,77,0.9)' }}>
                Wild encounter — use <strong className="font-black" style={{ color: '#fde68a' }}>Catch</strong>,{' '}
                <strong className="font-black" style={{ color: '#fde68a' }}>Fight</strong> (first damaging move), or{' '}
                <strong className="font-black" style={{ color: '#fde68a' }}>Run</strong> above, or the RemNote command palette / queue menu.
              </p>
            ) : active && active.currentHp <= 0 ? (
              <p className="text-center text-[10px] font-semibold" style={{ color: '#fca5a5' }}>
                Lead fainted — use a <strong style={{ color: '#fde68a' }}>Revive</strong> in <strong style={{ color: '#fde68a' }}>Bag</strong> (or switch in <strong style={{ color: '#fde68a' }}>Party</strong>) to continue wild encounters.
              </p>
            ) : (
              <p className="text-center text-[10px] font-semibold" style={{ color: 'var(--pkr-ui-muted, #64748b)' }}>
                Developed by {POKEREM_AUTHOR}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      ref={sidebarRootRef}
      className={`pokerem-sidebar pkr-pixel-ui flex h-full min-h-0 min-w-0 w-full max-w-none flex-1 flex-col gap-0 self-stretch overflow-hidden ${compact ? 'pkr-focus-mode' : ''} ${showSettings || effectiveTab !== 'status' ? 'pkr-menu-view' : ''}`}
      data-reduced-motion={reducedMotion}
      aria-busy={saving}
      style={ambienceStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {loaded && (state.currentTrainerBattle || state.currentEncounter) && (showSettings || effectiveTab !== 'status') ? <button type="button" className="pkr-return-battle" onClick={() => {setShowSettings(false); void applyReducer(s => setTab(s, 'status'));}}>{state.currentTrainerBattle ? 'TRAINER CHALLENGE' : 'WILD ENCOUNTER'} · Return to Play</button> : null}
      {saveError ? <div className="pkr-save-feedback" role="alert">{saveError}</div> : null}
      {/* ── Starter selection ── */}
      {!loaded ? <div className="pkr-loading" role="status"><span>Loading your adventure…</span><div className="pkr-loading-skeleton" /><div className="pkr-loading-skeleton" /></div> : !state.starterChosen ? (
        <div className="mx-2 mb-2 mt-2 flex min-h-0 min-w-0 flex-1 flex-col">
          <StarterPickerScreen rootURL={plugin.rootURL} onChoose={(dex) => void applyReducer((s) => chooseStarter(s, dex))} />
        </div>
      ) : !state.studyDifficultyConfigured ? (
        <div className="mx-2 mb-2 mt-2 flex min-h-0 min-w-0 flex-1 flex-col">
          <StudyDifficultyScreen
            onChoose={(preset, custom) => {
              void applyReducer((s) => configureStudyDifficulty(s, preset, custom));
            }}
          />
        </div>
      ) : (
        <>
                <SidebarNavigation active={effectiveTab} settings={showSettings} rewardsAttention={rewardsTabAttention} progressAttention={progressTabGlow}
        onSelect={(tab) => { setShowSettings(false); void applyReducer((s) => setTab(s, tab)); }}
        onSettings={() => setShowSettings((v) => !v)} />
          {/* Menus use the full panel; Play owns the arena. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {!showSettings && effectiveTab === 'status' && state.currentTrainerBattle ? (
              <div className={scrollAreaClass}>
                <TrainerBattleSurface
                  key={state.currentTrainerBattle.id}
                  state={state}
                  rootURL={plugin.rootURL}
                  reducedMotion={reducedMotion}
                  onLockTeam={(ids) => void applyReducer((s) => lockTrainerTeam(s, ids))}
                  busy={saving}
                  onCombatTurn={(mid) => void applyReducer((s) => applyTrainerCombatTurn(s, mid))}
                  onClaimCatch={(idx, ball) =>
                    void applyReducer((s) => claimTrainerCatch(s, idx, ball))
                  }
                  onDismissCatchOffer={() => void applyReducer((s) => dismissTrainerCatchOffer(s))}
                  onBuyBall={(id, price) => void applyReducer((s) => buyItem(s, id, price))}
                  onClose={() => void applyReducer((s) => closeTrainerBattle(s))}
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
                onBuyBall={() => void applyReducer((s) => buyItem(s, 'poke-ball', 100))}
                reducedMotion={reducedMotion}
                pendingCaughtMon={state.pendingCaughtMon ?? null}
                partyForReplace={state.party}
                activePartyId={state.activePokemonId}
                onPendingCatchReplace={(pid) => void applyReducer((s) => resolvePendingCaughtReplace(s, pid))}
                onPendingCatchCancel={() => void applyReducer((s) => cancelPendingCaught(s))}
                onCatchScope={() => void applyReducer((s) => consumeCatchScopeScan(s))}
                encounterPacingModulo={encounterPacingModulo}
                wildReviewWeight={wildReviewWeight}
                onAcknowledgeRouteFind={() => void applyReducer((s) => acknowledgeRouteFindNotice(s))}
                showDailyHeaderStats={showDailyHeaderStats}
                onDismissMainNotice={(id) => void applyReducer((s) => dismissMainNotice(s, id))}
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
