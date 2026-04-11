import { useEffect, useRef, useState } from 'react';

export type TrainerXpMomentPhase = 'idle' | 'emphasis' | 'stars' | 'reward_sparkle';

const EMPHASIS_MS = 520;
const STARS_MS = 720;
const REWARD_SPARKLE_MS = 580;
const BIG_XP_SHAKE_THRESHOLD = 20;
const XP_DEBOUNCE_MS = 300;

/**
 * Detects trainer XP / level increases and drives a short “anime impact” sequence:
 * emphasis → star burst. Optional monotonic `rewardSparkleKey` for milestone claims (no XP change).
 * Rapid small XP ticks (e.g. fast reviews) are coalesced into one burst for a smoother feel.
 */
export function useTrainerXpMoment(
  trainerXp: number,
  trainerLevel: number,
  reducedMotion: boolean,
  rewardSparkleKey?: number,
) {
  const [phase, setPhase] = useState<TrainerXpMomentPhase>('idle');
  const [levelUp, setLevelUp] = useState(false);
  const [fillPulseKey, setFillPulseKey] = useState(0);
  const [lastGain, setLastGain] = useState(0);

  const prevXp = useRef<number | null>(null);
  const prevLevel = useRef<number | null>(null);
  const prevRewardKey = useRef<number | undefined>(undefined);
  /** XP already reflected in the last celebration (for debounce stacking). */
  const lastCelebratedXp = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  useEffect(() => {
    return () => {
      clearTimers();
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const rewardKey = rewardSparkleKey;

    const startGainSequence = (xpDelta: number, isLevelUp: boolean) => {
      setLastGain(xpDelta);
      setFillPulseKey((k) => k + 1);
      setLevelUp(isLevelUp);
      if (reducedMotion) return;
      clearTimers();
      setPhase('emphasis');
      timers.current.push(window.setTimeout(() => setPhase('stars'), EMPHASIS_MS));
      timers.current.push(
        window.setTimeout(() => {
          setPhase('idle');
          setLevelUp(false);
        }, EMPHASIS_MS + STARS_MS),
      );
    };

    if (prevXp.current === null) {
      prevXp.current = trainerXp;
      prevLevel.current = trainerLevel;
      lastCelebratedXp.current = trainerXp;
      if (rewardKey !== undefined) prevRewardKey.current = rewardKey;
      return;
    }

    if (rewardKey !== undefined && prevRewardKey.current === undefined) {
      prevRewardKey.current = rewardKey;
      return;
    }

    const prevX = prevXp.current;
    const prevL = prevLevel.current ?? 1;
    const leveled = trainerLevel > prevL;
    const rewardBump =
      rewardKey !== undefined &&
      prevRewardKey.current !== undefined &&
      rewardKey > prevRewardKey.current;

    prevLevel.current = trainerLevel;
    if (rewardKey !== undefined) prevRewardKey.current = rewardKey;

    if (rewardBump && !reducedMotion) {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      prevXp.current = trainerXp;
      lastCelebratedXp.current = trainerXp;
      setLastGain(0);
      setFillPulseKey((k) => k + 1);
      clearTimers();
      setLevelUp(false);
      setPhase('reward_sparkle');
      timers.current.push(window.setTimeout(() => setPhase('idle'), REWARD_SPARKLE_MS));
      return;
    }

    if (leveled) {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const xpDelta = Math.max(0, trainerXp - prevX);
      prevXp.current = trainerXp;
      lastCelebratedXp.current = trainerXp;
      startGainSequence(xpDelta, true);
      return;
    }

    const pendingSinceCelebration = Math.max(0, trainerXp - (lastCelebratedXp.current ?? prevX));
    if (pendingSinceCelebration <= 0) {
      prevXp.current = trainerXp;
      lastCelebratedXp.current = trainerXp;
      return;
    }

    if (reducedMotion) {
      prevXp.current = trainerXp;
      lastCelebratedXp.current = trainerXp;
      startGainSequence(pendingSinceCelebration, false);
      return;
    }

    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      const batch = Math.max(0, trainerXp - (lastCelebratedXp.current ?? 0));
      if (batch <= 0) return;
      lastCelebratedXp.current = trainerXp;
      prevXp.current = trainerXp;
      startGainSequence(batch, false);
    }, XP_DEBOUNCE_MS);
  }, [trainerXp, trainerLevel, reducedMotion, rewardSparkleKey]);

  const focusXpUi = phase === 'emphasis' || phase === 'stars';
  const screenShake =
    !reducedMotion &&
    phase === 'emphasis' &&
    (levelUp || lastGain >= BIG_XP_SHAKE_THRESHOLD);
  const showStarBurst =
    !reducedMotion && (phase === 'stars' || phase === 'reward_sparkle');
  const burstVariant: 'xp' | 'level' | 'reward' =
    phase === 'reward_sparkle' ? 'reward' : levelUp ? 'level' : 'xp';

  return {
    phase,
    levelUp,
    fillPulseKey,
    lastGain,
    focusXpUi,
    screenShake,
    showStarBurst,
    burstVariant,
  };
}
