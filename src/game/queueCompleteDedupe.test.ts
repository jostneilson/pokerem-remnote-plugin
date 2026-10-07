import { describe, expect, it } from 'vitest';
import {
  QUEUE_COMPLETE_DEDUPE_MS,
  evaluateQueueCompleteDedupe,
  extractQueueCompleteDedupeKey,
  parseRecentQueueCompleteKeys,
  rememberQueueCompleteKey,
} from './queueCompleteDedupe';

describe('extractQueueCompleteDedupeKey', () => {
  it('reads remId and card remId shapes', () => {
    expect(extractQueueCompleteDedupeKey({ remId: 'abc' })).toBe('id:abc');
    expect(extractQueueCompleteDedupeKey({ card: { remId: 'xyz' } })).toBe('id:xyz');
  });

  it('prefers card._id over card.remId when both exist', () => {
    expect(
      extractQueueCompleteDedupeKey({ card: { _id: 'card-instance', remId: 'parent-table-rem' } }),
    ).toBe('id:card-instance');
  });

  it('suffixes shared remId with list/table position (table-style completions)', () => {
    const a = extractQueueCompleteDedupeKey({ card: { remId: 'table-parent' }, listIndex: 0 });
    const b = extractQueueCompleteDedupeKey({ card: { remId: 'table-parent' }, listIndex: 1 });
    expect(a).toBe('id:table-parent~listIndex=0');
    expect(b).toBe('id:table-parent~listIndex=1');
    expect(a).not.toBe(b);
  });

  it('returns null only for non-object payloads', () => {
    expect(extractQueueCompleteDedupeKey(null)).toBe(null);
  });

  it('falls back to a stable fingerprint when no id fields exist', () => {
    const a = extractQueueCompleteDedupeKey({ foo: 1, bar: 'x' });
    expect(a).toMatch(/^fp:/);
    expect(extractQueueCompleteDedupeKey({ foo: 1, bar: 'x' })).toBe(a);
  });
});

describe('evaluateQueueCompleteDedupe', () => {
  it('skips duplicate keys within the dedupe window (back/forward navigation noise)', () => {
    const t0 = 1_000_000;
    const recent = rememberQueueCompleteKey([], 'id:1', t0);
    const r = evaluateQueueCompleteDedupe(recent, 'id:1', t0 + 500);
    expect(r.shouldProcess).toBe(false);
  });

  it('allows the same key again once the dedupe window has passed (re-reviews count)', () => {
    // Regression: previously the LRU would block any key that had ever appeared in the
    // last 80 events, meaning "Again" answers and short-interval spaced-repetition
    // re-reviews silently stopped counting toward cardsReviewed.
    const t0 = 1_000_000;
    const afterFirst = rememberQueueCompleteKey([], 'id:1', t0);
    const later = evaluateQueueCompleteDedupe(afterFirst, 'id:1', t0 + QUEUE_COMPLETE_DEDUPE_MS + 1);
    expect(later.shouldProcess).toBe(true);
  });

  it('allows a different key fired immediately after', () => {
    const t0 = 1_000_000;
    const afterFirst = rememberQueueCompleteKey([], 'id:1', t0);
    const other = evaluateQueueCompleteDedupe(afterFirst, 'id:2', t0 + 10);
    expect(other.shouldProcess).toBe(true);
    expect(other.nextKeysIfProcessed.map((e) => e.key)).toEqual(['id:1', 'id:2']);
  });

  it('allows first occurrence and records key with timestamp', () => {
    const r = evaluateQueueCompleteDedupe([], 'id:2', 42);
    expect(r.shouldProcess).toBe(true);
    expect(r.nextKeysIfProcessed).toEqual([{ key: 'id:2', at: 42 }]);
  });

  it('always processes when key is unknown', () => {
    const recent = [{ key: 'id:1', at: 999 }];
    const r = evaluateQueueCompleteDedupe(recent, null, 1000);
    expect(r.shouldProcess).toBe(true);
    expect(r.nextKeysIfProcessed).toBe(recent);
  });

  it('dedupes identical fingerprint payloads when fired back-to-back', () => {
    const k = extractQueueCompleteDedupeKey({ z: 9 })!;
    const t0 = 1_000_000;
    const first = evaluateQueueCompleteDedupe([], k, t0);
    expect(first.shouldProcess).toBe(true);
    const second = evaluateQueueCompleteDedupe(first.nextKeysIfProcessed, k, t0 + 10);
    expect(second.shouldProcess).toBe(false);
  });
});

describe('parseRecentQueueCompleteKeys (backward compat)', () => {
  it('accepts the current { key, at } shape', () => {
    const out = parseRecentQueueCompleteKeys([
      { key: 'id:a', at: 1 },
      { key: 'id:b', at: 2 },
    ]);
    expect(out).toEqual([
      { key: 'id:a', at: 1 },
      { key: 'id:b', at: 2 },
    ]);
  });

  it('upgrades legacy string[] entries so they fall outside the dedupe window immediately', () => {
    const out = parseRecentQueueCompleteKeys(['id:legacy']);
    expect(out).toEqual([{ key: 'id:legacy', at: 0 }]);
    // Legacy entries at epoch 0 are always far older than the dedupe window, so they
    // never block a fresh review after upgrade.
    const r = evaluateQueueCompleteDedupe(out, 'id:legacy', Date.now());
    expect(r.shouldProcess).toBe(true);
  });

  it('rejects non-array and malformed inputs', () => {
    expect(parseRecentQueueCompleteKeys(null)).toEqual([]);
    expect(parseRecentQueueCompleteKeys('garbage')).toEqual([]);
    expect(parseRecentQueueCompleteKeys([{ key: 'a' }, { at: 10 }, null])).toEqual([]);
  });
});
