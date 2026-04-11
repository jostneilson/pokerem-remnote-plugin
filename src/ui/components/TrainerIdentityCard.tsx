import { MeterBar } from './Bars';
import { GameIcon } from './GameIcon';
import { TrainerXpStarBurst } from './TrainerXpStarBurst';
import { useTrainerXpMoment } from '../hooks/useTrainerXpMoment';

/**
 * Trainer rank + level as a compact title card (not plain header text).
 */
export function TrainerIdentityCard({
  rankTitle,
  trainerLevel,
  trainerXp,
  xpProg,
  subtitle,
  reducedMotion = false,
  rewardSparkleKey,
}: {
  rankTitle: string;
  trainerLevel: number;
  /** Total trainer XP — drives level-up / XP gain celebrations when paired with `xpProg`. */
  trainerXp: number;
  xpProg: { current: number; needed: number; percent: number };
  /** e.g. streak or bonus line */
  subtitle?: string;
  reducedMotion?: boolean;
  /** Monotonic key (e.g. claim count) — short sparkle when claiming milestone rewards. */
  rewardSparkleKey?: number;
}) {
  const maxed = trainerLevel >= 50 && xpProg.needed <= 0;
  const xpMoment = useTrainerXpMoment(trainerXp, trainerLevel, reducedMotion, rewardSparkleKey);

  return (
    <div
      className={`pkr-trainer-identity ${xpMoment.focusXpUi ? 'pkr-trainer-identity--xp-focus' : ''} ${
        xpMoment.phase === 'reward_sparkle' ? 'pkr-trainer-identity--reward-sparkle' : ''
      }`}
    >
      <div className="pkr-trainer-identity__glow" aria-hidden />
      <div className="pkr-trainer-identity__inner">
        <div className="pkr-trainer-identity__badge">
          <span className="pkr-trainer-identity__level" aria-hidden>
            {trainerLevel}
          </span>
          <span className="pkr-trainer-identity__level-label">Lv</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="pkr-pixel-title text-[5px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--pkr-accent, #fbbf24)' }}>
            Trainer license
          </div>
          <h2 className="mt-1 truncate text-sm font-black leading-tight tracking-tight" style={{ color: '#f8fafc' }}>
            {rankTitle}
          </h2>
          {subtitle ? (
            <div className="mt-0.5 text-[9px] font-semibold" style={{ color: '#94a3b8' }}>
              {subtitle}
            </div>
          ) : null}
          <div className="relative mt-2">
            {xpMoment.showStarBurst ? (
              <TrainerXpStarBurst variant={xpMoment.burstVariant} burstKey={xpMoment.fillPulseKey} />
            ) : null}
            {maxed ? (
              <div className="text-[9px] font-bold" style={{ color: '#fde68a' }}>
                Max trainer level — keep claiming milestone rewards below.
              </div>
            ) : (
              <MeterBar
                value={xpProg.current}
                max={xpProg.needed || 1}
                color="#f59e0b"
                label="Next level"
                valueText={`${xpProg.current} / ${xpProg.needed} XP`}
                pulseKey={xpMoment.fillPulseKey}
              />
            )}
          </div>
        </div>
        <div className="pkr-trainer-identity__crest" aria-hidden>
          <GameIcon name="trophy" size={22} style={{ color: 'rgba(251,191,36,0.35)' }} />
        </div>
      </div>
    </div>
  );
}
