import { GameIcon } from './GameIcon';
import { BRAND } from '../theme/gameTheme';

/**
 * Getting-started tip for new players — points at Settings for controls and study flow. Shown until
 * dismissed (remembered across sessions) or the player's first few dozen cards.
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
      <GameIcon name="pokeball" size={16} style={{ color: 'var(--pkr-accent, var(--pkr-ink-gold-strong))' }} className="shrink-0" />
      <p className="min-w-0 flex-1 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-soft)' }}>
        <span className="font-black text-slate-200">First time with {BRAND.wordmark}?</span> Open{' '}
        <span className="font-black text-amber-200">Menu → Settings</span> for controls, recommended study flow, and troubleshooting.
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <button type="button" className="pkr-btn-secondary px-2 py-1 pkr-fine font-bold" onClick={onOpenSettings}>
          Open settings
        </button>
        <button type="button" className="pkr-fine font-bold underline decoration-slate-500 underline-offset-2" style={{ color: 'var(--pkr-ink-dim)' }} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
