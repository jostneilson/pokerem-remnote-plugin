import type { RNPlugin } from '@remnote/plugin-sdk';
import { applyGameCommand, isGameCommand, type GameCommand } from './commands';
import { STORAGE_KEY, SYNC_BROADCAST_KEY, getSyncedGameRaw } from './constants';
import type { PokeRemGameState } from './state/model';
import { RECENT_COMMAND_NONCE_LIMIT } from './state/reducers/persistence';
import { parseGameState } from './state/store';
import { withSyncedGameWrite } from './state/syncedGameWriteLock';

/*
 * Single writer for the synced save.
 *
 * The sidebar, queue strip and popup each run in their own iframe. A write lock only works inside one iframe,
 * so a sidebar action and a card review could read the same save and one would overwrite the other (that is how
 * an XP Doubler could vanish). Widgets now broadcast a command; the plugin host (index widget) applies it in the
 * same serial queue as card reviews, saves, and broadcasts an ack. If the host never answers (an older host that
 * doesn't deliver broadcasts to the index widget), the widget falls back to writing directly, as before.
 */

export const COMMAND_CHANNEL = 'pokerem_command_v1';
/**
 * `MESSAGE_BROADCAST_EVENT` from the SDK (0.0.14). Spelled out so this file never loads the SDK at runtime:
 * the SDK touches `self` on import, which breaks the Node tests.
 */
const MESSAGE_BROADCAST_EVENT = 'messaging.broadcast';
/** How long a widget waits for the host before writing itself. */
export const COMMAND_ACK_TIMEOUT_MS = 2500;

export type CommandMessage = { channel: typeof COMMAND_CHANNEL; nonce: string; commands: GameCommand[] };
export type AckMessage = { channel: typeof SYNC_BROADCAST_KEY; at?: number; ack: string };

/** RemNote hands broadcast listeners `{ message }`; the host simulator hands the message itself. */
export function unwrapBroadcast(event: unknown): unknown {
  if (event && typeof event === 'object' && 'message' in event) return (event as { message: unknown }).message;
  return event;
}

export function isCommandMessage(value: unknown): value is CommandMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<CommandMessage>;
  return v.channel === COMMAND_CHANNEL && typeof v.nonce === 'string' && Array.isArray(v.commands);
}

function isAckMessage(value: unknown): value is AckMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AckMessage>;
  return v.channel === SYNC_BROADCAST_KEY && typeof v.ack === 'string';
}

/** Apply a batch of commands in order; returns the same object when nothing changed. */
export function applyGameCommands(state: PokeRemGameState, commands: GameCommand[]): PokeRemGameState {
  let next = state;
  for (const c of commands) if (isGameCommand(c)) next = applyGameCommand(next, c);
  return next;
}

/**
 * Apply a batch tagged with `nonce`, once: a nonce already in the save is skipped, so the host and a widget's
 * fallback write can't both apply the same tap.
 */
export function applyCommandBatch(state: PokeRemGameState, commands: GameCommand[], nonce: string): PokeRemGameState {
  const recent = state.recentCommandNonces ?? [];
  if (recent.includes(nonce)) return state;
  const next = applyGameCommands(state, commands);
  if (next === state) return state;
  return { ...next, recentCommandNonces: [...recent, nonce].slice(-RECENT_COMMAND_NONCE_LIMIT) };
}

/** Read, apply and save under this iframe's write lock. Returns the saved (or unchanged) state. */
export async function writeCommandsDirect(
  plugin: RNPlugin,
  commands: GameCommand[],
  nonce: string,
  ack?: boolean
): Promise<PokeRemGameState> {
  return withSyncedGameWrite(async () => {
    const prev = parseGameState(await getSyncedGameRaw(plugin));
    const next = applyCommandBatch(prev, commands, nonce);
    if (next !== prev) await plugin.storage.setSynced(STORAGE_KEY, next);
    if (next !== prev || ack) {
      try {
        await plugin.messaging.broadcast({ channel: SYNC_BROADCAST_KEY, at: next.lastUpdatedAt, ...(ack ? { ack: nonce } : {}) });
      } catch {
        /* non-fatal; storage write already succeeded */
      }
    }
    return next;
  });
}

// ── Host side ────────────────────────────────────────────────────────────────

const HOST_SEEN_LIMIT = 200;

/** Start applying widget commands in the plugin host. Call once from the index widget. */
export function startCommandHost(plugin: RNPlugin): () => void {
  const seen: string[] = [];
  const onBroadcast = (event: unknown) => {
    const msg = unwrapBroadcast(event);
    if (!isCommandMessage(msg) || seen.includes(msg.nonce)) return;
    seen.push(msg.nonce);
    if (seen.length > HOST_SEEN_LIMIT) seen.shift();
    void writeCommandsDirect(plugin, msg.commands, msg.nonce, true).catch((e) => console.error('[PokéRem] Command failed in host', e));
  };
  // Registered under both keys: RemNote may or may not filter broadcast listeners by key. The nonce check makes
  // a double delivery harmless.
  plugin.event.addListener(MESSAGE_BROADCAST_EVENT, undefined, onBroadcast);
  plugin.event.addListener(MESSAGE_BROADCAST_EVENT, COMMAND_CHANNEL, onBroadcast);
  return () => {
    plugin.event.removeListener(MESSAGE_BROADCAST_EVENT, undefined, onBroadcast);
    plugin.event.removeListener(MESSAGE_BROADCAST_EVENT, COMMAND_CHANNEL, onBroadcast);
  };
}

// ── Widget side ──────────────────────────────────────────────────────────────

const pendingAcks = new Map<string, () => void>();
let clientListening = false;
/** null = not known yet; false = the host didn't answer once, so this iframe writes directly. */
let hostAvailable: boolean | null = null;

function listenForAcks(plugin: RNPlugin) {
  if (clientListening) return;
  clientListening = true;
  const onBroadcast = (event: unknown) => {
    const msg = unwrapBroadcast(event);
    if (!isAckMessage(msg)) return;
    const done = pendingAcks.get(msg.ack);
    if (done) {
      pendingAcks.delete(msg.ack);
      done();
    }
  };
  plugin.event.addListener(MESSAGE_BROADCAST_EVENT, undefined, onBroadcast);
  plugin.event.addListener(MESSAGE_BROADCAST_EVENT, SYNC_BROADCAST_KEY, onBroadcast);
}

function makeNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Send commands to the host and resolve with the saved state. Falls back to a direct write when the host
 * doesn't answer in time (and remembers that for the rest of this iframe's life).
 */
export async function submitGameCommands(plugin: RNPlugin, commands: GameCommand[]): Promise<PokeRemGameState> {
  const nonce = makeNonce();
  if (hostAvailable === false) return writeCommandsDirect(plugin, commands, nonce);
  listenForAcks(plugin);
  const acked = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      pendingAcks.delete(nonce);
      resolve(false);
    }, COMMAND_ACK_TIMEOUT_MS);
    pendingAcks.set(nonce, () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  const message: CommandMessage = { channel: COMMAND_CHANNEL, nonce, commands };
  try {
    await plugin.messaging.broadcast(message);
  } catch {
    pendingAcks.delete(nonce);
    hostAvailable = false;
    return writeCommandsDirect(plugin, commands, nonce);
  }
  if (await acked) {
    hostAvailable = true;
    return parseGameState(await getSyncedGameRaw(plugin));
  }
  if (hostAvailable !== true) {
    hostAvailable = false;
    console.warn('[PokéRem] The plugin host did not answer; saving from this panel instead.');
  }
  // The host was available before but missed this one (busy or reloading): write directly so the tap isn't lost.
  // The nonce is saved with the change, so a late host delivery can't apply the same command twice.
  return writeCommandsDirect(plugin, commands, nonce);
}

/** Test hook: forget what this iframe learned about the host. */
export function resetCommandClientForTests() {
  hostAvailable = null;
  pendingAcks.clear();
  clientListening = false;
}
