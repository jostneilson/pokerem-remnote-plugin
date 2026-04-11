import { describe, expect, it } from 'vitest';
import { estimatedQueueCompletionsUntilWild } from './wildEncounterDisplay';

describe('estimatedQueueCompletionsUntilWild', () => {
  it('matches every-2nd-review pacing (no progress on odd completions)', () => {
    const n = estimatedQueueCompletionsUntilWild({
      encounterProgress: 0,
      effectiveRate: 3,
      wildReviewAccum: 0,
      reviewWeight: 1,
      encounterPacingModulo: 2,
      cardsReviewed: 3,
    });
    expect(n).toBeGreaterThan(1);
  });

  it('counts down one step per completion with default pacing', () => {
    expect(
      estimatedQueueCompletionsUntilWild({
        encounterProgress: 2,
        effectiveRate: 5,
        wildReviewAccum: 0,
        reviewWeight: 1,
        encounterPacingModulo: 1,
        cardsReviewed: 10,
      }),
    ).toBe(3);
  });
});
