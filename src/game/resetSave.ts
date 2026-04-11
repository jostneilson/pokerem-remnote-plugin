import type { RNPlugin } from '@remnote/plugin-sdk';
import { STORAGE_KEY, SYNC_BROADCAST_KEY } from './constants';
import { withSyncedGameWrite } from './state/syncedGameWriteLock';
import { createInitialStateV3 } from './state/store';

/** Writes a fresh game state to synced storage and notifies other plugin surfaces (queue strip, etc.). */
export async function resetPokeRemGameSave(plugin: RNPlugin): Promise<void> {
  await withSyncedGameWrite(async () => {
    const fresh = { ...createInitialStateV3(), lastUpdatedAt: Date.now() };
    await plugin.storage.setSynced(STORAGE_KEY, fresh);
    try {
      await plugin.messaging.broadcast({ channel: SYNC_BROADCAST_KEY, at: fresh.lastUpdatedAt });
    } catch {
      /* non-fatal */
    }
  });
}
