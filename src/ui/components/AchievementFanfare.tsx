import { useEffect } from 'react';
import { GameIcon } from './GameIcon';

/**
 * In-sidebar unlock moment when new achievement keys appear on state (non-spam: one banner per burst).
 */
export function AchievementFanfare({
  entries,
  onDone,
  reducedMotion,
  headline = 'Achievement unlocked',
}: {
  entries: { title: string; rewardLine: string }[];
  onDone: () => void;
  reducedMotion?: boolean;
  /** e.g. “Trainer reward ready” for reward-path reuse */
  headline?: string;
}) {
  useEffect(() => {
    const ms = reducedMotion ? 8000 : 5500;
    const t = window.setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [onDone, reducedMotion]);

  const primary = entries[0];
  const primaryTitle = primary?.title ?? 'Achievement';
  const more = entries.length - 1;

  return (
    <div
      className={`pkr-achievement-fanfare ${reducedMotion ? 'pkr-achievement-fanfare--reduce' : 'pkr-achievement-fanfare--animate'}`}
      role="status"
      aria-live="polite"
    >
      <div className="pkr-achievement-fanfare__icon">
        <GameIcon name="starFilled" size={18} style={{ color: '#451a03' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="pkr-pixel-title text-[6px] font-black uppercase tracking-widest" style={{ color: '#fde68a' }}>
          {headline}
        </div>
        <div className="mt-0.5 text-[10px] font-black leading-snug" style={{ color: '#fffbeb' }}>
          {primaryTitle}
          {more > 0 ? (
            <span className="font-bold opacity-80"> · +{more} more</span>
          ) : null}
        </div>
        {primary?.rewardLine ? (
          <div className="mt-0.5 text-[8px] font-semibold leading-snug" style={{ color: '#fcd34d' }}>
            {primary.rewardLine}
          </div>
        ) : null}
      </div>
      <button type="button" className="pkr-achievement-fanfare__dismiss shrink-0 text-[9px] font-bold" onClick={onDone}>
        OK
      </button>
    </div>
  );
}
