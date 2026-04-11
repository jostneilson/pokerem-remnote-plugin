/**
 * Deduplicate RemNote `QueueCompleteCard` events so navigation back/forward on the same
 * card does not inflate cardsReviewed, daily stats, or wild pacing.
 */

import { stableQueueEventJson } from './queueCompletionMeta';

export const QUEUE_COMPLETE_RECENT_SESSION_KEY = 'pokerem.queueCompleteRecent';

const MAX_RECENT_KEYS = 80;

function hashDjb2Base36(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)!;
  }
  return (h >>> 0).toString(36);
}

/** Try common RemNote / SDK shapes for a stable per-completion identity. */
export function extractQueueCompleteDedupeKey(event: unknown): string | null {
  if (event == null) return null;
  if (typeof event === 'string' || typeof event === 'number') {
    return `v:${String(event)}`;
  }
  if (typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  const card = e.card as Record<string, unknown> | undefined;
  const rem = e.rem as Record<string, unknown> | undefined;
  const queueItem = e.queueItem as Record<string, unknown> | undefined;

  const candidates = [
    e.cardId,
    card?._id,
    card?.remId,
    e.remId,
    rem?._id,
    e.queueItemId,
    queueItem?.id,
    e.flashcardId,
    e.id,
    e._id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return `id:${c}`;
    if (typeof c === 'number' && Number.isFinite(c)) return `id:${c}`;
  }

  try {
    return `fp:${hashDjb2Base36(stableQueueEventJson(event))}`;
  } catch {
    return null;
  }
}

export function parseRecentQueueCompleteKeys(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(-MAX_RECENT_KEYS);
  }
  return [];
}

export function rememberQueueCompleteKey(recent: string[], key: string): string[] {
  const without = recent.filter((k) => k !== key);
  return [...without, key].slice(-MAX_RECENT_KEYS);
}

/**
 * @param recentKeys keys already processed this session (newest last)
 * @param extractedKey from {@link extractQueueCompleteDedupeKey} — null if unknown
 * @returns whether to run the review pipeline, and updated key list to persist if processing
 */
export function evaluateQueueCompleteDedupe(
  recentKeys: string[],
  extractedKey: string | null,
): { shouldProcess: boolean; nextKeysIfProcessed: string[] } {
  if (extractedKey == null) {
    return { shouldProcess: true, nextKeysIfProcessed: recentKeys };
  }
  if (recentKeys.includes(extractedKey)) {
    return { shouldProcess: false, nextKeysIfProcessed: recentKeys };
  }
  return { shouldProcess: true, nextKeysIfProcessed: rememberQueueCompleteKey(recentKeys, extractedKey) };
}
