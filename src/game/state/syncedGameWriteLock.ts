/**
 * Serialize mutating writes to synced game storage.
 * Concurrent read-modify-write paths (queue review vs battle / sidebar) must not overwrite each other.
 */
let writeChain: Promise<unknown> = Promise.resolve();

export function withSyncedGameWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
