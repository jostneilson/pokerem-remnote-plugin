/**
 * Serialize mutating writes to synced game storage within one widget iframe.
 * Concurrent read-modify-write paths (queue review vs battle / sidebar) must not overwrite each other.
 *
 * Do not use the Web Locks API here. RemNote runs plugins in iframes without `allow-same-origin`,
 * so `navigator.locks.request` always rejects with SecurityError at that opaque origin.
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
