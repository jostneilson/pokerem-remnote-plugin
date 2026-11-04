import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COMMAND_ACK_TIMEOUT_MS,
  applyCommandBatch,
  resetCommandClientForTests,
  startCommandHost,
  submitGameCommands
} from './commandChannel';
import { applyGameCommand, gameCommand, isGameCommand } from './commands';
import { STORAGE_KEY } from './constants';
import { withSyncedGameWrite } from './state/syncedGameWriteLock';
import {
  activateXpDoubler,
  chooseStarter,
  configureStudyDifficulty,
  createInitialStateV4,
  onQueueCardComplete,
  parseGameState,
  runFromEncounter
} from './state/store';
import type { PokeRemGameState } from './state/model';

function startedState(): PokeRemGameState {
  return configureStudyDifficulty(chooseStarter(createInitialStateV4(), 4), 'medium');
}

/** A fake RemNote plugin: synced storage plus a broadcast bus delivered `{ message }` to every listener. */
function fakePlugin(initial: PokeRemGameState, opts: { deliver?: boolean } = {}) {
  const store: Record<string, unknown> = { [STORAGE_KEY]: JSON.parse(JSON.stringify(initial)) };
  const listeners = new Set<(e: unknown) => void>();
  const plugin = {
    storage: {
      getSynced: async (k: string) => store[k],
      setSynced: async (k: string, v: unknown) => {
        store[k] = JSON.parse(JSON.stringify(v));
      }
    },
    messaging: {
      broadcast: async (message: unknown) => {
        if (opts.deliver === false) return;
        // Deliver asynchronously, like a real postMessage hop.
        setTimeout(() => {
          for (const l of [...listeners]) l({ message });
        }, 1);
      }
    },
    event: {
      addListener: (_e: string, _k: unknown, cb: (e: unknown) => void) => listeners.add(cb),
      removeListener: (_e: string, _k: unknown, cb: (e: unknown) => void) => listeners.delete(cb)
    }
  };
  return { plugin: plugin as never, raw: plugin, read: () => parseGameState(store[STORAGE_KEY]) };
}

afterEach(() => {
  resetCommandClientForTests();
  vi.useRealTimers();
});

describe('game commands', () => {
  it('only accepts registered command names with an args array', () => {
    expect(isGameCommand(gameCommand('setTab', 'party'))).toBe(true);
    expect(isGameCommand({ name: 'constructor', args: [] })).toBe(false);
    expect(isGameCommand({ name: 'setTab' })).toBe(false);
    expect(isGameCommand(null)).toBe(false);
  });

  it('applies a command the same way as calling the reducer', () => {
    const s = startedState();
    expect(applyGameCommand(s, gameCommand('setTab', 'party')).selectedTab).toBe('party');
  });

  it('skips a batch whose nonce is already in the save', () => {
    const s = { ...startedState(), currency: 1000 };
    const once = applyCommandBatch(s, [gameCommand('buyItem', 'poke-ball', 1)], 'n1');
    const twice = applyCommandBatch(once, [gameCommand('buyItem', 'poke-ball', 1)], 'n1');
    expect(once.currency).toBeLessThan(1000);
    expect(twice).toBe(once);
    expect(parseGameState(JSON.parse(JSON.stringify(once))).recentCommandNonces).toEqual(['n1']);
  });
});

describe('single writer', () => {
  it('the host applies a widget command and the widget sees the saved state', async () => {
    const base = { ...startedState(), currency: 5000 };
    const { plugin, read } = fakePlugin(base);
    const stop = startCommandHost(plugin);
    const saved = await submitGameCommands(plugin, [gameCommand('buyItem', 'poke-ball', 2)]);
    stop();
    expect(saved.currency).toBeLessThan(5000);
    expect(read().currency).toBe(saved.currency);
  });

  it('a doubler activated during a card review is never lost', async () => {
    const base = { ...startedState(), bag: { ...startedState().bag, 'xp-doubler-common': 1 } };
    const { plugin, raw, read } = fakePlugin(base);
    const stop = startCommandHost(plugin);
    // The host's card review and the widget's command land at the same moment.
    const review = withSyncedGameWrite(async () => {
      const prev = parseGameState(await raw.storage.getSynced(STORAGE_KEY));
      await new Promise((r) => setTimeout(r, 5));
      await raw.storage.setSynced(STORAGE_KEY, onQueueCardComplete(prev, [1], 3, {}));
    });
    const cmd = submitGameCommands(plugin, [gameCommand('activateXpDoubler', 'common')]);
    await Promise.all([review, cmd]);
    stop();
    const s = read();
    expect(s.cardsReviewed).toBe(1);
    expect(s.xpBoosterActive?.cardsRemaining).toBe(25);
    expect(s.bag['xp-doubler-common'] ?? 0).toBe(0);
  });

  it('falls back to a direct write when no host answers', async () => {
    vi.useFakeTimers();
    const { plugin, read } = fakePlugin({ ...startedState(), currency: 5000 }, { deliver: false });
    const pending = submitGameCommands(plugin, [gameCommand('buyItem', 'poke-ball', 1)]);
    await vi.advanceTimersByTimeAsync(COMMAND_ACK_TIMEOUT_MS + 10);
    const saved = await pending;
    expect(saved.currency).toBeLessThan(5000);
    expect(read().currency).toBe(saved.currency);
  });
});

describe('XP Doublers', () => {
  it('three doublers across 175 cards with battles in between use exactly 25 + 50 + 100 cards', () => {
    let s = startedState();
    s = { ...s, bag: { ...s.bag, 'xp-doubler-common': 1, 'xp-doubler-rare': 1, 'xp-doubler-legendary': 1 } };
    s = activateXpDoubler(s, 'common');
    s = activateXpDoubler(s, 'rare');
    s = activateXpDoubler(s, 'legendary');
    const remaining: number[] = [];
    for (let i = 0; i < 175; i++) {
      s = onQueueCardComplete(s, [1], 3, {});
      // Leave every other wild on screen for a few cards (paused cards still count), then run.
      if (s.currentEncounter && i % 7 === 6) s = runFromEncounter(s);
      remaining.push(s.xpBoosterActive?.cardsRemaining ?? 0);
    }
    expect(remaining[24]).toBe(50);
    expect(remaining[74]).toBe(100);
    expect(s.xpBoosterActive ?? null).toBeNull();
    expect(s.xpBoosterQueue ?? []).toHaveLength(0);
  });
});
