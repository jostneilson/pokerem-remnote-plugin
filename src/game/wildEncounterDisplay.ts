/**
 * How many queue completions until encounter progress reaches the wild spawn threshold,
 * mirroring {@link onQueueCardComplete} pacing (integer wild units per card, not study weight).
 */
export function estimatedQueueCompletionsUntilWild(params: {
  encounterProgress: number;
  effectiveRate: number;
  /** Legacy — kept for call sites; wild progress no longer uses fractional accum. */
  wildReviewAccum: number;
  /** Legacy — encounter ETA does not use study review weight. */
  reviewWeight: number;
  encounterPacingModulo: number;
  cardsReviewed: number;
  encounterReviewMultiplier?: number;
}): number {
  const target = Math.max(1, Math.floor(params.effectiveRate));
  let ep = params.encounterProgress;
  let cr = params.cardsReviewed;
  const m =
    typeof params.encounterPacingModulo === 'number' && params.encounterPacingModulo >= 2
      ? Math.floor(params.encounterPacingModulo)
      : 1;
  const multRaw = params.encounterReviewMultiplier;
  const mult =
    typeof multRaw === 'number' && Number.isFinite(multRaw) ? Math.max(1, Math.min(50, Math.floor(multRaw))) : 1;

  let steps = 0;
  const maxSteps = 500;
  while (ep < target && steps < maxSteps) {
    steps++;
    cr++;
    const countsTowardWild = m <= 1 || cr % m === 0;
    if (countsTowardWild) {
      ep += mult;
    }
  }
  return steps;
}
