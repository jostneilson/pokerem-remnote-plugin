import type { RNPlugin } from '@remnote/plugin-sdk';
import { STORAGE_KEY, SYNC_BROADCAST_KEY, getSyncedGameRaw } from './constants';
import { planAutoAttack } from './engine/autoAttack';
import { recommendedBall } from './engine/encounters';
import type { PokeRemGameState } from './state/model';
import { activePokemon, applyCombatTurn, cancelPendingCaught, catchEncounter, parseGameState, quickHealLead, runFromEncounter } from './state/store';
import { withSyncedGameWrite } from './state/syncedGameWriteLock';
// Circular with commandChannel → commands → this file; only used inside functions, so load order is safe.
import { submitGameCommands } from './commandChannel';

/** Wild-battle actions the queue strip, encounter popup and RemNote commands can run with the sidebar closed. */
export type QueueAction = 'catch' | 'fight' | 'auto' | 'run' | 'heal' | 'store';

/** Most turns one Auto tap plays (it stops earlier at knockout range so you can catch). */
const AUTO_TURN_LIMIT = 20;

export function applyQueueAction(state: PokeRemGameState, action: QueueAction): PokeRemGameState {
  if (!state.starterChosen) return state;
  if (action === 'heal') return quickHealLead(state);
  if (action === 'store') return cancelPendingCaught(state);
  const enc = state.currentEncounter;
  if (!enc || state.currentTrainerBattle) return state;
  if (action === 'catch') return catchEncounter(state, recommendedBall(state.bag, enc, activePokemon(state)));
  if (action === 'run') return runFromEncounter(state);
  if (action === 'fight') return applyCombatTurn(state);
  let next = state;
  for (let turn = 0; turn < AUTO_TURN_LIMIT; turn++) {
    const plan = planAutoAttack(next);
    if (!plan.moveId) break;
    next = applyCombatTurn(next, plan.moveId, true);
  }
  return next;
}

/**
 * Run one queue action from a widget through the plugin host (the single writer; see commandChannel.ts).
 * Returns the saved state, or null if nothing changed.
 */
export async function runQueueAction(plugin: RNPlugin, action: QueueAction): Promise<PokeRemGameState | null> {
  const before = parseGameState(await getSyncedGameRaw(plugin));
  const next = await submitGameCommands(plugin, [{ name: 'queueAction', args: [action] }]);
  return JSON.stringify(next) === JSON.stringify(before) ? null : next;
}

/** The host's own path (commands, queue menu entries): apply directly under its write lock. */
export async function runQueueActionInHost(plugin: RNPlugin, action: QueueAction): Promise<PokeRemGameState | null> {
  return withSyncedGameWrite(async () => {
    const prev = parseGameState(await getSyncedGameRaw(plugin));
    const next = applyQueueAction(prev, action);
    if (next === prev) return null;
    await plugin.storage.setSynced(STORAGE_KEY, next);
    try {
      await plugin.messaging.broadcast({ channel: SYNC_BROADCAST_KEY, at: next.lastUpdatedAt });
    } catch {
      /* non-fatal; storage write already succeeded */
    }
    return next;
  });
}
