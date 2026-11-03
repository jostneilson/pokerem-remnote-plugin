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
  onClaim,
  onClaimAll,
  claimAllCount = 0,
}: {
  entries: { title: string; rewardLine: string }[];
  onDone: () => void;
  reducedMotion?: boolean;
  /** e.g. “Trainer reward ready” for reward-path reuse */
  headline?: string;
  /** Claim this reward right from the banner. */
  onClaim?: () => void;
  /** Claim every pending reward (shown when more than one is waiting). */
  onClaimAll?: () => void;
  claimAllCount?: number;
}) {
  useEffect(() => {
    // A claimable banner waits for the player; plain notices fade on their own.
    if (onClaim) return undefined;
    const ms = reducedMotion ? 8000 : 5500;
    const t = window.setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [onDone, onClaim, reducedMotion]);

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
        <div className="pkr-pixel-title pkr-fine font-black uppercase tracking-widest" style={{ color: 'var(--pkr-ink-gold)' }}>
          {headline}
        </div>
        <div className="mt-0.5 pkr-fine font-black leading-snug" style={{ color: '#fffbeb' }}>
          {primaryTitle}
          {more > 0 ? (
            <span className="font-bold opacity-80"> · +{more} more</span>
          ) : null}
        </div>
        {primary?.rewardLine ? (
          <div className="mt-0.5 pkr-fine font-semibold leading-snug" style={{ color: '#fcd34d' }}>
            {primary.rewardLine}
          </div>
        ) : null}
      </div>
      <div className="pkr-fanfare-actions">
        {onClaim ? (
          <button type="button" className="pkr-game-btn pkr-fanfare-claim" onClick={onClaim}>
            Claim
          </button>
        ) : null}
        {onClaimAll && claimAllCount > 1 ? (
          <button type="button" className="pkr-game-btn pkr-fanfare-claim" onClick={onClaimAll}>
            Claim all ({claimAllCount})
          </button>
        ) : null}
        <button type="button" className="pkr-achievement-fanfare__dismiss shrink-0 pkr-fine font-bold" onClick={onDone}>
          {onClaim ? 'Later' : 'OK'}
        </button>
      </div>
    </div>
  );
}
