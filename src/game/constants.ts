import type { RNPlugin } from '@remnote/plugin-sdk';

/** Reviews needed after the last encounter (or start) before a wild appears. */
export const REVIEWS_PER_ENCOUNTER = 3;

/**
 * When the pipeline does not pass a custom value, Route Finds use this many paced reviews
 * (same ticks as wild progress) before a travel discovery roll.
 */
export const ROUTE_FIND_REVIEWS_DEFAULT = 11;

/** Multiplier over `encounterRate` to derive Route Find pacing in the pipeline (keeps finds rarer than wilds). */
export const ROUTE_FIND_REVIEWS_PER_ENCOUNTER_MULT = 3.67;

/** XP awarded when you defeat a wild Pokémon (minimal slice). */
export const XP_ON_DEFEAT = 25;

export const STORAGE_KEY = 'pokerem_game_v1';

/** Must match `useOnMessageBroadcast` first argument and `broadcast({ channel })`. */
export const SYNC_BROADCAST_KEY = 'pokerem_sync_v1';

function b64decode(s: string): string {
  if (typeof atob === 'function') return atob(s);
  return Buffer.from(s, 'base64').toString('utf8');
}

/** Pre-rename synced game id (base64 in source so the repo stays free of the old product name). */
const LEGACY_SYNCED_GAME_ID = b64decode('YW5raW1vbl9nYW1lX3Yx');

/**
 * Reads the saved game blob, copying from legacy storage into {@link STORAGE_KEY} once if needed.
 */
export async function getSyncedGameRaw(plugin: RNPlugin): Promise<unknown> {
  let cur = await plugin.storage.getSynced(STORAGE_KEY);
  if (cur != null && cur !== '') return cur;
  const old = await plugin.storage.getSynced(LEGACY_SYNCED_GAME_ID);
  if (old != null && old !== '') {
    await plugin.storage.setSynced(STORAGE_KEY, old);
    return old;
  }
  return cur;
}
