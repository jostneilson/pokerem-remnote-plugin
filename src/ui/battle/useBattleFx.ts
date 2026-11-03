import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type {
  BattleOutcomeKind,
  CombatStrikeSnapshot,
  EncounterPokemon,
} from '../../game/state/model';

/**
 * Battle field effects as one reducer. Every effect is a channel that plays a timeline of
 * patches; replaying a channel cancels what was left of its previous run, and unmounting cancels
 * everything. Nothing is cancelled just because a prop changed, so an effect always finishes its
 * timeline (an encounter ending mid-intro or mid-lunge no longer leaves the class stuck on).
 */
export interface BattleFx {
  shake: boolean;
  intro: boolean;
  lunge: 'idle' | 'player' | 'wild';
  wildHit: boolean;
  playerHit: boolean;
  sceneShake: boolean;
}

type Channel = 'shake' | 'intro' | 'lunge' | 'hits' | 'scene';
export type FxStep = { at: number; patch: Partial<BattleFx> };

const IDLE: BattleFx = {
  shake: false,
  intro: false,
  lunge: 'idle',
  wildHit: false,
  playerHit: false,
  sceneShake: false,
};

export function fxReducer(state: BattleFx, patch: Partial<BattleFx>): BattleFx {
  for (const k of Object.keys(patch) as (keyof BattleFx)[]) {
    if (state[k] !== patch[k]) return { ...state, ...patch };
  }
  return state;
}

/** Timelines, in milliseconds from the trigger. */
export const FX_TIMELINES: Record<'shake' | 'intro' | 'lunge' | 'scene', FxStep[]> = {
  /** Field shake after any battle feedback. */
  shake: [
    { at: 0, patch: { shake: true } },
    { at: 500, patch: { shake: false } },
  ],
  /** Sprites slide in behind the encounter wipe. */
  intro: [
    { at: 0, patch: { intro: true } },
    { at: 950, patch: { intro: false } },
  ],
  /** Your Pokémon lunges, then the foe answers. */
  lunge: [
    { at: 0, patch: { lunge: 'player' } },
    { at: 430, patch: { lunge: 'wild' } },
    { at: 860, patch: { lunge: 'idle' } },
  ],
  /** A short shake when the battle scene changes. */
  scene: [
    { at: 0, patch: { sceneShake: true } },
    { at: 380, patch: { sceneShake: false } },
  ],
};

/** Hit flashes land as each lunge connects: the foe first, then you. */
export function hitTimeline(playerDamage: number, wildDamage: number): FxStep[] {
  const steps: FxStep[] = [{ at: 0, patch: { wildHit: false, playerHit: false } }];
  if (playerDamage > 0)
    steps.push({ at: 175, patch: { wildHit: true } }, { at: 520, patch: { wildHit: false } });
  if (wildDamage > 0)
    steps.push({ at: 405, patch: { playerHit: true } }, { at: 780, patch: { playerHit: false } });
  return steps;
}

function useFxTimeline() {
  const [fx, dispatch] = useReducer(fxReducer, IDLE);
  const timers = useRef<Partial<Record<Channel, number[]>>>({});
  const cancel = useCallback((ch: Channel) => {
    for (const t of timers.current[ch] ?? []) window.clearTimeout(t);
    timers.current[ch] = [];
  }, []);
  const play = useCallback(
    (ch: Channel, steps: FxStep[]) => {
      cancel(ch);
      const list: number[] = [];
      for (const step of steps) {
        if (step.at <= 0) dispatch(step.patch);
        else list.push(window.setTimeout(() => dispatch(step.patch), step.at));
      }
      timers.current[ch] = list;
    },
    [cancel]
  );
  useEffect(
    () => () => {
      for (const list of Object.values(timers.current))
        for (const t of list ?? []) window.clearTimeout(t);
    },
    []
  );
  return { fx, play, cancel, dispatch };
}

export function useBattleFx({
  feedbackSeq,
  hasEncounter,
  reducedMotion,
  outcomeKind,
  strike,
  sceneChanged,
}: {
  feedbackSeq: number;
  hasEncounter: boolean;
  reducedMotion: boolean;
  outcomeKind: BattleOutcomeKind;
  strike: CombatStrikeSnapshot | null | undefined;
  /** Truthy (a new object) each time the scene crossfade starts. */
  sceneChanged: unknown;
}): BattleFx {
  const { fx, play, cancel, dispatch } = useFxTimeline();
  const lastCombatSeq = useRef(0);

  useEffect(() => {
    if (feedbackSeq > 0) play('shake', FX_TIMELINES.shake);
  }, [feedbackSeq, play]);

  useEffect(() => {
    if (hasEncounter && !reducedMotion) play('intro', FX_TIMELINES.intro);
  }, [hasEncounter, reducedMotion, play]);

  useEffect(() => {
    if (!hasEncounter) lastCombatSeq.current = 0;
  }, [hasEncounter]);

  useEffect(() => {
    if (!hasEncounter || reducedMotion || feedbackSeq <= 0) return;
    const strikeOut = outcomeKind === 'combat' || outcomeKind === 'faint' ? strike : null;
    if (!strikeOut || lastCombatSeq.current === feedbackSeq) return;
    lastCombatSeq.current = feedbackSeq;
    play('lunge', FX_TIMELINES.lunge);
  }, [feedbackSeq, outcomeKind, reducedMotion, hasEncounter, strike, play]);

  useEffect(() => {
    if (!hasEncounter || reducedMotion || outcomeKind !== 'combat') {
      cancel('hits');
      dispatch({ wildHit: false, playerHit: false });
      return;
    }
    if (!strike || feedbackSeq <= 0) return;
    play('hits', hitTimeline(strike.playerDamage ?? 0, strike.wildDamage ?? 0));
  }, [feedbackSeq, hasEncounter, reducedMotion, outcomeKind, strike, play, cancel, dispatch]);

  useEffect(() => {
    if (sceneChanged && !reducedMotion) play('scene', FX_TIMELINES.scene);
  }, [sceneChanged, reducedMotion, play]);

  return fx;
}

export type BattleLinger = {
  kind: 'defeat' | 'faint';
  wild: EncounterPokemon;
  feedbackSeq: number;
};

/** Brief field hold after a KO or faint, so the finish doesn't vanish on the same frame the encounter clears. */
export function useBattleLinger({
  wild,
  hasEncounter,
  outcomeKind,
  feedbackSeq,
  reducedMotion,
  wildDefeated,
}: {
  wild: EncounterPokemon | null;
  hasEncounter: boolean;
  outcomeKind: BattleOutcomeKind;
  feedbackSeq: number;
  reducedMotion: boolean;
  wildDefeated: boolean | undefined;
}): BattleLinger | null {
  const [linger, setLinger] = useState<BattleLinger | null>(null);
  const wildPersistRef = useRef<EncounterPokemon | null>(null);
  const lastArmedSeq = useRef(0);
  const clearTimer = useRef(0);

  useEffect(() => {
    if (wild) wildPersistRef.current = wild;
  }, [wild]);

  useEffect(() => {
    if (hasEncounter) {
      lastArmedSeq.current = 0;
      window.clearTimeout(clearTimer.current);
      setLinger(null);
    }
  }, [hasEncounter]);

  useEffect(() => {
    if (linger && linger.feedbackSeq !== feedbackSeq) {
      window.clearTimeout(clearTimer.current);
      setLinger(null);
    }
  }, [feedbackSeq, linger]);

  useLayoutEffect(() => {
    if (hasEncounter || feedbackSeq <= 0 || lastArmedSeq.current === feedbackSeq) return;
    const snap = wildPersistRef.current;
    if (!snap) return;
    const defeatFinisher = outcomeKind === 'defeat' && wildDefeated === true;
    if (!defeatFinisher && outcomeKind !== 'faint') return;
    lastArmedSeq.current = feedbackSeq;
    const kind: 'defeat' | 'faint' = defeatFinisher ? 'defeat' : 'faint';
    const wildCopy: EncounterPokemon =
      kind === 'defeat'
        ? { ...snap, currentHp: 0 }
        : { ...snap, currentHp: Math.max(0, snap.currentHp) };
    setLinger({ kind, wild: wildCopy, feedbackSeq });
    window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setLinger(null), reducedMotion ? 260 : 660);
    return () => window.clearTimeout(clearTimer.current);
  }, [hasEncounter, outcomeKind, feedbackSeq, reducedMotion, wildDefeated]);

  return linger;
}
