import { useCallback, useEffect, useRef, useState } from 'react';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { getBattleFlowPhase } from '../game/battleFlow';
import { submitGameCommands } from '../game/commandChannel';
import { gameCommand, type GameCommand } from '../game/commands';
import type { PokeRemGameState } from '../game/state/model';
import { planAutoAttack } from '../game/engine/autoAttack';
import { BRAND } from '../ui/theme/gameTheme';
import type { CatchBall } from '../game/engine/encounters';
import { shouldShowPokeRemNotification } from '../game/notificationGate';

export function usePokeRemBattleActions(
  plugin: RNPlugin,
  onStateCommitted: (next: PokeRemGameState) => void,
  /** The state the player is looking at, used to tell whether an action changed anything. */
  current?: PokeRemGameState,
) {
  const beforeRef = useRef<PokeRemGameState | undefined>(current);
  beforeRef.current = current;
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
    async (action: 'catch' | 'fight' | 'run', command: GameCommand) => {
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;
      setBattleBusy(true);
      setBusyAction(action);
      try {
        const prev = beforeRef.current;
        const next = await submitGameCommands(plugin, [command]);
        if (prev && JSON.stringify(next) === JSON.stringify(prev)) {
          onStateCommitted(next);
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
          const prevAch = prev ? Object.values(prev.achievements).filter(Boolean).length : 0;
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
        const next = await applyBattleAction(
          'fight',
          // Applied by the host only if the lead and encounter are still the ones planned against.
          gameCommand('autoAttackStep', expected.activePokemonId ?? '', JSON.stringify(expected.currentEncounter))
        );
        if (next) setAutoAttackMessage(planAutoAttack(next).message);
        if (token !== autoToken.current) break;
        if (!next) { setAutoAttackMessage('Auto attack stopped. Check the encounter before continuing.'); break; }
        expected = next;
        if (turn === 99) setAutoAttackMessage('Auto attack paused. You can continue manually.');
      }
    } finally {
      if (token === autoToken.current) setAutoAttacking(false);
    }
  }, [applyBattleAction]);

  /** Throw `ball`, or the recommended one (cheapest with a reasonable chance) when none is given. */
  const makeCatch = useCallback((ball?: CatchBall) => {
    stopAutoAttack();
    void applyBattleAction('catch', gameCommand('catchWithBall', ball));
  }, [applyBattleAction, stopAutoAttack]);

  const makeFightMove = useCallback(
    (moveId?: string) => {
      stopAutoAttack();
      void applyBattleAction('fight', gameCommand('applyCombatTurn', moveId));
    },
    [applyBattleAction, stopAutoAttack],
  );

  const makeRun = useCallback((giveUpPrize?: boolean) => {
    stopAutoAttack();
    void applyBattleAction('run', gameCommand('runFromEncounter', giveUpPrize === true));
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
