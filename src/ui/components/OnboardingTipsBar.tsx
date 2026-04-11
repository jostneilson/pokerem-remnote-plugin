import { GameIcon } from './GameIcon';
import { BRAND } from '../theme/gameTheme';

/**
 * One-time-per-session style tip strip — points new users at Settings for workflow and behavior.
 */
export function OnboardingTipsBar({
  onOpenSettings,
  onDismiss,
}: {
  onOpenSettings: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="pkr-onboarding-bar pkr-onboarding-enter mx-2 mb-1 mt-1 flex flex-wrap items-center gap-2 rounded-lg border-2 px-2.5 py-2"
      role="region"
      aria-label="Getting started tips"
    >
      <GameIcon name="pokeball" size={16} style={{ color: 'var(--pkr-accent, #fbbf24)' }} className="shrink-0" />
      <p className="min-w-0 flex-1 text-[9px] font-semibold leading-snug" style={{ color: '#cbd5e1' }}>
        <span className="font-black text-slate-200">First time with {BRAND.wordmark}?</span> Open{' '}
        <span className="font-black text-amber-200">Settings</span> (gear tab) for controls, recommended study flow, and troubleshooting.
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <button type="button" className="pkr-btn-secondary px-2 py-1 text-[9px] font-bold" onClick={onOpenSettings}>
          Open settings
        </button>
        <button type="button" className="text-[9px] font-bold underline decoration-slate-500 underline-offset-2" style={{ color: '#64748b' }} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
