import { describe, expect, it } from 'vitest';
import { extractEncounterReviewMultiplier, stableQueueEventJson } from './queueCompletionMeta';

describe('extractEncounterReviewMultiplier', () => {
  it('defaults to 1', () => {
    expect(extractEncounterReviewMultiplier(null)).toBe(1);
    expect(extractEncounterReviewMultiplier({})).toBe(1);
  });

  it('reads list-style counts when present', () => {
    expect(extractEncounterReviewMultiplier({ itemsAnswered: 4 })).toBe(4);
    expect(extractEncounterReviewMultiplier({ completedIndices: [0, 1, 2] })).toBe(3);
  });
});

describe('stableQueueEventJson', () => {
  it('strips volatile keys for fingerprint stability', () => {
    const a = stableQueueEventJson({ card: { remId: 'x' }, timestamp: 1 });
    const b = stableQueueEventJson({ card: { remId: 'x' }, timestamp: 99 });
    expect(a).toBe(b);
  });
});
