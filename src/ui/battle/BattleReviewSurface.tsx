import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
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
import { backSpriteUrl, frontSpriteUrl, itemIconUrl } from '../../game/sprites';
import {
  battleSceneBackgroundStyle,
  battleSceneImageUrl,
  getBattleAmbience,
  getBattleSpriteOffsets,
} from '../../game/engine/battleAmbience';
import { trainerXpProgress } from '../../game/engine/trainerLevel';
import type { PokemonType } from '../../game/data/species';
import { getResistances, getWeaknesses } from '../../game/data/typeChart';
import { typePillStyle } from './battleTheme';
import { TypeSymbolImage } from './TypeBattleIcon';
import { StatHoverTip } from './StatHoverTip';
import { outcomePanelWithStrikeAccent } from './outcomeStyles';
import { CombatStrikeOverlay } from './CombatStrikeOverlay';
import { MOVES } from '../../game/data/moves';
import { effectivenessChipLabel, effectivenessTier } from '../../game/engine/combatExchange';
import { movesetForBattle } from '../../game/engine/moveLearn';
import { PokemonSprite } from '../components/PokemonSprite';
import { GameIcon } from '../components/GameIcon';
import { RouteFindBanner } from './RouteFindBanner';
import { BRAND } from '../theme/gameTheme';
import { PokeRemTrekStrip } from '../components/PokeRemTrekStrip';
import { TrainerXpStarBurst } from '../components/TrainerXpStarBurst';
import { useTrainerXpMoment } from '../hooks/useTrainerXpMoment';

/** Design baseline for proportions when the host width is unknown. */
const DESIGN_W = 360;

/** Minus before digits (U+2212 from narr strings or ASCII hyphen) — Press Start 2P draws the glyph low; align as a unit. */
const BATTLE_LOG_DAMAGE_RE = /(\u2212|-)(\d+)/g;

function battleLogRichText(text: string): ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let mi = 0;
  BATTLE_LOG_DAMAGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BATTLE_LOG_DAMAGE_RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    parts.push(
      <span key={`dmg-${mi++}`} className="pkr-battle-damage-token">
        <span className="pkr-battle-damage-token__sign">{m[1]}</span>
        <span className="pkr-battle-damage-token__num">{m[2]}</span>
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts.length === 0 ? text : parts.length === 1 ? parts[0]! : parts;
}

function measureElementWidth(el: Element | null): number {
  if (!el || !(el instanceof HTMLElement)) return 0;
  const r = el.getBoundingClientRect().width || el.clientWidth || 0;
  return Math.round(r);
}

/**
 * Width for scaling the battle UI. Prefer the sidebar root (`widthSourceRef`) — it tracks the
 * pane; `outer` is fallback when the ref is not yet mounted.
 */
function pickLayoutWidthPixels(wSource: number, wOuter: number): number {
  if (wSource > 0) return wSource;
  if (wOuter > 0) return wOuter;
  return 0;
}

function sortTypes(types: PokemonType[]): PokemonType[] {
  return [...types].sort((a, b) => a.localeCompare(b));
}

function tierGlow(tier?: string): string | undefined {
  if (tier === 'Legendary') return '#eab308';
  if (tier === 'Mythical') return '#a855f7';
  if (tier === 'Ultra') return '#3b82f6';
  return undefined;
}

/** Compact battle-deck label for move category (Press Start–friendly). */
function moveCategoryMeta(category: 'physical' | 'special' | 'status'): { short: string; title: string } {
  if (category === 'physical') return { short: 'PHY', title: 'Physical move' };
  if (category === 'special') return { short: 'SPC', title: 'Special move' };
  return { short: 'STA', title: 'Status move' };
}

function formatMovePowerLine(power: number): string {
  if (power <= 0) return '—';
  return `${power} PWR`;
}

function busyOverlayText(busyAction: null | 'catch' | 'fight' | 'run'): string {
  if (busyAction === 'catch') return 'Throwing…';
  if (busyAction === 'fight') return 'Attacking…';
  if (busyAction === 'run') return 'Fleeing…';
  return '…';
}

const CATCH_BALL_STOCK: { key: 'poke-ball' | 'great-ball' | 'ultra-ball'; icon: string }[] = [
  { key: 'poke-ball', icon: 'poke-ball.png' },
  { key: 'great-ball', icon: 'great-ball.png' },
  { key: 'ultra-ball', icon: 'ultra-ball.png' },
];

export function BattleReviewSurface({
  rootURL,
  state,
  active,
  hasEncounter,
  wild,
  canCatch,
  battleBusy,
  flowPhase,
  outcomeKind,
  feedbackSeq,
  busyAction,
  onCatch,
  onFightMove,
  onRun,
  encounterRate,
  currency,
  onBuyBall,
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
  flowPhase: BattleFlowPhase;
  outcomeKind: BattleOutcomeKind;
  feedbackSeq: number;
  busyAction: null | 'catch' | 'fight' | 'run';
  onCatch: () => void;
  onFightMove: (moveId: string) => void;
  onRun: () => void;
  encounterRate?: number;
  currency?: number;
  onBuyBall?: () => void;
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
  sidebarSplitLayout?: (parts: { sticky: ReactNode; lower: ReactNode }) => JSX.Element;
}) {
  const progress = state.encounterProgress;
  const effectiveRate = encounterRate ?? REVIEWS_PER_ENCOUNTER;
  const trainerProg = trainerXpProgress(state.trainerXp ?? 0);
  const trainerLv = state.trainerLevel ?? 1;
  const xpMoment = useTrainerXpMoment(state.trainerXp ?? 0, trainerLv, reducedMotion === true);
  const catchScopeCount = state.bag['catch-scope'] ?? 0;
  const [shakeSeq, setShakeSeq] = useState(0);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneImpactShake, setSceneImpactShake] = useState(false);
  const [wildTypePanelHover, setWildTypePanelHover] = useState(false);
  const [wildTypePanelPinned, setWildTypePanelPinned] = useState(false);
  const [playerTypePanelHover, setPlayerTypePanelHover] = useState(false);
  const [playerTypePanelPinned, setPlayerTypePanelPinned] = useState(false);
  const [frameW, setFrameW] = useState(DESIGN_W);
  const [fightMenu, setFightMenu] = useState(false);
  const [lungePhase, setLungePhase] = useState<'idle' | 'player' | 'wild'>('idle');
  const [wildHitFlash, setWildHitFlash] = useState(false);
  const [playerHitFlash, setPlayerHitFlash] = useState(false);
  /** Brief field hold after KO / faint so the finish doesn’t vanish on the same frame as encounter clear. */
  const [battleLinger, setBattleLinger] = useState<{
    kind: 'defeat' | 'faint';
    wild: EncounterPokemon;
    feedbackSeq: number;
  } | null>(null);
  const wildPersistRef = useRef<EncounterPokemon | null>(null);
  const lastLingerArmedSeq = useRef(0);
  const lingerClearTimerRef = useRef(0);
  const outerRef = useRef<HTMLDivElement | null>(null);
  /** Header + cave column — observed when `onFieldEndOffsetChange` is set. */
  const stickyDockRef = useRef<HTMLDivElement | null>(null);
  const prevHadEncounter = useRef(false);
  const lastCombatSeq = useRef(0);
  const pendingCatchPanelRef = useRef<HTMLDivElement | null>(null);
  const leadFaintedNoEncounter = !hasEncounter && active.currentHp <= 0;
  const showPendingCatch =
    !!pendingCaughtMon && !hasEncounter && onPendingCatchReplace && onPendingCatchCancel;

  const pendingCatchKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !pendingCatchPanelRef.current) return;
      const root = pendingCatchPanelRef.current;
      const nodes = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const list = [...nodes].filter((el) => !el.hasAttribute('disabled'));
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

  useEffect(() => {
    if (!showPendingCatch) return;
    const root = pendingCatchPanelRef.current;
    if (!root) return;
    const t = window.setTimeout(() => {
      const first = root.querySelector<HTMLElement>('button:not([disabled])');
      first?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [showPendingCatch, pendingCaughtMon?.id]);

  const legalMoves = useMemo(() => movesetForBattle(active), [active]);

  useEffect(() => {
    if (wild) wildPersistRef.current = wild;
  }, [wild]);

  const fieldWild = wild ?? battleLinger?.wild ?? null;
  const showFieldWild = !!fieldWild;

  const playerWeakIcons = useMemo(
    () =>
      hasEncounter || battleLinger ? sortTypes(getWeaknesses(active.types)).slice(0, 10) : [],
    [hasEncounter, battleLinger, active.types],
  );
  const playerResistIcons = useMemo(
    () =>
      hasEncounter || battleLinger ? sortTypes(getResistances(active.types)).slice(0, 10) : [],
    [hasEncounter, battleLinger, active.types],
  );
  const wildWeakIcons = useMemo(
    () => (fieldWild ? sortTypes(getWeaknesses(fieldWild.types)).slice(0, 10) : []),
    [fieldWild],
  );
  const wildResistIcons = useMemo(
    () => (fieldWild ? sortTypes(getResistances(fieldWild.types)).slice(0, 10) : []),
    [fieldWild],
  );
  const sceneIdx = state.battleSceneIndex ?? 0;
  const amb = getBattleAmbience(sceneIdx);
  const spriteOff = getBattleSpriteOffsets(sceneIdx);
  const sceneBg = battleSceneBackgroundStyle(rootURL, sceneIdx);
  const singleBgStyle = sceneFailed
    ? ({
        background: amb.sceneFallbackGradient,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      } as const)
    : sceneBg;

  const prevSceneIdxRef = useRef(sceneIdx);
  const [sceneBlend, setSceneBlend] = useState<{ from: number; to: number } | null>(null);
  const [sceneBlendArmed, setSceneBlendArmed] = useState(false);

  useLayoutEffect(() => {
    if (reducedMotion) {
      prevSceneIdxRef.current = sceneIdx;
      setSceneBlend(null);
      setSceneBlendArmed(false);
      return;
    }
    const prev = prevSceneIdxRef.current;
    if (prev === sceneIdx) return;
    setSceneBlend({ from: prev, to: sceneIdx });
    setSceneBlendArmed(false);
    prevSceneIdxRef.current = sceneIdx;
  }, [sceneIdx, reducedMotion]);

  useLayoutEffect(() => {
    if (!sceneBlend) return;
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setSceneBlendArmed(true));
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [sceneBlend]);

  useEffect(() => {
    if (!sceneBlend || reducedMotion) return;
    setSceneImpactShake(true);
    const t = window.setTimeout(() => setSceneImpactShake(false), 380);
    return () => clearTimeout(t);
  }, [sceneBlend, reducedMotion]);

  const sceneFadeTransition =
    'opacity var(--pkr-motion-scene, 0.42s) var(--pkr-ease-out, cubic-bezier(0.22, 1, 0.36, 1))';
  const layoutW = useMemo(() => Math.max(260, frameW), [frameW]);
  const typeIconSize = Math.min(18, Math.max(12, Math.round(layoutW * 0.045)));
  const battleHeight = Math.max(220, Math.min(360, Math.round(layoutW * 0.66)));
  const spriteSize = Math.max(102, Math.min(178, Math.round(layoutW * 0.35)));
  /** Corner HUD width — tied to measured column, not iframe `vw` (avoids spill in narrow sidebars). */
  const hudPanelMaxPx = useMemo(
    () => Math.min(150, Math.max(88, Math.round(layoutW * 0.44))),
    [layoutW],
  );

  useEffect(() => {
    if (feedbackSeq <= 0) return;
    setShakeSeq(feedbackSeq);
    const t = window.setTimeout(() => setShakeSeq(0), 500);
    return () => clearTimeout(t);
  }, [feedbackSeq]);

  useEffect(() => {
    if (!hasEncounter) {
      setFightMenu(false);
      lastCombatSeq.current = 0;
    }
  }, [hasEncounter]);

  useEffect(() => {
    if (!hasEncounter || reducedMotion || feedbackSeq <= 0) return;
    const strikeOut =
      outcomeKind === 'combat' || outcomeKind === 'faint' ? state.lastCombatStrike : null;
    if (!strikeOut) return;
    if (lastCombatSeq.current === feedbackSeq) return;
    lastCombatSeq.current = feedbackSeq;
    setLungePhase('player');
    const t1 = window.setTimeout(() => setLungePhase('wild'), 430);
    const t2 = window.setTimeout(() => setLungePhase('idle'), 860);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [feedbackSeq, outcomeKind, reducedMotion, hasEncounter, state.lastCombatStrike]);

  useEffect(() => {
    if (!hasEncounter || reducedMotion || outcomeKind !== 'combat') {
      setWildHitFlash(false);
      setPlayerHitFlash(false);
      return;
    }
    const strike = state.lastCombatStrike;
    if (!strike || feedbackSeq <= 0) return;
    setWildHitFlash(false);
    setPlayerHitFlash(false);
    const timers: number[] = [];
    const pd = strike.playerDamage ?? 0;
    const wd = strike.wildDamage ?? 0;
    if (pd > 0) {
      timers.push(window.setTimeout(() => setWildHitFlash(true), 175));
      timers.push(window.setTimeout(() => setWildHitFlash(false), 520));
    }
    if (wd > 0) {
      timers.push(window.setTimeout(() => setPlayerHitFlash(true), 405));
      timers.push(window.setTimeout(() => setPlayerHitFlash(false), 780));
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [feedbackSeq, hasEncounter, reducedMotion, outcomeKind, state.lastCombatStrike]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const read = () => {
      const wSource = measureElementWidth(widthSourceRef?.current ?? null);
      const wOuter = measureElementWidth(outer);
      let w = pickLayoutWidthPixels(wSource, wOuter);
      if (w <= 0) {
        let p: HTMLElement | null = outer.parentElement;
        for (let d = 0; p && d < 8; d++) {
          const pw = measureElementWidth(p);
          if (pw > 0) {
            w = pw;
            break;
          }
          p = p.parentElement;
        }
      }
      const next = w > 0 ? w : DESIGN_W;
      setFrameW((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    read();
    requestAnimationFrame(() => read());

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => read()) : null;
    const col = widthSourceRef?.current;
    if (col) ro?.observe(col);
    ro?.observe(outer);

    window.addEventListener('resize', read);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [widthSourceRef]);

  useEffect(() => {
    const was = prevHadEncounter.current;
    prevHadEncounter.current = hasEncounter;
    if (hasEncounter && !was) {
      const id = window.setTimeout(() => {
        requestAnimationFrame(() => {
          outerRef.current?.focus({ preventScroll: true });
        });
      }, 0);
      return () => clearTimeout(id);
    }
  }, [hasEncounter]);

  useEffect(() => {
    if (hasEncounter) {
      lastLingerArmedSeq.current = 0;
      window.clearTimeout(lingerClearTimerRef.current);
      setBattleLinger(null);
    }
  }, [hasEncounter]);

  useEffect(() => {
    if (!battleLinger) return;
    if (battleLinger.feedbackSeq !== feedbackSeq) {
      window.clearTimeout(lingerClearTimerRef.current);
      setBattleLinger(null);
    }
  }, [feedbackSeq, battleLinger]);

  useLayoutEffect(() => {
    if (hasEncounter) return;
    if (feedbackSeq <= 0) return;
    if (lastLingerArmedSeq.current === feedbackSeq) return;
    const snap = wildPersistRef.current;
    if (!snap) return;
    const defeatFinisher = outcomeKind === 'defeat' && state.lastCombatStrike?.wildDefeated === true;
    const faintEnd = outcomeKind === 'faint';
    if (!defeatFinisher && !faintEnd) return;
    lastLingerArmedSeq.current = feedbackSeq;
    const kind: 'defeat' | 'faint' = defeatFinisher ? 'defeat' : 'faint';
    const wildCopy: EncounterPokemon =
      kind === 'defeat' ? { ...snap, currentHp: 0 } : { ...snap, currentHp: Math.max(0, snap.currentHp) };
    setBattleLinger({ kind, wild: wildCopy, feedbackSeq });
    window.clearTimeout(lingerClearTimerRef.current);
    const ms = reducedMotion === true ? 260 : 660;
    lingerClearTimerRef.current = window.setTimeout(() => setBattleLinger(null), ms);
    return () => window.clearTimeout(lingerClearTimerRef.current);
  }, [hasEncounter, outcomeKind, feedbackSeq, reducedMotion, state.lastCombatStrike?.wildDefeated]);

  const wildAnimate = shakeSeq > 0 && (hasEncounter || !!battleLinger);
  const playerHpPct = active.maxHp <= 0 ? 0 : Math.max(0, Math.min(100, (active.currentHp / active.maxHp) * 100));
  const wildHpPct =
    fieldWild && fieldWild.maxHp > 0
      ? Math.max(0, Math.min(100, (fieldWild.currentHp / fieldWild.maxHp) * 100))
      : 0;

  const isDefeatOutcome = outcomeKind === 'defeat' || battleLinger?.kind === 'defeat';
  const isFaintLinger = battleLinger?.kind === 'faint';
  const inBattleField = hasEncounter || !!battleLinger;
  const wildFinishMotionClass =
    battleLinger?.kind === 'faint'
      ? 'pkr-battle-wild-faint-flee'
      : isDefeatOutcome
        ? 'animate-pkr-fade-out'
        : '';
  const isCatchOutcome = outcomeKind === 'catch_success';
  const exchangeStrike = state.lastCombatStrike;
  const showEffectivenessChips =
    !!exchangeStrike &&
    (outcomeKind === 'combat' ||
      outcomeKind === 'faint' ||
      (outcomeKind === 'defeat' && exchangeStrike.wildDefeated === true));
  const playerEffChip = exchangeStrike
    ? effectivenessChipLabel(effectivenessTier(exchangeStrike.playerEffectiveness ?? 1))
    : null;
  const wildEffChip = exchangeStrike
    ? effectivenessChipLabel(effectivenessTier(exchangeStrike.wildEffectiveness ?? 1))
    : null;
  const showArenaDamageFloats =
    hasEncounter && outcomeKind === 'combat' && !!exchangeStrike && feedbackSeq > 0;
  const playerEffTier = exchangeStrike
    ? effectivenessTier(exchangeStrike.playerEffectiveness ?? 1)
    : 'neutral';
  const wildEffTier = exchangeStrike
    ? effectivenessTier(exchangeStrike.wildEffectiveness ?? 1)
    : 'neutral';

  const ballStockChips = useMemo(() => {
    const bag = state.bag;
    return CATCH_BALL_STOCK.map((row) => ({ ...row, n: bag[row.key] ?? 0 })).filter((r) => r.n > 0);
  }, [state.bag]);
  const battleLogOutcomeStyle = useMemo(
    () => outcomePanelWithStrikeAccent(outcomeKind, state.lastCombatStrike ?? null),
    [outcomeKind, state.lastCombatStrike],
  );
  const wildTypePanelVisible = wildTypePanelPinned || wildTypePanelHover;
  const playerTypePanelVisible = playerTypePanelPinned || playerTypePanelHover;
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

  const impactShake = xpMoment.screenShake || sceneImpactShake;
  const chromeClassName = sidebarSplitLayout
    ? `shrink-0 z-[20] bg-[#0b0f14]/96 shadow-[0_8px_24px_rgba(0,0,0,0.65)] backdrop-blur-[2px]${impactShake ? ' animate-pkr-xp-impact' : ''}`
    : `sticky top-0 z-[20] shrink-0 bg-[#0b0f14]/96 shadow-[0_8px_24px_rgba(0,0,0,0.65)] backdrop-blur-[2px]`;
  const outerClassName = `pkr-battle-outer pkr-retro-chrome relative w-full min-w-0 max-w-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--pkr-accent)] focus-visible:ring-opacity-40 focus-visible:ring-offset-2 focus-visible:ring-offset-black/55${
    sidebarSplitLayout ? '' : impactShake ? ' animate-pkr-xp-impact' : ''
  }`;

  const chromeBody = (
    <>
      {/* Sticky with sidebar scroll: trainer row + banners + cave stay put; command deck slides underneath. */}
      <div ref={stickyDockRef} className={chromeClassName}>
      {/* Header bar — min-w-0 + overflow so wide viewports do not force this row wider than the sidebar column */}
      <div
        className={`pkr-battle-header-bar flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-x-hidden px-2 py-1.5 sm:gap-1.5 sm:px-2.5 ${
          xpMoment.focusXpUi ? 'pkr-battle-header-bar--xp-moment' : ''
        }`}
      >
        <StatHoverTip label={`${BRAND.wordmark} — trainer summary for this sidebar.`}>
          <span className="pkr-pixel-title shrink-0 text-[6px] leading-tight sm:text-[7px]" style={{ color: 'var(--pkr-pill-active-text)' }}>
            {BRAND.wordmark}
          </span>
        </StatHoverTip>
        <StatHoverTip
          className="min-w-0 flex-1"
          label={`Trainer level ${trainerLv} (${state.trainerRank ?? 'Trainer'}). The gold bar is trainer XP toward the next level — earn XP from flashcards, wild battles, streaks, catches, achievements (tiered), and other actions.`}
        >
            <span
              className={`relative flex min-w-0 w-full items-center gap-1.5 ${
                xpMoment.focusXpUi ? 'pkr-battle-xp-moment' : ''
              }`}
            >
              {xpMoment.showStarBurst ? (
                <TrainerXpStarBurst
                  burstKey={xpMoment.fillPulseKey}
                  variant={xpMoment.burstVariant === 'reward' ? 'xp' : xpMoment.burstVariant}
                />
              ) : null}
              {xpMoment.focusXpUi && xpMoment.lastGain > 0 ? (
                <span key={xpMoment.fillPulseKey} className="pkr-battle-xp-gain-float" aria-hidden>
                  +{xpMoment.lastGain} XP
                </span>
              ) : null}
              <span
                className="shrink-0 rounded-full px-1.5 py-px text-[8px] font-black"
                style={{ background: 'rgba(251,191,36,0.25)', color: '#fde68a', border: '1px solid rgba(251,191,36,0.3)' }}
              >
                Lv{trainerLv}
              </span>
              <div className="pkr-meter-track h-2 min-w-0 flex-1 overflow-hidden">
                <div
                  key={`${feedbackSeq}-${xpMoment.fillPulseKey}`}
                  className={`pkr-meter-fill pkr-xp-bar-fill--pulse h-full transition-[width] ${
                    xpMoment.focusXpUi ? 'duration-1000 ease-out pkr-xp-bar-fill--sparkle' : 'duration-500'
                  }`}
                  style={{ width: `${trainerProg.percent}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #fde047 100%)' }}
                />
              </div>
            </span>
        </StatHoverTip>
        {(state.currentStreak ?? 0) > 0 && (
          <StatHoverTip
            label={`Study streak — consecutive UTC calendar days you completed at least one flashcard while ${BRAND.wordmark} is active. Resets if you skip a day.`}
          >
            <span className="flex items-center gap-0.5 text-[9px] font-bold" style={{ color: '#fdba74' }}>
              <GameIcon name="flame" size={11} />
              {state.currentStreak}
            </span>
          </StatHoverTip>
        )}
        <StatHoverTip label="Pokécoins — currency for the Shop (balls, potions, and more). Earned from reviews and battle actions.">
          <span className="flex items-center gap-0.5 shrink-0 text-[9px] font-bold tabular-nums" style={{ color: '#fcd34d' }}>
            <GameIcon name="coin" size={11} />
            {state.currency ?? 0}
          </span>
        </StatHoverTip>
        <StatHoverTip
          label={`Cards reviewed — total flashcards you’ve finished in RemNote with ${BRAND.wordmark} loaded (lifetime counter).`}
        >
          <span className="flex items-center gap-0.5 shrink-0 text-[9px] font-bold tabular-nums" style={{ color: '#cbd5e1' }}>
            <GameIcon name="book" size={11} />
            {state.cardsReviewed}
          </span>
        </StatHoverTip>
        {showDailyHeaderStats && state.dailyStats && layoutW >= 300 ? (
          <StatHoverTip label="Today (UTC) — flashcards completed / wild encounters started / successful catches. Resets at UTC midnight.">
            <span className="flex shrink-0 items-center gap-0.5 text-[8px] font-bold tabular-nums" style={{ color: 'var(--pkr-accent-muted)' }}>
              <GameIcon name="chart" size={10} />
              {state.dailyStats.reviews}/{state.dailyStats.encounters}/{state.dailyStats.catches}
            </span>
          </StatHoverTip>
        ) : null}
      </div>

      {leadFaintedNoEncounter ? (
        <div
          role="status"
          className="border-b px-2.5 py-1.5 text-center text-[9px] font-bold leading-snug"
          style={{
            background: 'linear-gradient(90deg, rgba(127,29,29,0.5) 0%, rgba(30,27,46,0.95) 50%, rgba(127,29,29,0.5) 100%)',
            borderColor: 'rgba(248,113,113,0.35)',
            color: '#fecaca',
          }}
        >
          Lead has fainted — wild encounters are paused. Use <strong style={{ color: '#fde68a' }}>Bag</strong> to heal or{' '}
          <strong style={{ color: '#fde68a' }}>Party</strong> to switch your active Pokémon.
        </div>
      ) : null}

      {outcomeKind === 'evolution' && feedbackSeq > 0 ? (
        <div
          className="flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest"
          style={{
            background: 'linear-gradient(90deg, #581c87 0%, #a855f7 50%, #581c87 100%)',
            color: '#faf5ff',
            boxShadow: '0 0 12px rgba(168,85,247,0.45)',
          }}
        >
          <span>Evolution</span>
        </div>
      ) : null}

      {/* ═══ Battle field — classic Pokemon layout ═══ */}
      <div
        className="pkr-battle-field relative w-full overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
        style={{ height: `${battleHeight}px` }}
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          {sceneBlend && !reducedMotion ? (
            <>
              <div
                className="pkr-scene-crossfade-layer absolute inset-0"
                style={{
                  ...battleSceneBackgroundStyle(rootURL, sceneBlend.from),
                  opacity: sceneBlendArmed ? 0 : 1,
                  transition: sceneBlendArmed ? sceneFadeTransition : 'none',
                }}
                aria-hidden
              />
              <div
                className="pkr-scene-crossfade-layer absolute inset-0"
                style={{
                  ...(sceneFailed ? singleBgStyle : battleSceneBackgroundStyle(rootURL, sceneBlend.to)),
                  opacity: sceneBlendArmed ? 1 : 0,
                  transition: sceneBlendArmed ? sceneFadeTransition : 'none',
                }}
                aria-hidden
                onTransitionEnd={(e) => {
                  if (e.propertyName !== 'opacity') return;
                  if (e.target !== e.currentTarget) return;
                  setSceneBlend(null);
                  setSceneBlendArmed(false);
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0" style={{ ...singleBgStyle }} />
          )}
        </div>
        {!reducedMotion ? <div className="pkr-crt-lines" aria-hidden /> : null}
        {/* Centered arena shadow — grounds sprites on scene art */}
        <div
          className="pointer-events-none absolute bottom-[6%] left-1/2 z-[2] h-[26%] w-[78%] -translate-x-1/2"
          style={{
            background: 'radial-gradient(ellipse 85% 55% at 50% 60%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 45%, transparent 72%)',
          }}
          aria-hidden
        />
        <img
          src={battleSceneImageUrl(rootURL, sceneIdx)}
          alt=""
          style={{ display: 'none' }}
          onError={() => setSceneFailed(true)}
          onLoad={() => setSceneFailed(false)}
        />

        <CombatStrikeOverlay
          rootURL={rootURL}
          strike={state.lastCombatStrike ?? null}
          lungePhase={lungePhase}
          reducedMotion={reducedMotion}
        />

        {showArenaDamageFloats && !reducedMotion && exchangeStrike ? (
          <>
            {(exchangeStrike.playerDamage ?? 0) > 0 ? (
              <div
                key={`wild-dmg-${feedbackSeq}`}
                className="pointer-events-none absolute right-[8%] top-[22%] z-[8] pkr-dmg-float pkr-dmg-float--wild pkr-pixel-title"
                aria-hidden
              >
                −{exchangeStrike.playerDamage}
              </div>
            ) : null}
            {(exchangeStrike.wildDamage ?? 0) > 0 ? (
              <div
                key={`pl-dmg-${feedbackSeq}`}
                className="pointer-events-none absolute left-[12%] bottom-[38%] z-[8] pkr-dmg-float pkr-dmg-float--player pkr-pixel-title"
                aria-hidden
              >
                −{exchangeStrike.wildDamage}
              </div>
            ) : null}
          </>
        ) : null}

        {battleLinger ? (
          <div
            className="pointer-events-none absolute inset-0 z-[12] flex flex-col items-center justify-end pb-[16%]"
            aria-hidden
          >
            <div className="pkr-battle-finish-veil absolute inset-0" />
            {reducedMotion ? (
              <span className="pkr-battle-finish-stamp pkr-battle-finish-stamp--static relative z-[1]">
                {battleLinger.kind === 'defeat' ? 'Defeated' : 'Fainted'}
              </span>
            ) : battleLinger.kind === 'defeat' ? (
              <span className="pkr-battle-finish-stamp relative z-[1]">KO</span>
            ) : (
              <span className="pkr-battle-finish-stamp pkr-battle-finish-stamp--faint relative z-[1]">Fainted</span>
            )}
          </div>
        ) : null}

        {/* ── Wild info plate (top-right corner) ── */}
        {showFieldWild && fieldWild ? (
          <div
            className={`pkr-battle-hud pkr-battle-hud--compact absolute right-1 top-1 z-[25] max-w-full px-1.5 py-1 text-right sm:right-1.5 ${battleLinger ? 'pointer-events-none opacity-90' : ''}`}
            onMouseEnter={() => !battleLinger && setWildTypePanelHover(true)}
            onMouseLeave={() => !battleLinger && setWildTypePanelHover(false)}
            onClick={() => !battleLinger && setWildTypePanelPinned((v) => !v)}
            role={battleLinger ? 'presentation' : 'button'}
            tabIndex={battleLinger ? -1 : 0}
            onKeyDown={(e) => {
              if (battleLinger) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setWildTypePanelPinned((v) => !v);
              }
            }}
            aria-expanded={wildTypePanelVisible}
            style={{
              maxWidth: hudPanelMaxPx,
              borderColor: `${amb.accent}55`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 1px 1px 0 rgba(0,0,0,0.38), 0 0 12px ${amb.accent}22`,
              cursor: battleLinger ? 'default' : 'pointer',
            }}
          >
            <div className="pkr-battle-hud-role mb-0.5" style={{ color: amb.accentMuted }}>
              Wild
            </div>
            {(fieldWild.tier && fieldWild.tier !== 'Common') || fieldWild.shiny ? (
              <div className="mb-0.5 flex flex-wrap items-center justify-end gap-0.5">
                {fieldWild.tier && fieldWild.tier !== 'Common' ? (
                  <span
                    className="rounded-sm px-1 py-px text-[5px] font-bold uppercase leading-none sm:text-[6px]"
                    style={{
                      background: fieldWild.tier === 'Legendary' ? '#eab308' : fieldWild.tier === 'Mythical' ? '#a855f7' : fieldWild.tier === 'Ultra' ? '#3b82f6' : '#f472b6',
                      color: fieldWild.tier === 'Legendary' ? '#422006' : 'white',
                      boxShadow: '0 0 6px rgba(0,0,0,0.35)',
                    }}
                  >
                    {fieldWild.tier}
                  </span>
                ) : null}
                {fieldWild.shiny ? (
                  <span
                    className="rounded-sm px-1 py-px text-[5px] font-black uppercase leading-none sm:text-[6px]"
                    style={{
                      background: 'linear-gradient(90deg, #fde047, #facc15)',
                      color: '#422006',
                      boxShadow: '0 0 6px rgba(250, 204, 21, 0.55)',
                    }}
                    title="Shiny Pokémon"
                  >
                    Shiny
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="line-clamp-2 text-[7px] font-black leading-tight sm:text-[8px]" style={{ color: 'white' }}>
              <span className="break-words">{fieldWild.name}</span>{' '}
              <span className="whitespace-nowrap font-bold" style={{ color: '#fca5a5' }}>
                Lv{fieldWild.level}
              </span>
            </div>
            <div className="mt-0.5 flex flex-row-reverse items-center gap-1">
              <span className="shrink-0 text-[6px] font-bold tabular-nums leading-none sm:text-[7px]" style={{ color: '#fecaca' }}>
                {Math.floor(fieldWild.currentHp)}/{Math.floor(fieldWild.maxHp)}
              </span>
              <div className="pkr-battle-hp-track h-[4px] min-w-0 flex-1 overflow-hidden">
                <div
                  className={`pkr-battle-hp-fill h-full transition-[width] duration-300 ${wildHitFlash ? 'pkr-hp-fill-hit' : ''}`}
                  style={{ width: `${wildHpPct}%`, background: 'linear-gradient(180deg,#fca5a5 0%,#ef4444 55%,#b91c1c 100%)' }}
                />
              </div>
            </div>
            <div className={`pkr-battle-type-panel ${wildTypePanelVisible ? 'pkr-battle-type-panel--open' : ''}`}>
            {sortTypes(fieldWild.types).length > 0 ? (
              <div className="mt-1 flex flex-wrap items-center justify-end gap-0.5" title="Wild Pokémon types">
                {sortTypes(fieldWild.types).map((t) => (
                  <TypeSymbolImage key={`wt-${t}`} rootURL={rootURL} type={t} size={Math.min(typeIconSize, 16)} variant="resist" reducedMotion={reducedMotion} />
                ))}
              </div>
            ) : null}
            {wildResistIcons.length > 0 ? (
              <div className="mt-1 flex min-w-0 flex-wrap items-center justify-end gap-0.5">
                <span className="shrink-0 text-[11px] font-black leading-none" style={{ color: '#86efac' }} title="Resists your attacks (not very effective)">
                  ↑
                </span>
                {wildResistIcons.map((t) => (
                  <TypeSymbolImage
                    key={`wr-${t}`}
                    rootURL={rootURL}
                    type={t}
                    size={typeIconSize}
                    variant="resist"
                    reducedMotion={reducedMotion}
                  />
                ))}
              </div>
            ) : null}
            {wildWeakIcons.length > 0 ? (
              <div className="mt-0.5 flex min-w-0 flex-wrap items-center justify-end gap-0.5">
                <span className="shrink-0 text-[11px] font-black leading-none" style={{ color: '#fca5a5' }} title="Weak to your attacks (super-effective)">
                  ↓
                </span>
                {wildWeakIcons.map((t) => (
                  <TypeSymbolImage
                    key={`ww-${t}`}
                    rootURL={rootURL}
                    type={t}
                    size={typeIconSize}
                    variant="weak"
                    reducedMotion={reducedMotion}
                  />
                ))}
              </div>
            ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Wild sprite (upper platform — nudged toward pad) ── */}
        <div
          className="absolute z-10"
          style={{
            right: '1.1rem',
            top: '30%',
            transform: `translate(${spriteOff.wildX - 2}px, ${spriteOff.wildY + 12}px)`,
          }}
        >
          {showFieldWild && fieldWild ? (
            <div
              className={`${wildAnimate ? 'animate-pkr-shake' : ''} ${wildFinishMotionClass} ${isCatchOutcome ? 'animate-pkr-catch-bounce' : ''} ${lungePhase === 'wild' && !reducedMotion && !battleLinger ? 'animate-pkr-lunge-wild' : ''} ${wildHitFlash ? 'pkr-battle-target-hit' : ''}`}
            >
              <PokemonSprite
                src={frontSpriteUrl(rootURL, fieldWild.dexNum)}
                alt={fieldWild.name}
                size={spriteSize}
                glow={tierGlow(fieldWild.tier)}
                shiny={fieldWild.shiny === true}
                reducedMotion={reducedMotion}
              />
            </div>
          ) : (
            <div className="animate-pkr-float flex items-center justify-center" style={{ width: spriteSize, height: spriteSize }}>
              <span className="text-5xl font-black drop-shadow-lg" style={{ color: 'rgba(255,255,255,0.4)', textShadow: '0 0 20px rgba(255,255,255,0.15)' }}>?</span>
            </div>
          )}
        </div>

        {/* ── Player sprite (lower platform — closer to circle) ── */}
        <div
          className="absolute z-10"
          style={{
            left: '0.5rem',
            bottom: '3%',
            transform: `translate(${spriteOff.playerX}px, ${spriteOff.playerY + 4}px)`,
          }}
        >
          <div
            className={`${lungePhase === 'player' && !reducedMotion && !battleLinger ? 'animate-pkr-lunge-player' : ''} ${playerHitFlash ? 'pkr-battle-target-hit' : ''} ${isFaintLinger ? 'animate-pkr-fade-out' : ''}`}
          >
            <PokemonSprite
              src={backSpriteUrl(rootURL, active.dexNum)}
              alt={active.name}
              size={spriteSize}
              shiny={active.shiny === true}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>

        {/* ── Player info plate (top-left corner) ── */}
        <div
          className="pkr-battle-hud pkr-battle-hud--compact absolute left-1 top-1 z-[25] max-w-full px-1.5 py-1 text-left sm:left-1.5"
          onMouseEnter={() => setPlayerTypePanelHover(true)}
          onMouseLeave={() => setPlayerTypePanelHover(false)}
          onClick={() => setPlayerTypePanelPinned((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setPlayerTypePanelPinned((v) => !v);
            }
          }}
          aria-expanded={playerTypePanelVisible}
          style={{
            maxWidth: hudPanelMaxPx,
            borderColor: `${amb.accent}55`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 1px 1px 0 rgba(0,0,0,0.38), 0 0 12px ${amb.accent}22`,
            cursor: 'pointer',
          }}
        >
          {!hasEncounter && !battleLinger ? (
            <div className="mb-0.5 text-[6px] font-bold leading-none sm:text-[7px]" style={{ color: '#a5b4fc' }}>
              {leadFaintedNoEncounter
                ? 'Wilds paused — heal or switch'
                : `Wild in ${Math.max(0, effectiveRate - progress)} review${Math.max(0, effectiveRate - progress) === 1 ? '' : 's'}`}
            </div>
          ) : (
            <div className="pkr-battle-hud-role mb-0.5" style={{ color: amb.accentMuted }}>
              {battleLinger && !hasEncounter ? (battleLinger.kind === 'faint' ? 'You — down' : 'Victory') : 'You'}
            </div>
          )}
          {inBattleField && active.shiny ? (
            <div className="mb-0.5">
              <span
                className="inline-block rounded-sm px-1 py-px text-[5px] font-black uppercase leading-none sm:text-[6px]"
                style={{
                  background: 'linear-gradient(90deg, #fde047, #facc15)',
                  color: '#422006',
                  boxShadow: '0 0 6px rgba(250, 204, 21, 0.55)',
                }}
                title="Shiny Pokémon"
              >
                Shiny
              </span>
            </div>
          ) : null}
          <div className="line-clamp-2 text-[7px] font-black leading-tight sm:text-[8px]" style={{ color: 'white' }}>
            <span className="break-words">{active.nickname || active.name}</span>{' '}
            <span className="whitespace-nowrap font-bold" style={{ color: '#bef264' }}>
              Lv{active.level}
            </span>
          </div>
          <div className="mt-0.5 flex flex-row-reverse items-center gap-1">
            <span className="shrink-0 text-[6px] font-bold tabular-nums leading-none sm:text-[7px]" style={{ color: '#cbd5e1' }}>
              {Math.floor(active.currentHp)}/{Math.floor(active.maxHp)}
            </span>
            <div className="pkr-battle-hp-track h-[4px] min-w-0 flex-1 overflow-hidden">
              <div
                className={`pkr-battle-hp-fill h-full transition-[width] duration-300 ${playerHitFlash ? 'pkr-hp-fill-hit' : ''}`}
                style={{ width: `${playerHpPct}%`, background: 'linear-gradient(180deg,#bef264 0%,#84cc16 50%,#4d7c0f 100%)' }}
              />
            </div>
          </div>
          <div className={`pkr-battle-type-panel ${playerTypePanelVisible ? 'pkr-battle-type-panel--open' : ''}`}>
          {inBattleField && sortTypes(active.types).length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center justify-start gap-0.5" title="Your active Pokémon types">
              {sortTypes(active.types).map((t) => (
                <TypeSymbolImage key={`pt-${t}`} rootURL={rootURL} type={t} size={Math.min(typeIconSize, 16)} variant="resist" reducedMotion={reducedMotion} />
              ))}
            </div>
          ) : null}
          {inBattleField && fieldWild ? (
            <>
              {playerResistIcons.length > 0 ? (
                <div className="mt-1 flex min-w-0 flex-wrap items-center justify-start gap-0.5">
                  <span className="shrink-0 text-[11px] font-black leading-none" style={{ color: '#86efac' }} title="Resists (not very effective)">
                    ↑
                  </span>
                  {playerResistIcons.map((t) => (
                    <TypeSymbolImage
                      key={`pr-${t}`}
                      rootURL={rootURL}
                      type={t}
                      size={typeIconSize}
                      variant="resist"
                      reducedMotion={reducedMotion}
                    />
                  ))}
                </div>
              ) : null}
              {playerWeakIcons.length > 0 ? (
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center justify-start gap-0.5">
                  <span className="shrink-0 text-[11px] font-black leading-none" style={{ color: '#fca5a5' }} title="Weaknesses (super-effective)">
                    ↓
                  </span>
                  {playerWeakIcons.map((t) => (
                    <TypeSymbolImage
                      key={`pw-${t}`}
                      rootURL={rootURL}
                      type={t}
                      size={typeIconSize}
                      variant="weak"
                      reducedMotion={reducedMotion}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          </div>
        </div>

        {/* ── Trek / encounter progress (bottom center) ── */}
        <div
          className="absolute bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-0.5"
          title={`${progress} of ${effectiveRate} reviews toward the next wild check`}
        >
          <span className="pkr-battle-hud-role" style={{ color: amb.accentMuted }}>
            Next wild
          </span>
          <PokeRemTrekStrip
            variant="battle"
            rootURL={rootURL}
            effectiveRate={effectiveRate}
            progress={progress}
            hasEncounter={hasEncounter}
            accent={amb.accent}
          />
        </div>

        {hasEncounter && battleBusy ? (
          <div className="pkr-battle-busy-overlay" aria-live="polite" aria-busy="true">
            <span className="pkr-battle-busy-overlay__label">{busyOverlayText(busyAction)}</span>
          </div>
        ) : null}
      </div>
      </div>
    </>
  );

  const lowerBody = (
    <>
      {/* ═══ Command deck — primary control surface ═══ */}
      <div
        className="pkr-retro-chrome pkr-battle-command-shell min-w-0 border-t-2 px-2.5 pb-2.5 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        style={{
          background: amb.commandBarGradient,
          borderTopColor: amb.accent,
          borderTopWidth: 2,
        }}
      >
        <div className="pkr-battle-message-stack mb-2">
          <RouteFindBanner
            rootURL={rootURL}
            notice={state.routeFindNotice}
            noticeSeq={state.routeFindNoticeSeq ?? 0}
            accent={amb.accent}
            accentMuted={amb.accentMuted}
            reducedMotion={reducedMotion}
          />
          {showEffectivenessChips &&
          exchangeStrike &&
          (playerEffTier !== 'neutral' ||
            (exchangeStrike.wildDefeated !== true && wildEffTier !== 'neutral')) ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5" aria-hidden>
              {playerEffTier !== 'neutral' && playerEffChip ? (
                <span className={`pkr-eff-chip pkr-eff-chip--${playerEffTier}`}>You · {playerEffChip}</span>
              ) : null}
              {exchangeStrike.wildDefeated !== true && wildEffTier !== 'neutral' && wildEffChip ? (
                <span className={`pkr-eff-chip pkr-eff-chip--${wildEffTier}`}>Wild · {wildEffChip}</span>
              ) : null}
            </div>
          ) : null}
          {state.lastBattleLog ? (
            <p
              key={feedbackSeq}
              className="pkr-pixel-dialog pkr-battle-outcome-box animate-pkr-flash rounded-md border-2 px-2.5 py-2 text-[8px] font-black leading-relaxed transition-[box-shadow,border-color] duration-300"
              style={battleLogOutcomeStyle}
              title={state.lastBattleLog}
            >
              {battleLogRichText(state.lastBattleLog)}
            </p>
          ) : null}
        </div>

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
            <div className="pkr-battle-move-deck space-y-2">
              <div className="flex items-end justify-between gap-2 border-b border-white/10 pb-1.5">
                <div className="min-w-0">
                  <div className="pkr-pixel-title text-[5px] font-black uppercase leading-tight tracking-widest" style={{ color: amb.accentMuted }}>
                    Command deck
                  </div>
                  <div className="mt-0.5 text-[8px] font-black uppercase leading-tight" style={{ color: '#f1f5f9' }}>
                    Choose a move
                  </div>
                </div>
                <span className="shrink-0 pkr-pixel-title text-[5px] leading-none" style={{ color: amb.uiMuted }}>
                  {legalMoves.length} moves
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {legalMoves.slice(0, 4).map((moveId, mi) => {
                  const m = MOVES[moveId];
                  const pill = m ? typePillStyle(m.type) : undefined;
                  const cat = m ? moveCategoryMeta(m.category) : { short: '', title: '' };
                  return (
                    <button
                      key={`${moveId}-${mi}`}
                      type="button"
                      tabIndex={-1}
                      disabled={battleBusy || legalMoves.length === 0 || active.currentHp <= 0}
                      onClick={() => {
                        onFightMove(moveId);
                        setFightMenu(false);
                      }}
                      className={`pkr-game-btn pkr-battle-move-tile group flex min-h-[58px] flex-col justify-between rounded-lg border-2 px-2 py-1.5 text-left transition-[transform,filter,box-shadow] duration-150 ease-out hover:brightness-[1.06] active:translate-y-px active:scale-[0.98] disabled:opacity-35 ${commandDeckHoverLift}`}
                      style={{
                        borderColor: (pill?.borderColor as string) ?? 'rgba(148,163,184,0.5)',
                        background: (pill?.backgroundColor as string) ?? 'rgba(30,41,59,0.9)',
                        color: (pill?.color as string) ?? '#f8fafc',
                        boxShadow:
                          battleBusy && busyAction === 'fight'
                            ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px ${amb.accent}55`
                            : `inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 0 rgba(0,0,0,0.35)`,
                      }}
                      title={m ? `${m.name} — ${m.type}, ${cat.title}, power ${m.power}` : moveId}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="line-clamp-2 min-w-0 flex-1 text-[9px] font-black uppercase leading-tight">
                          {battleBusy && busyAction === 'fight' ? '…' : (m?.name ?? moveId)}
                        </div>
                        {m ? (
                          <span
                            className="pkr-battle-move-cat shrink-0"
                            title={cat.title}
                          >
                            {cat.short}
                          </span>
                        ) : null}
                      </div>
                      {m ? (
                        <div className="mt-1 flex items-center justify-between gap-1 border-t border-black/25 pt-1">
                          <div className="flex min-w-0 items-center gap-1">
                            <TypeSymbolImage rootURL={rootURL} type={m.type} size={14} reducedMotion={reducedMotion} />
                            <span className="truncate text-[7px] font-bold opacity-95">{m.type}</span>
                          </div>
                          <span className="shrink-0 pkr-pixel-title text-[5px] leading-none opacity-90">
                            {formatMovePowerLine(m.power)}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                tabIndex={-1}
                disabled={battleBusy}
                onClick={() => setFightMenu(false)}
                className={`pkr-game-btn pkr-battle-cmd-back w-full rounded-lg border-2 px-2 py-1.5 text-[9px] font-bold transition-[transform,filter] duration-150 ease-out hover:brightness-[1.04] active:translate-y-px ${commandDeckHoverLift}`}
                style={{
                  borderColor: `${amb.accent}77`,
                  background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                  color: '#e2e8f0',
                }}
              >
                ← Back to commands
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="pkr-pixel-title mb-0.5 text-center text-[5px] uppercase tracking-[0.2em]" style={{ color: amb.accentMuted }}>
                Battle menu
              </div>
              <div className="flex min-h-[58px] flex-row items-stretch gap-2">
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={!canCatch || battleBusy}
                  onClick={onCatch}
                  className={`pkr-game-btn pkr-battle-cmd-side flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1 py-1.5 text-center transition-[transform,filter] duration-150 ease-out hover:brightness-[1.04] active:translate-y-px disabled:opacity-35 ${commandDeckHoverLift}`}
                  style={{
                    borderColor: canCatch ? '#b45309' : 'rgba(180,83,9,0.35)',
                    background: 'linear-gradient(180deg, #fde047 0%, #eab308 42%, #ca8a04 100%)',
                    filter: !canCatch ? 'saturate(0.65) brightness(0.92)' : undefined,
                  }}
                  title={!canCatch ? 'No Poké Balls in bag' : 'Throw a ball (uses your best available ball in the engine)'}
                >
                  <GameIcon name="pokeball" size={15} className="shrink-0" style={{ color: '#451a03' }} />
                  <div className="whitespace-nowrap text-[9px] font-black uppercase leading-none" style={{ color: '#451a03' }}>
                    {battleBusy && busyAction === 'catch' ? '…' : 'Catch'}
                  </div>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={battleBusy || legalMoves.length === 0 || active.currentHp <= 0}
                  onClick={() => setFightMenu(true)}
                  className={`pkr-game-btn pkr-battle-cmd-fight group relative flex min-h-[58px] min-w-[38%] flex-[1.2] flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1.5 py-1.5 text-center transition-[transform,filter,box-shadow] duration-150 ease-out hover:brightness-[1.07] active:translate-y-px disabled:opacity-35 ${commandDeckHoverLift}`}
                  style={{
                    borderColor: '#fecaca',
                    background: 'linear-gradient(180deg, #fb7185 0%, #dc2626 42%, #991b1b 100%)',
                    boxShadow: `0 0 0 1px rgba(0,0,0,0.35), 0 0 14px ${amb.accent}33`,
                  }}
                  title={active.currentHp <= 0 ? 'Lead has fainted' : 'Open move list — attack the wild Pokémon'}
                >
                  <span
                    className="pointer-events-none absolute inset-x-1 top-1 h-px rounded-full opacity-50"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }}
                    aria-hidden
                  />
                  <GameIcon name="swords" size={18} className="shrink-0 text-white drop-shadow-sm" />
                  <div className="whitespace-nowrap text-[11px] font-black uppercase leading-none tracking-wide" style={{ color: '#ffffff', textShadow: '0 1px 0 rgba(0,0,0,0.35)' }}>
                    {battleBusy && busyAction === 'fight' ? '…' : 'Fight'}
                  </div>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={battleBusy}
                  onClick={onRun}
                  className={`pkr-game-btn pkr-battle-cmd-side flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1 py-1.5 text-center transition-[transform,filter] duration-150 ease-out hover:brightness-[1.04] active:translate-y-px disabled:opacity-35 ${commandDeckHoverLift}`}
                  style={{
                    borderColor: '#0f766e',
                    background: 'linear-gradient(180deg, #99f6e4 0%, #2dd4bf 35%, #0d9488 100%)',
                  }}
                  title="Flee this encounter"
                >
                  <GameIcon name="flee" size={15} className="shrink-0" style={{ color: '#042f2e' }} />
                  <div
                    className="whitespace-nowrap text-[9px] font-black uppercase leading-none"
                    style={{ color: '#042f2e', textShadow: '1px 1px 0 rgba(255,255,255,0.22)' }}
                  >
                    {battleBusy && busyAction === 'run' ? '…' : 'Run'}
                  </div>
                </button>
              </div>
              {ballStockChips.length > 0 ? (
                <div
                  className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border px-2 py-1"
                  style={{ borderColor: `${amb.accent}44`, background: 'rgba(0,0,0,0.22)' }}
                  title="Catch balls in your bag"
                >
                  <span className="pkr-pixel-title shrink-0 text-[4px] uppercase" style={{ color: amb.accentMuted }}>
                    Balls
                  </span>
                  {ballStockChips.map((row) => (
                    <span key={row.key} className="flex items-center gap-0.5 text-[8px] font-bold tabular-nums" style={{ color: '#fef9c3' }}>
                      <img src={itemIconUrl(rootURL, row.icon)} alt="" width={14} height={14} style={{ imageRendering: 'pixelated' }} />
                      ×{row.n}
                    </span>
                  ))}
                </div>
              ) : null}
              {catchScopeCount > 0 && hasEncounter && onCatchScope ? (
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={battleBusy}
                  onClick={onCatchScope}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-wide active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: 'rgba(147,197,253,0.5)',
                    background: 'linear-gradient(180deg, rgba(30,58,138,0.5) 0%, rgba(15,23,42,0.85) 100%)',
                    color: '#bfdbfe',
                    boxShadow: '0 0 10px rgba(59,130,246,0.25)',
                  }}
                  title="Use one Catch Scope to read approximate catch odds for your next throw (consumes 1 scope)."
                >
                  Catch Scope ×{catchScopeCount}
                </button>
              ) : null}
            </div>
          )
        ) : leadFaintedNoEncounter ? (
          <div
            className="rounded-lg py-2.5 text-center text-[10px] font-bold leading-snug"
            style={{ border: `1px dashed ${amb.exploreBorder}`, background: 'rgba(0,0,0,0.2)', color: amb.exploreText }}
          >
            Heal or switch lead to resume wild Pokémon.
          </div>
        ) : (
          <div
            className="rounded-lg py-2.5 text-center text-[11px] font-bold"
            style={{ border: `1px dashed ${amb.exploreBorder}`, background: 'rgba(0,0,0,0.2)', color: amb.exploreText }}
          >
            Keep reviewing — wild in {effectiveRate - progress} cards
          </div>
        )}
        {!canCatch && hasEncounter ? (
          <div className="mt-1 flex items-center justify-center gap-2 text-[10px] font-bold" style={{ color: '#fcd34d' }}>
            <span>No balls</span>
            {onBuyBall && (currency ?? 0) >= 100 ? (
              <button
                type="button"
                onClick={onBuyBall}
                className="rounded-md border px-2 py-0.5 text-[9px] font-black shadow-sm active:translate-y-px"
                style={{ borderColor: '#f59e0b', background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)', color: '#78350f' }}
              >
                Buy Poke Ball (P100)
              </button>
            ) : (
              <span style={{ color: 'rgba(251,191,36,0.6)' }}>— Defeat or Run</span>
            )}
          </div>
        ) : null}
        </div>
      </div>

      {showPendingCatch && pendingCaughtMon ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-2 sm:items-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          role="presentation"
        >
          <div
            ref={pendingCatchPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose party member to send to storage"
            tabIndex={-1}
            onKeyDown={pendingCatchKeyDown}
            className="pkr-battle-hud max-h-[min(72vh,400px)] w-full max-w-sm overflow-y-auto rounded-lg border p-3 shadow-xl outline-none"
            style={{ borderColor: 'var(--pkr-panel-border)', background: 'var(--pkr-sidebar-gradient)' }}
          >
            <div className="text-[11px] font-black" style={{ color: 'var(--pkr-pill-active-text)' }}>
              Party is full — make room?
            </div>
            <div className="mt-1 text-[9px] font-semibold" style={{ color: 'var(--pkr-accent-muted)' }}>
              <span className="font-bold text-amber-200">{pendingCaughtMon.nickname || pendingCaughtMon.name}</span> was
              caught. Pick who goes to storage, or keep the party and send the new catch to the PC.
            </div>
            <div className="mt-2 space-y-1">
              {partyForReplace.map((m) => {
                const dn = m.nickname || m.name;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-opacity hover:opacity-95"
                    style={{ borderColor: 'var(--pkr-secondary-btn-border)', background: 'rgba(0,0,0,0.35)' }}
                    onClick={() => onPendingCatchReplace!(m.id)}
                  >
                    <PokemonSprite src={frontSpriteUrl(rootURL, m.dexNum)} alt={dn} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10px] font-bold" style={{ color: '#f1f5f9' }}>{dn}</div>
                      <div className="text-[8px] font-semibold" style={{ color: '#94a3b8' }}>Lv{m.level}</div>
                    </div>
                    {m.id === activePartyId ? (
                      <span className="shrink-0 rounded px-1 py-px text-[7px] font-black uppercase" style={{ background: 'var(--pkr-accent)', color: '#0f172a' }}>Lead</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="mt-2 w-full pkr-btn-secondary text-[10px]"
              onClick={() => onPendingCatchCancel!()}
            >
              Send new Pokémon to storage
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  if (sidebarSplitLayout) {
    return sidebarSplitLayout({
      sticky: chromeBody,
      lower: (
        <div
          ref={outerRef}
          tabIndex={0}
          className={outerClassName}
          role="region"
          aria-label={`${BRAND.wordmark} battle`}
        >
          {lowerBody}
        </div>
      ),
    });
  }

  return (
    <div
      ref={outerRef}
      tabIndex={0}
      className={outerClassName}
      role="region"
      aria-label={`${BRAND.wordmark} battle`}
    >
      {chromeBody}
      {lowerBody}
    </div>
  );
}
