/**
 * Derives stable dedupe keys and wild-encounter “review units” from RemNote queue events.
 * Field names are defensive — RemNote SDK versions may vary.
 */

const VOLATILE_KEYS = new Set([
  'timestamp',
  'time',
  'at',
  'date',
  'now',
  'nonce',
  'random',
  'requestId',
  'eventId',
]);

function clampEncounterMultiplier(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(50, Math.floor(n));
}

/** Count list / enumeration items completed in one QueueCompleteCard (if exposed). */
export function extractEncounterReviewMultiplier(event: unknown): number {
  if (event == null || typeof event !== 'object') return 1;
  const e = event as Record<string, unknown>;

  const tryNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  const direct = [
    tryNum(e.itemsAnswered),
    tryNum(e.itemsCompleted),
    tryNum(e.completedListItems),
    tryNum(e.listItemsCompleted),
    tryNum(e.listItemsAnswered),
    tryNum(e.bulletsCompleted),
    tryNum(e.enumerationCount),
  ].find((x) => x != null && x >= 1);
  if (direct != null) return clampEncounterMultiplier(direct);

  if (Array.isArray(e.completedIndices) && e.completedIndices.length >= 1) {
    return clampEncounterMultiplier(e.completedIndices.length);
  }
  if (Array.isArray(e.answers) && e.answers.length >= 1) {
    return clampEncounterMultiplier(e.answers.length);
  }
  if (Array.isArray(e.completedItems) && e.completedItems.length >= 1) {
    return clampEncounterMultiplier(e.completedItems.length);
  }

  const card = e.card;
  if (card && typeof card === 'object') {
    const c = card as Record<string, unknown>;
    const fromCard = [
      tryNum(c.listItemCount),
      tryNum(c.bulletCount),
      tryNum(c.itemsInList),
      tryNum(c.enumerationLength),
    ].find((x) => x != null && x >= 1);
    if (fromCard != null) return clampEncounterMultiplier(fromCard);
  }

  const queueItem = e.queueItem;
  if (queueItem && typeof queueItem === 'object') {
    const q = queueItem as Record<string, unknown>;
    const fromQi = [tryNum(q.listItemCount), tryNum(q.itemsAnswered)].find((x) => x != null && x >= 1);
    if (fromQi != null) return clampEncounterMultiplier(fromQi);
  }

  return 1;
}

function stripVolatile(value: unknown, depth: number): unknown {
  if (depth <= 0 || value == null) return value;
  if (Array.isArray(value)) {
    return value.map((x) => stripVolatile(x, depth - 1));
  }
  if (typeof value !== 'object') return value;
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (VOLATILE_KEYS.has(k)) continue;
    out[k] = stripVolatile(v, depth - 1);
  }
  return out;
}

/** Stable JSON string for hashing when no card id is present (bounded depth, volatile keys stripped). */
export function stableQueueEventJson(event: unknown): string {
  try {
    const pruned = stripVolatile(event, 6);
    return JSON.stringify(pruned);
  } catch {
    return String(event);
  }
}
