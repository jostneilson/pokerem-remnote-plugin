import type { RNPlugin } from '@remnote/plugin-sdk';

type PostMessagePayload = {
  isIntendedForRemNoteAPIPlugin?: boolean;
  eventId?: string;
};

/**
 * RemNote sometimes posts plugin messages with `eventId: "setCustomCSS"`. SDK 0.0.14 does not list that
 * id in its validator, so `_receive` does `throw "Invalid event setCustomCSS"` (a string). That becomes a
 * window `error` and React Refresh shows an overlay — unrelated to our app calling `registerCSS`.
 *
 * Also no-op `app.registerCSS` so any outbound call cannot hit the same broken host path.
 */
export function neutralizeBrokenRegisterCSS(plugin: RNPlugin): void {
  const p = plugin as unknown as Record<string, unknown>;
  if (p.__pokeremBridgeNeutralized) return;
  p.__pokeremBridgeNeutralized = true;

  try {
    const app = plugin.app as { registerCSS?: (id: string, css: string) => Promise<void> };
    app.registerCSS = async () => {};
  } catch {
    /* ignore */
  }

  try {
    const protoReceive = (plugin as { _receive?: (ev: MessageEvent) => void })._receive;
    if (typeof protoReceive !== 'function') return;
    const bound = protoReceive.bind(plugin);
    (plugin as { _receive: (ev: MessageEvent) => void })._receive = (ev: MessageEvent) => {
      const d = ev?.data as PostMessagePayload | undefined;
      if (d?.isIntendedForRemNoteAPIPlugin && d.eventId === 'setCustomCSS') return;
      return bound(ev);
    };
  } catch {
    /* ignore */
  }
}
