import { useCallback, useEffect, useRef, useState } from 'react';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { getBattleFlowPhase } from '../game/battleFlow';
import { STORAGE_KEY, SYNC_BROADCAST_KEY, getSyncedGameRaw } from '../game/constants';
import type { PokeRemGameState } from '../game/state/model';
import { withSyncedGameWrite } from '../game/state/syncedGameWriteLock';
import { planAutoAttack } from '../game/engine/autoAttack';
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
  const autoToken = useRef(0);
  const [autoAttacking, setAutoAttacking] = useState(false);
  const [autoAttackMessage, setAutoAttackMessage] = useState('');
  const stopAutoAttack = useCallback(() => { autoToken.current++; setAutoAttacking(false); setAutoAttackMessage('Auto attack stopped.'); }, []);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stopAutoAttack(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { autoToken.current++; document.removeEventListener('visibilitychange', onVisibility); };
  }, [stopAutoAttack]);
  const busyRef = useRef(false);
  const [battleBusy, setBattleBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<null | 'catch' | 'fight' | 'run'>(null);

  const applyBattleAction = useCallback(
    async (action: 'catch' | 'fight' | 'run', fn: (s: PokeRemGameState) => PokeRemGameState) => {
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;
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
          return undefined;
        }
        onStateCommitted(next);

        try {
          const shouldNotify = await shouldShowPokeRemNotification(plugin);
          if (!shouldNotify) return next;
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
        return next;
      } catch (e) {
        console.error(`[${BRAND.wordmark}] Battle action save failed`, e);
        try {
          await plugin.app.toast(`${BRAND.wordmark} could not save this action. Try again.`);
        } catch {
          /* unknown host */
        }
      } finally {
        busyRef.current = false;
        setBattleBusy(false);
        setBusyAction(null);
      }
    },
    [onStateCommitted, plugin],
  );

  const getFlowPhase = useCallback(
    (state: PokeRemGameState) => getBattleFlowPhase(state, battleBusy),
    [battleBusy],
  );

  const startAutoAttack = useCallback(async (initial: PokeRemGameState) => {
    const token = ++autoToken.current;
    setAutoAttacking(true);
    let expected = initial;
    try {
      for (let turn = 0; turn < 100 && token === autoToken.current; turn++) {
        const plan = planAutoAttack(expected);
        setAutoAttackMessage(plan.message);
        if (!plan.moveId) break;
        await new Promise(resolve => window.setTimeout(resolve, 900));
        if (token !== autoToken.current) break;
        const next = await applyBattleAction('fight', current => {
          // Recheck inside the save lock: another window may have changed the encounter.
          if (token !== autoToken.current || current.activePokemonId !== expected.activePokemonId ||
              JSON.stringify(current.currentEncounter) !== JSON.stringify(expected.currentEncounter)) return current;
          const fresh = planAutoAttack(current);
          setAutoAttackMessage(fresh.message);
          return fresh.moveId ? applyCombatTurn(current, fresh.moveId) : current;
        });
        if (token !== autoToken.current) break;
        if (!next) { setAutoAttackMessage('Auto attack stopped. Check the encounter before continuing.'); break; }
        expected = next;
        if (turn === 99) setAutoAttackMessage('Auto attack paused. You can continue manually.');
      }
    } finally {
      if (token === autoToken.current) setAutoAttacking(false);
    }
  }, [applyBattleAction]);

  const makeCatch = useCallback(() => {
    stopAutoAttack();
    void applyBattleAction('catch', (s) => catchEncounter(s, nextCatchBallForBag(s.bag)));
  }, [applyBattleAction, stopAutoAttack]);

  const makeFightMove = useCallback(
    (moveId?: string) => {
      stopAutoAttack();
      void applyBattleAction('fight', (s) => applyCombatTurn(s, moveId));
    },
    [applyBattleAction, stopAutoAttack],
  );

  const makeRun = useCallback(() => {
    stopAutoAttack();
    void applyBattleAction('run', (s) => runFromEncounter(s));
  }, [applyBattleAction, stopAutoAttack]);

  return {
    autoAttacking, autoAttackMessage, startAutoAttack, stopAutoAttack,
    battleBusy,
    busyAction,
    applyBattleAction,
    getFlowPhase,
    makeCatch,
    makeFightMove,
    makeRun,
  };
}
