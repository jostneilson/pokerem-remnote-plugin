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

  it('dedupes identical fingerprint payloads', () => {
    const k = extractQueueCompleteDedupeKey({ z: 9 })!;
    const first = evaluateQueueCompleteDedupe([], k);
    expect(first.shouldProcess).toBe(true);
    const second = evaluateQueueCompleteDedupe(first.nextKeysIfProcessed, k);
    expect(second.shouldProcess).toBe(false);
  });
});
