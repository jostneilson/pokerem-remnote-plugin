import { describe, expect, it } from 'vitest';
import {
  evaluateQueueCompleteDedupe,
  extractQueueCompleteDedupeKey,
  rememberQueueCompleteKey,
} from './queueCompleteDedupe';

describe('extractQueueCompleteDedupeKey', () => {
  it('reads remId and card remId shapes', () => {
    expect(extractQueueCompleteDedupeKey({ remId: 'abc' })).toBe('id:abc');
    expect(extractQueueCompleteDedupeKey({ card: { remId: 'xyz' } })).toBe('id:xyz');
  });

  it('returns null for empty or unknown payloads', () => {
    expect(extractQueueCompleteDedupeKey(null)).toBe(null);
    expect(extractQueueCompleteDedupeKey({})).toBe(null);
  });
});

describe('evaluateQueueCompleteDedupe', () => {
  it('skips duplicate keys', () => {
    const recent = rememberQueueCompleteKey([], 'id:1');
    const r = evaluateQueueCompleteDedupe(recent, 'id:1');
    expect(r.shouldProcess).toBe(false);
  });

  it('allows first occurrence and records key', () => {
    const r = evaluateQueueCompleteDedupe([], 'id:2');
    expect(r.shouldProcess).toBe(true);
    expect(r.nextKeysIfProcessed.includes('id:2')).toBe(true);
  });

  it('always processes when key is unknown', () => {
    const r = evaluateQueueCompleteDedupe(['id:1'], null);
    expect(r.shouldProcess).toBe(true);
    expect(r.nextKeysIfProcessed).toEqual(['id:1']);
  });
});
