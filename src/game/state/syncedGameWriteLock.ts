/**
 * Serialize mutating writes to synced game storage.
 * Concurrent read-modify-write paths (queue review vs battle / sidebar) must not overwrite each other.
 * Uses Web Locks API when available for cross-window / cross-tab mutual exclusion.
 */
let writeChain: Promise<unknown> = Promise.resolve();

export function withSyncedGameWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(() => {
    const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined;
    return locks ? (locks.request('pokerem-game-write', fn) as Promise<T>) : fn();
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
