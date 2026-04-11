import { useCallback, useState } from 'react';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { getBattleFlowPhase } from '../game/battleFlow';
import { STORAGE_KEY, SYNC_BROADCAST_KEY, getSyncedGameRaw } from '../game/constants';
import type { PokeRemGameState } from '../game/state/model';
import { withSyncedGameWrite } from '../game/state/syncedGameWriteLock';
import { BRAND } from '../ui/theme/gameTheme';
import { nextCatchBallForBag } from '../game/engine/encounters';
import {
  applyCombatTurn,
  catchEncounter,
  parseGameState,
  runFromEncounter,
} from '../game/state/store';
import { shouldShowPokeRemNotification } from '../game/notificationGate';

export function usePokeRemBattleActions(
  plugin: RNPlugin,
  onStateCommitted: (next: PokeRemGameState) => void,
) {
  const [battleBusy, setBattleBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<null | 'catch' | 'fight' | 'run'>(null);

  const applyBattleAction = useCallback(
    async (action: 'catch' | 'fight' | 'run', fn: (s: PokeRemGameState) => PokeRemGameState) => {
      if (battleBusy) {
        return;
      }
      setBattleBusy(true);
      setBusyAction(action);
      try {
        const { prev, next, wrote } = await withSyncedGameWrite(async () => {
          const raw = await getSyncedGameRaw(plugin);
          const prevInner = parseGameState(raw);
          const nextInner = fn(prevInner);
          if (nextInner === prevInner) {
            return { prev: prevInner, next: nextInner, wrote: false };
          }
          await plugin.storage.setSynced(STORAGE_KEY, nextInner);
          try {
            await plugin.messaging.broadcast({ channel: SYNC_BROADCAST_KEY, at: nextInner.lastUpdatedAt });
          } catch {
            /* non-fatal */
          }
          return { prev: prevInner, next: nextInner, wrote: true };
        });
        if (!wrote) {
          return;
        }
        onStateCommitted(next);

        try {
          const shouldNotify = await shouldShowPokeRemNotification(plugin);
          if (!shouldNotify) return;
          if (next.lastOutcomeKind === 'evolution') {
            await plugin.app.toast(next.lastBattleLog || 'Your Pokemon evolved!');
          }
          if (next.lastOutcomeKind === 'faint') {
            await plugin.app.toast(next.lastBattleLog || 'Your Pokemon fainted!');
          }
          const prevAch = Object.values(prev.achievements).filter(Boolean).length;
          const nextAch = Object.values(next.achievements).filter(Boolean).length;
          if (nextAch > prevAch) {
            await plugin.app.toast(`Achievement unlocked! (${nextAch} total)`);
          }
        } catch { /* non-critical */ }
      } catch (e) {
        console.error(`[${BRAND.wordmark}] Battle action save failed`, e);
        try {
          await plugin.app.toast(`${BRAND.wordmark} could not save this action. Try again.`);
        } catch {
          /* unknown host */
        }
      } finally {
        setBattleBusy(false);
        setBusyAction(null);
      }
    },
    [battleBusy, onStateCommitted, plugin],
  );

  const getFlowPhase = useCallback(
    (state: PokeRemGameState) => getBattleFlowPhase(state, battleBusy),
    [battleBusy],
  );

  const makeCatch = useCallback(() => {
    void applyBattleAction('catch', (s) => catchEncounter(s, nextCatchBallForBag(s.bag)));
  }, [applyBattleAction]);

  const makeFightMove = useCallback(
    (moveId?: string) => {
      void applyBattleAction('fight', (s) => applyCombatTurn(s, moveId));
    },
    [applyBattleAction],
  );

  const makeRun = useCallback(() => {
    void applyBattleAction('run', (s) => runFromEncounter(s));
  }, [applyBattleAction]);

  return {
    battleBusy,
    busyAction,
    applyBattleAction,
    getFlowPhase,
    makeCatch,
    makeFightMove,
    makeRun,
  };
}
