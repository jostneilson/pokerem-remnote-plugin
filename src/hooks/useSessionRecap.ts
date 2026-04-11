import { useEffect, useState } from 'react';
import type { RNPlugin } from '@remnote/plugin-sdk';
import type { PokeRemGameState } from '../game/state/model';

const SESSION_RECAP_KEY = 'pokerem.sessionRecapBaseline';

export type SessionRecapBaseline = {
  /** Lifetime cards reviewed when this session baseline was captured — deltas use current − this. */
  cardsReviewed: number;
  utcDate: string;
  dailyEncounters: number;
  dailyCatches: number;
};

export type SessionRecapDeltas = {
  ready: boolean;
  cardsReviewed: number;
  wildEncounters: number;
  catches: number;
};

/**
 * “This session” recap: cards since sidebar session started; wilds/catches since baseline on the same UTC day.
 * Baseline is stored in RemNote session storage (clears when the app session ends).
 */
export function useSessionRecap(plugin: RNPlugin, state: PokeRemGameState | null): SessionRecapDeltas {
  const [baseline, setBaseline] = useState<SessionRecapBaseline | null>(null);

  useEffect(() => {
    if (!state?.starterChosen) {
      setBaseline(null);
      return;
    }

    let cancel = false;
    void (async () => {
      try {
        const raw = await plugin.storage.getSession(SESSION_RECAP_KEY);
        const ds = state.dailyStats;
        const utc = ds?.date ?? new Date().toISOString().slice(0, 10);

        const snapFresh = (): SessionRecapBaseline => ({
          cardsReviewed: state.cardsReviewed,
          utcDate: utc,
          dailyEncounters: ds?.encounters ?? 0,
          dailyCatches: ds?.catches ?? 0,
        });

        if (raw == null || typeof raw !== 'object') {
          const b = snapFresh();
          if (cancel) return;
          await plugin.storage.setSession(SESSION_RECAP_KEY, b);
          if (!cancel) setBaseline(b);
          return;
        }

        const c = raw as SessionRecapBaseline;
        if (ds && c.utcDate !== ds.date) {
          const rolled: SessionRecapBaseline = {
            ...c,
            utcDate: ds.date,
            dailyEncounters: ds.encounters,
            dailyCatches: ds.catches,
          };
          if (cancel) return;
          await plugin.storage.setSession(SESSION_RECAP_KEY, rolled);
          if (!cancel) setBaseline(rolled);
          return;
        }

        if (!cancel) setBaseline(c);
      } catch {
        if (!cancel) setBaseline(null);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [plugin, state?.starterChosen, state?.dailyStats?.date]);

  if (!state?.starterChosen || !baseline) {
    return { ready: !!state?.starterChosen && baseline !== null, cardsReviewed: 0, wildEncounters: 0, catches: 0 };
  }

  const ds = state.dailyStats;
  const sameDay = ds?.date === baseline.utcDate;

  const cardsReviewed = Math.max(0, state.cardsReviewed - baseline.cardsReviewed);
  const wildEncounters = sameDay ? Math.max(0, (ds?.encounters ?? 0) - baseline.dailyEncounters) : 0;
  const catches = sameDay ? Math.max(0, (ds?.catches ?? 0) - baseline.dailyCatches) : 0;

  return {
    ready: true,
    cardsReviewed,
    wildEncounters,
    catches,
  };
}
