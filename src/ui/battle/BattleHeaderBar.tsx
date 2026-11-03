import type { PokeRemGameState } from '../../game/state/model';
import { trainerXpProgress } from '../../game/engine/trainerLevel';
import { StatHoverTip } from './StatHoverTip';
import { GameIcon } from '../components/GameIcon';
import { BRAND } from '../theme/gameTheme';
import { TrainerXpStarBurst } from '../components/TrainerXpStarBurst';
import type { useTrainerXpMoment } from '../hooks/useTrainerXpMoment';

/** Trainer level and XP bar, active doubler, streak, money, cards reviewed and today's counts. */
export function BattleHeaderBar({
  state,
  xpMoment,
  feedbackSeq,
  showDailyHeaderStats,
  layoutW,
}: {
  state: PokeRemGameState;
  xpMoment: ReturnType<typeof useTrainerXpMoment>;
  feedbackSeq: number;
  showDailyHeaderStats: boolean;
  layoutW: number;
}) {
  const trainerProg = trainerXpProgress(state.trainerXp ?? 0);
  const trainerLv = state.trainerLevel ?? 1;
  return (
    // min-w-0 + overflow so wide viewports do not force this row wider than the sidebar column
    <div
      className={`pkr-battle-header-bar flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-x-hidden px-2 py-1.5 sm:gap-1.5 sm:px-2.5 ${
        xpMoment.focusXpUi ? 'pkr-battle-header-bar--xp-moment' : ''
      }`}
    >
      <StatHoverTip label={`${BRAND.wordmark} — trainer summary for this sidebar.`}>
        <span
          className="pkr-pixel-title shrink-0 pkr-fine leading-tight"
          style={{ color: 'var(--pkr-pill-active-text)' }}
        >
          {BRAND.wordmark}
        </span>
      </StatHoverTip>
      <StatHoverTip
        className="min-w-0 flex-1"
        label={`Trainer level ${trainerLv} (${state.trainerRank ?? 'Trainer'}). The gold bar is trainer XP toward the next level — earn XP from flashcards, wild battles, streaks, catches, achievements (tiered), and other actions.`}
      >
        <span
          className={`relative flex min-w-0 w-full items-center gap-1.5 ${xpMoment.focusXpUi ? 'pkr-battle-xp-moment' : ''}`}
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
            className="shrink-0 rounded-full px-1.5 py-px pkr-fine font-black"
            style={{
              background: 'rgba(251,191,36,0.25)',
              color: 'var(--pkr-ink-gold)',
              border: '1px solid rgba(251,191,36,0.3)',
            }}
          >
            Lv{trainerLv}
          </span>
          <div className="pkr-meter-track h-2 min-w-0 flex-1 overflow-hidden">
            <div
              key={`${feedbackSeq}-${xpMoment.fillPulseKey}`}
              className={`pkr-meter-fill pkr-xp-bar-fill--pulse h-full transition-[width] ${
                xpMoment.focusXpUi
                  ? 'duration-1000 ease-out pkr-xp-bar-fill--sparkle'
                  : 'duration-500'
              }`}
              style={{
                width: `${trainerProg.percent}%`,
                background: 'linear-gradient(90deg, #f59e0b 0%, #fde047 100%)',
              }}
            />
          </div>
        </span>
      </StatHoverTip>
      {state.xpBoosterActive ? (
        <StatHoverTip
          label={`XP Doubler active — all Pokémon gain x2 XP for the next ${state.xpBoosterActive.cardsRemaining} reviewed card(s).${
            (state.xpBoosterQueue?.length ?? 0) > 0
              ? ` Queued: ${state.xpBoosterQueue?.length}.`
              : ''
          }`}
        >
          <span
            className="flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px pkr-fine font-black"
            style={{
              borderColor: 'rgba(253,224,71,0.5)',
              background:
                'linear-gradient(180deg, rgba(253,224,71,0.35) 0%, rgba(180,83,9,0.35) 100%)',
              color: '#fef3c7',
            }}
          >
            x2 XP · {state.xpBoosterActive.cardsRemaining}
          </span>
        </StatHoverTip>
      ) : null}
      {(state.currentStreak ?? 0) > 0 && (
        <StatHoverTip
          label={`Study streak — consecutive UTC calendar days you completed at least one flashcard while ${BRAND.wordmark} is active. Resets if you skip a day.`}
        >
          <span
            className="flex items-center gap-0.5 pkr-fine font-bold"
            style={{ color: '#fdba74' }}
          >
            <GameIcon name="flame" size={11} />
            {state.currentStreak}
          </span>
        </StatHoverTip>
      )}
      <StatHoverTip label="Poké Dollars (₽) — currency for the Shop (balls, potions, and more). Earned from reviews and battle actions.">
        <span
          className="flex items-center gap-0.5 shrink-0 pkr-fine font-bold tabular-nums"
          style={{ color: '#fcd34d' }}
        >
          <GameIcon name="coin" size={11} />
          {state.currency ?? 0}
        </span>
      </StatHoverTip>
      <StatHoverTip
        label={`Cards reviewed — total flashcards you’ve finished in RemNote with ${BRAND.wordmark} loaded (lifetime counter).`}
      >
        <span
          className="flex items-center gap-0.5 shrink-0 pkr-fine font-bold tabular-nums"
          style={{ color: 'var(--pkr-ink-soft)' }}
        >
          <GameIcon name="book" size={11} />
          {state.cardsReviewed}
        </span>
      </StatHoverTip>
      {showDailyHeaderStats && state.dailyStats && layoutW >= 380 ? (
        <StatHoverTip label="Today (UTC) — flashcards completed / wild encounters started / successful catches. Resets at UTC midnight.">
          <span
            className="flex shrink-0 items-center gap-0.5 pkr-fine font-bold tabular-nums"
            style={{ color: 'var(--pkr-accent-muted)' }}
          >
            <GameIcon name="chart" size={10} />
            {state.dailyStats.reviews}/{state.dailyStats.encounters}/{state.dailyStats.catches}
          </span>
        </StatHoverTip>
      ) : null}
    </div>
  );
}
