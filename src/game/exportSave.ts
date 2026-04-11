import type { RNPlugin } from '@remnote/plugin-sdk';
import { getSyncedGameRaw, STORAGE_KEY } from './constants';

export type PokeRemExportEnvelope = {
  exportVersion: 1;
  exportedAt: string;
  storageKey: string;
  /** Raw synced blob as returned by RemNote (usually your game JSON object). */
  game: unknown;
};

/**
 * Downloads a JSON backup of the synced save. RemNote sync still applies to the live slot;
 * this file is for your own archive / peace of mind.
 */
export async function downloadPokeRemSaveBackup(plugin: RNPlugin): Promise<void> {
  const raw = await getSyncedGameRaw(plugin);
  const payload: PokeRemExportEnvelope = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    game: raw,
  };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pokerem-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
