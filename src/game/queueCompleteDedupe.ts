/**
 * Deduplicate RemNote `QueueCompleteCard` events so navigation back/forward on the same
 * card does not inflate cardsReviewed, daily stats, or wild pacing.
 *
 * Table-derived and list-style flashcards often reuse one parent `remId` / `card.remId`
 * while the stable per-completion identity lives on `card._id`, `rem._id`, row indices,
 * or similar — we must not treat every row as the same review.
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
