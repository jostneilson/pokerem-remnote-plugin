import '../style.css';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppEvents, renderWidget, useAPIEventListener, useOnMessageBroadcast, usePlugin } from '@remnote/plugin-sdk';
import { usePokeRemBattleActions } from '../hooks/usePokeRemBattleActions';
import { REVIEWS_PER_ENCOUNTER, STORAGE_KEY, SYNC_BROADCAST_KEY, getSyncedGameRaw } from '../game/constants';
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
  useLeadUtilityItem,
  activePokemon,
  forgetMoveAction,
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
} from '../game/state/store';
import type { PokeRemGameState, SectionTab } from '../game/state/model';
import { StarterPickerScreen } from '../ui/screens/StarterPickerScreen';
import { StudyDifficultyScreen } from '../ui/screens/StudyDifficultyScreen';
import { StatusScreen } from '../ui/screens/StatusScreen';
import { PartyScreen } from '../ui/screens/PartyScreen';
import { BagScreen } from '../ui/screens/BagScreen';
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
import { ShopScreen } from '../ui/screens/ShopScreen';
import { RewardsScreen } from '../ui/screens/RewardsScreen';
import { neutralizeBrokenRegisterCSS } from '../neutralizeRemNoteCssApi';
import { BattleReviewSurface } from '../ui/battle/BattleReviewSurface';
import { GameIcon, type GameIconName } from '../ui/components/GameIcon';
import { battleAmbienceCssVars, getBattleAmbience } from '../game/engine/battleAmbience';
import {
  ACHIEVEMENT_DEFS,
  achievementRewardSummary,
  getUnclaimedAchievements,
  allAchievementRewardsClaimed,
} from '../game/engine/achievements';
import { getUnclaimedRewards } from '../game/engine/trainerLevel';
import { AchievementFanfare } from '../ui/components/AchievementFanfare';
import { OnboardingTipsBar } from '../ui/components/OnboardingTipsBar';
import { useSessionRecap } from '../hooks/useSessionRecap';

const ALL_TABS: SectionTab[] = ['status', 'party', 'bag', 'shop', 'dex', 'types', 'progress', 'rewards'];
const TAB_CONFIG: Record<string, { icon: GameIconName; label: string }> = {
  status:   { icon: 'navStatus', label: 'Status' },
  party:    { icon: 'navParty', label: 'Party' },
  bag:      { icon: 'navBag', label: 'Bag' },
  shop:     { icon: 'navShop', label: 'Shop' },
  dex:      { icon: 'navDex', label: 'Dex' },
  types:    { icon: 'navTypes', label: 'Types' },
  progress: { icon: 'navProgress', label: 'Progress' },
  rewards:  { icon: 'navRewards', label: 'Rewards' },
};

function PokeRemSidebar() {
  const plugin = usePlugin();
  neutralizeBrokenRegisterCSS(plugin);
  const [state, setState] = useState<PokeRemGameState>(() => createInitialStateV3());
  const [showSettings, setShowSettings] = useState(false);
  const [encounterRate, setEncounterRate] = useState(REVIEWS_PER_ENCOUNTER);
  const [encounterPacingModulo, setEncounterPacingModulo] = useState(1);
  const [pluginReviewWeight, setPluginReviewWeight] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showDailyHeaderStats, setShowDailyHeaderStats] = useState(true);
  const [achievementFanfareEntries, setAchievementFanfareEntries] = useState<
    { title: string; rewardLine: string }[] | null
  >(null);
  const dismissAchievementFanfare = useCallback(() => setAchievementFanfareEntries(null), []);
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
    return s;
  }, [plugin]);

  useEffect(() => { void refreshFromStorage(); }, [refreshFromStorage]);

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

  /** Index widget writes synced state on each completion; this guarantees the sidebar catches up immediately. */
  useAPIEventListener(AppEvents.QueueCompleteCard, undefined, () => {
    void refreshFromStorage();
  });

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
    const next = await withSyncedGameWrite(async () => {
      const raw = await getSyncedGameRaw(plugin);
      const n = fn(parseGameState(raw));
      await plugin.storage.setSynced(STORAGE_KEY, n);
      try {
        await plugin.messaging.broadcast({ channel: SYNC_BROADCAST_KEY, at: n.lastUpdatedAt });
      } catch { /* non-fatal */ }
      return n;
    });
    setState(next);
  };

  const active = activePokemon(state);
  const sessionRecap = useSessionRecap(plugin, state);
  const sidebarTab = state.selectedTab === 'battle' ? 'status' : state.selectedTab;
  const effectiveTab = ALL_TABS.includes(sidebarTab) ? sidebarTab : 'status';
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

  const renderAchievementFanfare = () =>
    achievementFanfareEntries && achievementFanfareEntries.length > 0 ? (
      <div className="shrink-0 px-1 pt-0.5">
        <AchievementFanfare
          entries={achievementFanfareEntries}
          onDone={dismissAchievementFanfare}
          reducedMotion={reducedMotion}
        />
      </div>
    ) : null;

  const renderSidebarScrollTail = () => (
    <>
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

      <div
        className="pkr-no-scrollbar pkr-tab-bar sticky z-[25] flex shrink-0 items-center gap-0.5 overflow-x-auto px-1 py-1.5 shadow-[0_-6px_18px_rgba(0,0,0,0.45)]"
        style={{ top: 0 }}
      >
        {ALL_TABS.map((tab) => {
          const cfg = TAB_CONFIG[tab];
          const isActive = !showSettings && effectiveTab === tab;
          const attentionRewards = tab === 'rewards' && rewardsTabAttention;
          const attentionProgress = tab === 'progress' && progressTabGlow;
          const iconAttention = attentionRewards
            ? 'pkr-tab-tap__icon--attention-reward'
            : attentionProgress
              ? 'pkr-tab-tap__icon--attention'
              : '';
          const aria =
            attentionRewards
              ? `${cfg?.label ?? tab}, unclaimed trainer rewards`
              : attentionProgress
                ? `${cfg?.label ?? tab}, unclaimed achievement rewards`
                : cfg?.label ?? tab;
          return (
            <button
              key={tab}
              type="button"
              aria-label={aria}
              onClick={() => {
                setShowSettings(false);
                void applyReducer((s) => setTab(s, tab));
              }}
              className={`pkr-tab-tap flex min-w-[2.75rem] shrink-0 items-center gap-1 px-2 py-1.5 text-[11px] ${
                isActive ? 'pkr-tab-active' : 'pkr-tab-inactive'
              }`}
            >
              <span className={`pkr-tab-tap__icon ${iconAttention}`.trim()} aria-hidden>
                <GameIcon name={cfg?.icon} size={18} tabPixel />
              </span>
              <span className="hidden min-[360px]:inline" aria-hidden>
                {cfg?.label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Settings"
          onClick={() => setShowSettings((v) => !v)}
          className={`pkr-tab-tap ml-auto flex min-w-[2.75rem] shrink-0 items-center justify-center gap-1 px-2 py-1.5 text-[11px] ${
            showSettings ? 'pkr-tab-active' : 'pkr-tab-inactive'
          }`}
          title="Settings"
        >
          <span className="pkr-tab-tap__icon" aria-hidden>
            <GameIcon name="navSettings" size={18} tabPixel />
          </span>
        </button>
      </div>

      <div className="pkr-content-vignette min-w-0 shrink-0 p-2">
        <div key={showSettings ? 'settings' : `tab-${effectiveTab}`} className="pkr-panel-mount min-w-0">
          {showSettings ? (
            <SettingsScreen
              plugin={plugin}
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
                <StatusScreen rootURL={plugin.rootURL} state={state} active={active} sessionRecap={sessionRecap} />
              ) : null}
              {effectiveTab === 'party' ? (
                <PartyScreen
                  rootURL={plugin.rootURL}
                  party={state.party}
                  storagePokemon={state.storagePokemon}
                  activeId={state.activePokemonId}
                  onSwitch={(id) => void applyReducer((s) => switchActivePokemon(s, id))}
                  onForgetMove={(pid, mid) => void applyReducer((s) => forgetMoveAction(s, pid, mid))}
                  onRename={(pid, name) => void applyReducer((s) => renamePokemon(s, pid, name))}
                  onRelease={(pid) => void applyReducer((s) => releasePokemon(s, pid))}
                  onMoveToStorage={(pid) => void applyReducer((s) => moveToStorage(s, pid))}
                  onMoveToParty={(pid) => void applyReducer((s) => moveToParty(s, pid))}
                  onSwapStorageForParty={(sid, rid) => void applyReducer((s) => swapPartyWithStorage(s, sid, rid))}
                />
              ) : null}
              {effectiveTab === 'bag' ? (
                <BagScreen
                  rootURL={plugin.rootURL}
                  bag={state.bag}
                  currency={state.currency}
                  onUseItem={(itemId) =>
                    void applyReducer((s) =>
                      itemId === 'rare-candy' || itemId === 'exp-candy-s'
                        ? useLeadUtilityItem(s, itemId)
                        : useHealingItem(s, itemId as any),
                    )
                  }
                />
              ) : null}
              {effectiveTab === 'shop' ? (
                <ShopScreen
                  rootURL={plugin.rootURL}
                  currency={state.currency ?? 0}
                  trainerLevel={state.trainerLevel ?? 1}
                  reducedMotion={reducedMotion}
                  onBuy={(itemId, price) => void applyReducer((s) => buyItem(s, itemId, price))}
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
                    const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
                    void applyReducer((s) => claimAchievement(s, id));
                    if (def) {
                      setAchievementFanfareEntries([
                        { title: def.name, rewardLine: achievementRewardSummary(def) },
                      ]);
                    }
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
            {state.currentEncounter ? (
              <p className="text-center text-[10px] font-semibold" style={{ color: 'rgba(252,211,77,0.9)' }}>
                Wild encounter — use <strong className="font-black" style={{ color: '#fde68a' }}>Catch</strong>,{' '}
                <strong className="font-black" style={{ color: '#fde68a' }}>Fight</strong> (first damaging move), or{' '}
                <strong className="font-black" style={{ color: '#fde68a' }}>Run</strong> above, or the RemNote command palette / queue menu.
              </p>
            ) : active && active.currentHp <= 0 ? (
              <p className="text-center text-[10px] font-semibold" style={{ color: '#fca5a5' }}>
                Lead fainted — open <strong style={{ color: '#fde68a' }}>Bag</strong> or <strong style={{ color: '#fde68a' }}>Party</strong> to continue wild encounters.
              </p>
            ) : (
              <p className="text-center text-[10px] font-semibold" style={{ color: 'var(--pkr-ui-muted, #64748b)' }}>
                Developed by Jost Neilson
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
      className="pokerem-sidebar pkr-pixel-ui flex h-full min-h-0 min-w-0 w-full max-w-none flex-1 flex-col gap-0 self-stretch overflow-hidden"
      style={ambienceStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Starter selection ── */}
      {!state.starterChosen ? (
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
          {/* Cave stays in the column above the scrollport; command deck + tabs scroll beneath it. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {active ? (
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
                sidebarSplitLayout={({ sticky, lower }) => (
                  <>
                    {sticky}
                    <div className={scrollAreaClass}>
                      {renderAchievementFanfare()}
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
