import { catchBlockedByStorage } from '../../game/engine/capacity';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type {
  PokeRemGameState,
  BattleOutcomeKind,
  EncounterPokemon,
  OwnedPokemon,
} from '../../game/state/model';
import { REVIEWS_PER_ENCOUNTER } from '../../game/constants';
import type { BattleFlowPhase } from '../../game/battleFlow';
import { getBattleAmbience, getBattleSpriteOffsets } from '../../game/engine/battleAmbience';
import { getResistances, getWeaknesses } from '../../game/data/typeChart';
import { ROUTE_BIOME_BY_ID } from '../../game/engine/sinks';
import { movesetForBattle } from '../../game/engine/moveLearn';
import {
  isGuaranteedCatch,
  recommendedBall,
  wildCatchChancePreview,
  type CatchBall,
} from '../../game/engine/encounters';
import { estimatedQueueCompletionsUntilWild } from '../../game/wildEncounterDisplay';
import { speciesLabel } from '../components/SpeciesBadge';
import { AchievementFanfare } from '../components/AchievementFanfare';
import { PokeRemTrekStrip } from '../components/PokeRemTrekStrip';
import { RocketRadarChip } from '../components/RocketRadarChip';
import { useTrainerXpMoment } from '../hooks/useTrainerXpMoment';
import { BRAND } from '../theme/gameTheme';
import { BattleField } from './BattleField';
import { BattleHeaderBar } from './BattleHeaderBar';
import { BattleHudPlate } from './BattleHudPlate';
import { BattleCommandMenu } from './BattleCommandMenu';
import { BattleMoveMenu } from './BattleMoveMenu';
import { BattleMessageStack, PendingCatchPanel } from './BattleMessages';
import { CATCH_BALL_STOCK, sortTypes, type BusyAction } from './battleSurfaceUtils';
import { useBattleFx, useBattleLinger } from './useBattleFx';
import { useFrameWidth, useSceneBlend } from './useBattleLayout';

const HUD_TIER_COLORS: Record<string, string> = {
  Legendary: '#eab308',
  Mythical: '#a855f7',
  Ultra: '#3b82f6',
};

/**
 * The wild battle surface: header bar, battle field with both info plates, and the command deck
 * (messages, Catch / Fight / Run or the move menu, next-wild progress). Field effects run through
 * `useBattleFx`; the pieces live in BattleField, BattleHudPlate, BattleCommandMenu and BattleMoveMenu.
 */
export function BattleReviewSurface({
  rootURL,
  state,
  active,
  hasEncounter,
  wild,
  canCatch,
  battleBusy,
  autoAttacking = false,
  autoAttackMessage,
  onToggleAutoAttack,
  flowPhase,
  outcomeKind,
  feedbackSeq,
  busyAction,
  onCatch,
  onFightMove,
  onRun,
  onOpenStorageTransfer,
  encounterRate,
  currency,
  reducedMotion,
  pendingCaughtMon = null,
  partyForReplace = [],
  activePartyId = null,
  onPendingCatchReplace,
  onPendingCatchCancel,
  onCatchScope,
  widthSourceRef,
  showDailyHeaderStats = true,
  /** Optional: receives the chrome column height in px (header + cave) when layout changes. */
  onFieldEndOffsetChange,
  encounterPacingModulo,
  wildReviewWeight,
  onAcknowledgeRouteFind,
  onDismissMainNotice,
  onClaimMainNotice,
  onClaimAllRewards,
  pendingRewards = 0,
  onDismissResult,
  /**
   * Sidebar layout: `sticky` is the header + cave (fixed above the scrollport); `lower` is the command
   * column (place inside the host `overflow-y-auto` so it scrolls under the cave).
   */
  sidebarSplitLayout,
}: {
  /** RemNote sidebar column (or host) — primary width for responsive battle layout. */
  widthSourceRef?: RefObject<HTMLElement | null>;
  rootURL: string | undefined;
  state: PokeRemGameState;
  active: OwnedPokemon;
  hasEncounter: boolean;
  wild: EncounterPokemon | null;
  canCatch: boolean;
  battleBusy: boolean;
  autoAttacking?: boolean;
  autoAttackMessage?: string;
  onToggleAutoAttack?: () => void;
  flowPhase: BattleFlowPhase;
  outcomeKind: BattleOutcomeKind;
  feedbackSeq: number;
  busyAction: BusyAction;
  /** Throw this ball, or the recommended one when omitted. */
  onCatch: (ball?: CatchBall) => void;
  onFightMove: (moveId: string) => void;
  onRun: (giveUpPrize?: boolean) => void;
  /** Open the View all grid filtered to duplicates (full-storage Catch). */
  onOpenStorageTransfer?: () => void;
  encounterRate?: number;
  currency?: number;
  reducedMotion?: boolean;
  /** Full-party catch: new Pokémon waiting for a party slot. */
  pendingCaughtMon?: OwnedPokemon | null;
  partyForReplace?: OwnedPokemon[];
  activePartyId?: string | null;
  onPendingCatchReplace?: (partyPokemonId: string) => void;
  onPendingCatchCancel?: () => void;
  /** Consume Catch Scope — odds readout in battle log (wild only). */
  onCatchScope?: () => void;
  /** When false, hide compact "today" stats in the header (RemNote plugin setting). */
  showDailyHeaderStats?: boolean;
  onFieldEndOffsetChange?: (offsetFromBattleTopPx: number) => void;
  /** Matches plugin `pokerem.encounterPacing` (1 or 2) — used only for wild ETA copy. */
  encounterPacingModulo?: number;
  /** Effective study weight for wild accumulation (settings or study difficulty). */
  wildReviewWeight?: number;
  onAcknowledgeRouteFind?: () => void;
  /** Dismiss synced main notice (achievement / trainer reward banner). */
  onDismissMainNotice?: (id: string) => void;
  /** Claim the reward behind the banner. */
  onClaimMainNotice?: (id: string) => void;
  onClaimAllRewards?: () => void;
  /** Rewards waiting to be claimed (achievements, trainer rewards, quests). */
  pendingRewards?: number;
  /** Close the post-battle result card (XP, level-up, new moves, catch). */
  onDismissResult?: () => void;
  sidebarSplitLayout?: (parts: { sticky: ReactNode; lower: ReactNode }) => JSX.Element;
}) {
  const progress = state.encounterProgress;
  const effectiveRate = encounterRate ?? REVIEWS_PER_ENCOUNTER;
  const pacingMod =
    typeof encounterPacingModulo === 'number' && encounterPacingModulo >= 2
      ? Math.floor(encounterPacingModulo)
      : 1;
  const wildRw =
    typeof wildReviewWeight === 'number' && Number.isFinite(wildReviewWeight)
      ? wildReviewWeight
      : 1;
  const xpMoment = useTrainerXpMoment(
    state.trainerXp ?? 0,
    state.trainerLevel ?? 1,
    reducedMotion === true
  );
  const catchScopeCount = state.bag['catch-scope'] ?? 0;
  const [fightMenu, setFightMenu] = useState(false);
  const outerRef = useRef<HTMLDivElement | null>(null);
  /** Header + cave column — observed when `onFieldEndOffsetChange` is set. */
  const stickyDockRef = useRef<HTMLDivElement | null>(null);
  const prevHadEncounter = useRef(false);
  const leadFaintedNoEncounter = !hasEncounter && active.currentHp <= 0;
  const teamDown = state.party.every((p) => p.currentHp <= 0);
  const showPendingCatch =
    !!pendingCaughtMon && !hasEncounter && onPendingCatchReplace && onPendingCatchCancel;

  const exploreWildCompletionsRemaining =
    !hasEncounter && !leadFaintedNoEncounter
      ? estimatedQueueCompletionsUntilWild({
          encounterProgress: progress,
          effectiveRate,
          wildReviewAccum: state.wildReviewAccum ?? 0,
          reviewWeight: wildRw,
          encounterPacingModulo: pacingMod,
          cardsReviewed: state.cardsReviewed,
        })
      : 0;

  const legalMoves = useMemo(() => movesetForBattle(active), [active]);
  const strike = state.lastCombatStrike ?? null;

  const battleLinger = useBattleLinger({
    wild,
    hasEncounter,
    outcomeKind,
    feedbackSeq,
    reducedMotion: reducedMotion === true,
    wildDefeated: state.lastCombatStrike?.wildDefeated,
  });
  const fieldWild = wild ?? battleLinger?.wild ?? null;
  const inBattleField = hasEncounter || !!battleLinger;

  const sceneIdx = state.battleSceneIndex ?? 0;
  const amb = getBattleAmbience(sceneIdx);
  const scene = useSceneBlend(sceneIdx, reducedMotion === true);
  const fx = useBattleFx({
    feedbackSeq,
    hasEncounter,
    reducedMotion: reducedMotion === true,
    outcomeKind,
    strike: state.lastCombatStrike,
  });

  const frameW = useFrameWidth(outerRef, widthSourceRef);
  const layoutW = Math.max(260, frameW);
  const typeIconSize = Math.min(18, Math.max(12, Math.round(layoutW * 0.045)));
  const battleHeight = Math.max(190, Math.min(270, Math.round(layoutW * 0.58)));
  const spriteSize = Math.max(90, Math.min(142, Math.round(layoutW * 0.3)));
  /** Corner HUD width — tied to the measured column. Half the field keeps each plate clear of the opposite sprite. */
  const hudPanelMaxPx = Math.min(190, Math.max(120, Math.round(layoutW * 0.5)));

  const playerTypes = useMemo(() => {
    if (!inBattleField) return { own: [], resist: [], weak: [] };
    return {
      own: sortTypes(active.types),
      resist: sortTypes(getResistances(active.types)).slice(0, 10),
      weak: sortTypes(getWeaknesses(active.types)).slice(0, 10),
    };
  }, [inBattleField, active.types]);
  const wildTypes = useMemo(
    () =>
      fieldWild
        ? {
            own: sortTypes(fieldWild.types),
            resist: sortTypes(getResistances(fieldWild.types)).slice(0, 10),
            weak: sortTypes(getWeaknesses(fieldWild.types)).slice(0, 10),
          }
        : null,
    [fieldWild]
  );

  useEffect(() => {
    if (!hasEncounter) setFightMenu(false);
  }, [hasEncounter]);

  // Focus the battle region when a wild appears, so keyboard shortcuts work straight away.
  useEffect(() => {
    const was = prevHadEncounter.current;
    prevHadEncounter.current = hasEncounter;
    if (hasEncounter && !was) {
      const id = window.setTimeout(() => {
        requestAnimationFrame(() => outerRef.current?.focus({ preventScroll: true }));
      }, 0);
      return () => clearTimeout(id);
    }
  }, [hasEncounter]);

  const liveEncounter = state.currentEncounter;
  const ballStockChips = useMemo(
    () =>
      CATCH_BALL_STOCK.map((row) => ({
        ...row,
        n: state.bag[row.key] ?? 0,
        pct: liveEncounter
          ? Math.round(wildCatchChancePreview(liveEncounter, active, row.key) * 100)
          : null,
      })).filter((r) => r.n > 0),
    [state.bag, liveEncounter, active]
  );
  const suggestedBall: CatchBall = liveEncounter
    ? recommendedBall(state.bag, liveEncounter, active)
    : 'poke-ball';
  const suggestedPct = ballStockChips.find((r) => r.key === suggestedBall)?.pct ?? null;
  const guaranteedCatch = !!liveEncounter && isGuaranteedCatch(liveEncounter);
  const [thrownBall, setThrownBall] = useState<CatchBall>('poke-ball');
  const throwBall = (ball: CatchBall) => {
    setThrownBall(ball);
    onCatch(ball);
  };
  const canFight = legalMoves.length > 0 && active.currentHp > 0;
  const openFightMenu = () => {
    if (autoAttacking) onToggleAutoAttack?.();
    setFightMenu(true);
  };
  const chooseMove = (moveId: string) => {
    onFightMove(moveId);
    setFightMenu(false);
  };
  const commandDeckHoverLift = reducedMotion ? '' : 'hover:-translate-y-px';

  useLayoutEffect(() => {
    if (!onFieldEndOffsetChange) return;
    const dock = stickyDockRef.current;
    if (!dock) return;
    const report = () => onFieldEndOffsetChange(dock.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(dock);
    return () => ro.disconnect();
  }, [onFieldEndOffsetChange]);

  const impactShake = xpMoment.screenShake;
  const chromeClassName = sidebarSplitLayout
    ? `shrink-0 z-[20] bg-[#0b0f14]/96 shadow-[0_8px_24px_rgba(0,0,0,0.65)] backdrop-blur-[2px]${impactShake ? ' animate-pkr-xp-impact' : ''}`
    : `sticky top-0 z-[20] shrink-0 bg-[#0b0f14]/96 shadow-[0_8px_24px_rgba(0,0,0,0.65)] backdrop-blur-[2px]`;
  const outerClassName = `pkr-battle-outer pkr-retro-chrome relative w-full min-w-0 max-w-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--pkr-accent)] focus-visible:ring-opacity-40 focus-visible:ring-offset-2 focus-visible:ring-offset-black/55${
    sidebarSplitLayout ? '' : impactShake ? ' animate-pkr-xp-impact' : ''
  }`;

  const hudChrome = {
    maxWidth: hudPanelMaxPx,
    accent: amb.accent,
    rootURL,
    typeIconSize,
    reducedMotion,
  };
  const wildHud =
    fieldWild && wildTypes ? (
      <BattleHudPlate
        {...hudChrome}
        idPrefix="w"
        className={`left-1 top-1 sm:left-1.5${battleLinger ? ' pointer-events-none opacity-90' : ''}${fieldWild.shiny ? ' pkr-battle-hud--shiny' : ''}`}
        interactive={!battleLinger}
        header={
          <div className="mb-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <span className="pkr-battle-hud-role" style={{ color: amb.accentMuted }}>
              {fieldWild.pendingPrize ? 'Rocket' : 'Wild'}
            </span>
            {fieldWild.pendingPrize ? (
              <span className="pkr-hud-badge pkr-hud-badge--prize" title="The Rocket Leader’s prize: it won’t flee">
                Prize
              </span>
            ) : null}
            {fieldWild.tier && fieldWild.tier !== 'Common' ? (
              <span
                className="pkr-hud-badge"
                style={{
                  background: HUD_TIER_COLORS[fieldWild.tier] ?? '#f472b6',
                  color: fieldWild.tier === 'Legendary' ? '#422006' : 'white',
                  boxShadow: '0 0 6px rgba(0,0,0,0.35)',
                }}
              >
                {speciesLabel(fieldWild.dexNum, fieldWild.tier)}
              </span>
            ) : null}
          </div>
        }
        shiny={!!fieldWild.shiny}
        name={fieldWild.name}
        level={fieldWild.level}
        levelColor="var(--pkr-ink-danger)"
        hp={fieldWild.currentHp}
        maxHp={fieldWild.maxHp}
        hpTextColor="#fecaca"
        hpGradient="linear-gradient(180deg,#fca5a5 0%,#ef4444 55%,#b91c1c 100%)"
        hit={fx.wildHit}
        types={wildTypes.own}
        resists={wildTypes.resist}
        weaknesses={wildTypes.weak}
      />
    ) : null;
  const wildsLeft = Math.max(0, effectiveRate - progress);
  const playerHud = (
    <BattleHudPlate
      {...hudChrome}
      idPrefix="p"
      className={fieldWild ? 'bottom-1 right-1 sm:right-1.5' : 'left-1 top-1 sm:left-1.5'}
      header={
        !inBattleField ? (
          <div className="mb-0.5 pkr-fine font-bold leading-none" style={{ color: '#a5b4fc' }}>
            {leadFaintedNoEncounter
              ? teamDown ? 'Team resting' : 'Lead fainted'
              : `Wild in ${wildsLeft} review${wildsLeft === 1 ? '' : 's'}`}
          </div>
        ) : (
          <div className="pkr-battle-hud-role mb-0.5" style={{ color: amb.accentMuted }}>
            {battleLinger && !hasEncounter
              ? battleLinger.kind === 'faint'
                ? 'You — down'
                : 'Victory'
              : 'You'}
          </div>
        )
      }
      shiny={inBattleField && !!active.shiny}
      name={active.nickname || active.name}
      level={active.level}
      levelColor="#bef264"
      hp={active.currentHp}
      maxHp={active.maxHp}
      hpTextColor="var(--pkr-ink-soft)"
      hpGradient="linear-gradient(180deg,#bef264 0%,#84cc16 50%,#4d7c0f 100%)"
      hit={fx.playerHit}
      types={playerTypes.own}
      resists={fieldWild ? playerTypes.resist : []}
      weaknesses={fieldWild ? playerTypes.weak : []}
    />
  );

  const mainNotice = state.mainNoticeQueue?.[0];
  const chromeBody = (
    // Sticky with sidebar scroll: trainer row + banners + field stay put; the command deck slides underneath.
    <div ref={stickyDockRef} className={chromeClassName}>
      {mainNotice && onDismissMainNotice ? (
        <div className="border-b border-white/[0.06] px-1 pt-1">
          <AchievementFanfare
            headline={
              mainNotice.kind === 'trainer_reward' ? 'Trainer reward ready' : 'Achievement unlocked'
            }
            entries={[{ title: mainNotice.title, rewardLine: mainNotice.subtitle }]}
            onDone={() => onDismissMainNotice(mainNotice.id)}
            onClaim={
              onClaimMainNotice && mainNotice.kind !== 'trainer_battle_result'
                ? () => onClaimMainNotice(mainNotice.id)
                : undefined
            }
            onClaimAll={onClaimAllRewards}
            claimAllCount={pendingRewards}
            reducedMotion={reducedMotion}
          />
        </div>
      ) : null}
      <BattleHeaderBar
        state={state}
        xpMoment={xpMoment}
        feedbackSeq={feedbackSeq}
        showDailyHeaderStats={showDailyHeaderStats}
        layoutW={layoutW}
      />
      {outcomeKind === 'evolution' && feedbackSeq > 0 ? (
        <div
          className="flex items-center justify-center gap-1 px-2 py-1 pkr-fine font-black uppercase tracking-widest"
          style={{
            background: 'linear-gradient(90deg, #581c87 0%, #a855f7 50%, #581c87 100%)',
            color: '#faf5ff',
            boxShadow: '0 0 12px rgba(168,85,247,0.45)',
          }}
        >
          <span>Evolution</span>
        </div>
      ) : null}
      <BattleField
        rootURL={rootURL}
        sceneIdx={sceneIdx}
        amb={amb}
        spriteOff={getBattleSpriteOffsets(sceneIdx)}
        scene={scene}
        reducedMotion={reducedMotion}
        fx={fx}
        height={battleHeight}
        layoutW={layoutW}
        spriteSize={spriteSize}
        fieldWild={fieldWild}
        linger={battleLinger}
        hasEncounter={hasEncounter}
        active={active}
        outcomeKind={outcomeKind}
        feedbackSeq={feedbackSeq}
        strike={strike}
        thrownBall={thrownBall}
        battleBusy={battleBusy}
        busyAction={busyAction}
        wildHud={wildHud}
        playerHud={playerHud}
      />
    </div>
  );

  const lowerBody = (
    <>
      {/* Command deck — the primary control surface. */}
      <div
        className="pkr-retro-chrome pkr-battle-command-shell min-w-0 border-t-2 px-2.5 pb-2.5 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        style={{
          background: amb.commandBarGradient,
          borderTopColor: amb.accent,
          borderTopWidth: 2,
        }}
      >
        <BattleMessageStack
          state={state}
          rootURL={rootURL}
          hasEncounter={hasEncounter}
          outcomeKind={outcomeKind}
          feedbackSeq={feedbackSeq}
          strike={strike}
          playerName={active.nickname || active.name}
          wildName={fieldWild?.name ?? wild?.name ?? 'Wild Pokémon'}
          accent={amb.accent}
          accentMuted={amb.accentMuted}
          reducedMotion={reducedMotion}
          onAcknowledgeRouteFind={onAcknowledgeRouteFind}
          onDismissResult={onDismissResult}
        />
        <div
          className="pkr-battle-command-panel mt-0.5 rounded-lg border px-2 py-2"
          style={{
            borderColor: `${amb.accent}38`,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.42) 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(0,0,0,0.35), 0 0 16px ${amb.accent}12`,
          }}
        >
          {hasEncounter ? (
            fightMenu ? (
              <BattleMoveMenu
                rootURL={rootURL}
                active={active}
                foe={fieldWild ?? wild}
                legalMoves={legalMoves}
                battleBusy={battleBusy}
                busyAction={busyAction}
                accent={amb.accent}
                uiMuted={amb.uiMuted}
                hoverLift={commandDeckHoverLift}
                reducedMotion={reducedMotion}
                onMove={chooseMove}
                onBack={() => setFightMenu(false)}
              />
            ) : (
              <BattleCommandMenu
                rootURL={rootURL}
                active={active}
                wild={wild}
                canCatch={canCatch}
                battleBusy={battleBusy}
                busyAction={busyAction}
                canFight={canFight}
                hoverLift={commandDeckHoverLift}
                reducedMotion={reducedMotion}
                suggestedBall={suggestedBall}
                suggestedPct={suggestedPct}
                guaranteedCatch={guaranteedCatch}
                ballChips={ballStockChips}
                catchScopeCount={catchScopeCount}
                autoAttacking={autoAttacking}
                autoAttackMessage={autoAttackMessage}
                onThrow={throwBall}
                onFight={openFightMenu}
                onRun={onRun}
                onToggleAutoAttack={onToggleAutoAttack}
                onCatchScope={onCatchScope}
                onStorageFull={wild && onOpenStorageTransfer && catchBlockedByStorage(state, wild) ? onOpenStorageTransfer : undefined}
              />
            )
          ) : leadFaintedNoEncounter ? (
            <div
              className="rounded-lg py-2.5 text-center pkr-fine font-bold leading-snug"
              style={{
                border: `1px dashed ${amb.exploreBorder}`,
                background: 'rgba(0,0,0,0.2)',
                color: amb.exploreText,
              }}
            >
              {teamDown
                ? 'Your team is resting and will be back at half HP soon. Keep studying, or heal now.'
                : 'Your next card sends in a teammate who can still battle, or heal your lead now.'}
            </div>
          ) : (
            <div className="pkr-next-wild">
              <span className="pkr-next-wild__label" style={{ color: amb.exploreText }}>
                Next wild in {exploreWildCompletionsRemaining} card
                {exploreWildCompletionsRemaining === 1 ? '' : 's'}
              </span>
              {state.routeTicket && state.routeTicket.remaining > 0 ? (
                <span className="pkr-next-wild__ticket">
                  Route ticket · {ROUTE_BIOME_BY_ID.get(state.routeTicket.biome)?.name ?? 'Route'} ·{' '}
                  {state.routeTicket.remaining} wild
                  {state.routeTicket.remaining === 1 ? '' : 's'} left
                </span>
              ) : null}
              <PokeRemTrekStrip
                variant="battle"
                rootURL={rootURL}
                effectiveRate={effectiveRate}
                progress={progress}
                hasEncounter={hasEncounter}
                accent={amb.accent}
                title={`About ${exploreWildCompletionsRemaining} queue completion${
                  exploreWildCompletionsRemaining === 1 ? '' : 's'
                } until the next wild Pokémon (${progress} of ${effectiveRate} toward encounter)`}
              />
              <RocketRadarChip rocket={state.rocket} />
            </div>
          )}
          {!canCatch && hasEncounter ? (
            // One restock button lives in Quick Care below, so it isn't offered twice.
            <p
              className="mt-1 text-center pkr-fine font-bold"
              style={{ color: '#fcd34d' }}
              role="status"
            >
              No balls left — restock in Quick Care, or Fight or Run.
            </p>
          ) : null}
        </div>
      </div>

      {showPendingCatch && pendingCaughtMon ? (
        <PendingCatchPanel
          mon={pendingCaughtMon}
          party={partyForReplace}
          activePartyId={activePartyId}
          onReplace={onPendingCatchReplace!}
          onCancel={onPendingCatchCancel!}
        />
      ) : null}
    </>
  );

  // Keyboard play while the battle region has focus: C catch, F fight, A auto, R run, 1–4 moves, Esc back.
  const onBattleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!hasEncounter || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const key = e.key.toLowerCase();
    const moveIndex = Number(key) - 1;
    if (fightMenu && moveIndex >= 0 && moveIndex < Math.min(4, legalMoves.length)) {
      if (battleBusy || active.currentHp <= 0) return;
      chooseMove(legalMoves[moveIndex]!);
    } else if (key === 'escape' && fightMenu) setFightMenu(false);
    else if (key === 'c' && canCatch && !battleBusy) throwBall(suggestedBall);
    else if (key === 'f' && !battleBusy && canFight) setFightMenu(true);
    else if (key === 'r' && !battleBusy) onRun();
    else if (
      key === 'a' &&
      onToggleAutoAttack &&
      (autoAttacking || (!battleBusy && active.currentHp > 0))
    )
      onToggleAutoAttack();
    else return;
    e.preventDefault();
  };

  const region = (children: ReactNode) => (
    <div
      ref={outerRef}
      tabIndex={0}
      className={outerClassName}
      role="region"
      aria-label={`${BRAND.wordmark} battle`}
      aria-keyshortcuts="C F A R 1 2 3 4 Escape"
      onKeyDown={onBattleKeyDown}
    >
      {children}
    </div>
  );

  if (sidebarSplitLayout)
    return sidebarSplitLayout({ sticky: chromeBody, lower: region(lowerBody) });
  return region(
    <>
      {chromeBody}
      {lowerBody}
    </>
  );
}
