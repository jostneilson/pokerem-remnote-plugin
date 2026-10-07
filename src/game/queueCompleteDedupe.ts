/**
 * Deduplicate RemNote `QueueCompleteCard` events so navigation back/forward on the same
 * card does not inflate cardsReviewed, daily stats, or wild pacing.
 *
 * Table-derived and list-style flashcards often reuse one parent `remId` / `card.remId`
 * while the stable per-completion identity lives on `card._id`, `rem._id`, row indices,
 * or similar — we must not treat every row as the same review.
 *
 * Dedupe is TIME-WINDOWED, not an LRU: the same card legitimately reappears many times in a
 * single study session (e.g. "Again" requeues, short-interval spaced-repetition cards) and
 * every one of those repeat reviews must count. We only swallow events that fire for the same
 * key within {@link QUEUE_COMPLETE_DEDUPE_MS} of each other, which is the regime where
 * back/forward/auto-advance navigation produces spurious duplicate events.
 */

import { stableQueueEventJson } from './queueCompletionMeta';

export const QUEUE_COMPLETE_RECENT_SESSION_KEY = 'pokerem.queueCompleteRecent';

/**
 * Any duplicate firing of the same card id within this window is treated as navigation noise
 * and skipped. Chosen conservatively: long enough to swallow back/forward double-fires and
 * RemNote internal re-broadcasts, short enough that normal spaced-repetition re-reviews still
 * count (which typically take several seconds to a few minutes to come back around).
 */
export const QUEUE_COMPLETE_DEDUPE_MS = 2500;

const MAX_RECENT_KEYS = 80;

function hashDjb2Base36(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)!;
  }
  return (h >>> 0).toString(36);
}

function asIdString(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string' && v.length > 0) return v;
  return null;
}

function nestedCard(o: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!o) return undefined;
  const c = o.card;
  return c && typeof c === 'object' ? (c as Record<string, unknown>) : undefined;
}

/**
 * Row/column/list position RemNote may set on table or enumeration queue completions.
 * Checked on the event root, `card`, `queueItem`, and shallow nested `answer` / `context`.
 */
export function extractQueueCompletionDisambiguator(event: unknown): string | null {
  if (event == null || typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  const objs: Record<string, unknown>[] = [e];
  const card = nestedCard(e);
  if (card) objs.push(card);
  const qiRaw = e.queueItem;
  const queueItem =
    qiRaw && typeof qiRaw === 'object' ? (qiRaw as Record<string, unknown>) : undefined;
  if (queueItem) objs.push(queueItem);
  for (const root of [card, queueItem]) {
    if (!root) continue;
    const a = root.answer;
    if (a && typeof a === 'object') objs.push(a as Record<string, unknown>);
    const ctx = root.context;
    if (ctx && typeof ctx === 'object') objs.push(ctx as Record<string, unknown>);
  }
  const keys = [
    'listIndex',
    'rowIndex',
    'columnIndex',
    'cellIndex',
    'cellRow',
    'cellCol',
    'row',
    'col',
    'itemIndex',
    'bulletIndex',
    'ordinal',
    'slot',
    'position',
    'queuePosition',
    'tableRow',
    'tableColumn',
    'answerIndex',
    'partIndex',
    'index',
    'depth',
    'x',
    'y',
    'answerRemId',
    'cellRemId',
    'innerRemId',
    'leafRemId',
  ];
  for (const o of objs) {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === 'number' && Number.isFinite(v)) return `${k}=${Math.floor(v)}`;
      if (typeof v === 'string' && v.length > 0 && v.length < 120) return `${k}=${v}`;
    }
  }
  return null;
}

/**
 * Prefer high-cardinality ids first, then rem-scoped ids (optionally suffixed with
 * {@link extractQueueCompletionDisambiguator} when the parent rem is shared across cells).
 */
export function extractQueueCompleteDedupeKey(event: unknown): string | null {
  if (event == null) return null;
  if (typeof event === 'string' || typeof event === 'number') {
    return `v:${String(event)}`;
  }
  if (typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  const card = nestedCard(e);
  const rem = e.rem as Record<string, unknown> | undefined;
  const qiRaw = e.queueItem;
  const queueItemForIds =
    qiRaw && typeof qiRaw === 'object' ? (qiRaw as Record<string, unknown>) : undefined;
  const qiCard = nestedCard(queueItemForIds);

  // 1) Per-card / queue instance ids (table rows, cloze instances, etc.)
  const instanceCandidates = [
    e.cardId,
    card?.cardId,
    card?._id,
    card?.id,
    e.flashcardId,
    e.flashcardInstanceId,
    e.instanceId,
    e.queueItemId,
    queueItemForIds?.id,
    queueItemForIds?._id,
    queueItemForIds?.cardId,
    qiCard?._id,
    qiCard?.id,
    qiCard?.cardId,
    e._id,
    e.id,
  ];
  for (const c of instanceCandidates) {
    const s = asIdString(c);
    if (s) return `id:${s}`;
  }

  // 2) Rem-backed keys — parent table rem is often shared; suffix list/table position when present.
  const dis = extractQueueCompletionDisambiguator(event);
  const remScoped = [
    asIdString(e.remId),
    rem?._id != null ? asIdString(rem._id) : null,
    asIdString(card?.remId),
  ];
  for (const s of remScoped) {
    if (s) return dis ? `id:${s}~${dis}` : `id:${s}`;
  }

  try {
    return `fp:${hashDjb2Base36(stableQueueEventJson(event))}`;
  } catch {
    return null;
  }
}

/** Persisted shape: each recent key is stored with the epoch ms at which we last saw it. */
export interface RecentKeyEntry {
  key: string;
  at: number;
}

/**
 * Accept both the current `{ key, at }[]` shape and legacy plain-string arrays from earlier
 * plugin versions. Legacy entries are treated as "just happened at epoch 0" and will fall
 * outside the dedupe window immediately, so they don't block real reviews after a plugin
 * upgrade.
 */
export function parseRecentQueueCompleteKeys(raw: unknown): RecentKeyEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentKeyEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) {
      out.push({ key: item, at: 0 });
      continue;
    }
    if (item && typeof item === 'object') {
      const k = (item as { key?: unknown }).key;
      const a = (item as { at?: unknown }).at;
      if (
        typeof k === 'string' &&
        k.length > 0 &&
        typeof a === 'number' &&
        Number.isFinite(a)
      ) {
        out.push({ key: k, at: a });
      }
    }
  }
  return out.slice(-MAX_RECENT_KEYS);
}

export function rememberQueueCompleteKey(
  recent: RecentKeyEntry[],
  key: string,
  now: number = Date.now(),
): RecentKeyEntry[] {
  const without = recent.filter((e) => e.key !== key);
  return [...without, { key, at: now }].slice(-MAX_RECENT_KEYS);
}

/**
 * @param recentKeys entries already processed this session (newest last)
 * @param extractedKey from {@link extractQueueCompleteDedupeKey} — null if unknown
 * @param now epoch ms; defaults to Date.now(). Overridable for deterministic tests.
 * @returns whether to run the review pipeline, and updated key list to persist if processing
 */
export function evaluateQueueCompleteDedupe(
  recentKeys: RecentKeyEntry[],
  extractedKey: string | null,
  now: number = Date.now(),
): { shouldProcess: boolean; nextKeysIfProcessed: RecentKeyEntry[] } {
  if (extractedKey == null) {
    return { shouldProcess: true, nextKeysIfProcessed: recentKeys };
  }
  const existing = recentKeys.find((e) => e.key === extractedKey);
  if (existing && now - existing.at < QUEUE_COMPLETE_DEDUPE_MS) {
    return { shouldProcess: false, nextKeysIfProcessed: recentKeys };
  }
  return {
    shouldProcess: true,
    nextKeysIfProcessed: rememberQueueCompleteKey(recentKeys, extractedKey, now),
  };
}
