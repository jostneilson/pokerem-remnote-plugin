import type { RNPlugin } from '@remnote/plugin-sdk';
import {
  STORAGE_KEY,
  SYNC_BROADCAST_KEY,
  getSyncedGameRaw,
  REVIEWS_PER_ENCOUNTER,
  ROUTE_FIND_REVIEWS_PER_ENCOUNTER_MULT,
} from './constants';
import { onQueueCardComplete, parseGameState } from './state/store';
import { withSyncedGameWrite } from './state/syncedGameWriteLock';
import type { PokeRemGameState } from './state/model';
import { shouldShowPokeRemNotification } from './notificationGate';

function parseGenSetting(value: unknown): number[] {
  const s = typeof value === 'string' ? value : 'gen1';
  const match = s.match(/gen1-?(\d)?/);
  if (!match) return [1];
  const maxGen = match[1] ? parseInt(match[1], 10) : 1;
  return Array.from({ length: maxGen }, (_, i) => i + 1);
}

export type RunSingleReviewQueueOpts = {
  encounterReviewMultiplier?: number;
};

/**
 * Single queue completion: read game state only after settings are resolved, inside a write lock,
 * so battle actions cannot be overwritten by a stale snapshot from an earlier read.
 */
export async function runSingleReview(
  plugin: RNPlugin,
  queueOpts?: RunSingleReviewQueueOpts,
): Promise<PokeRemGameState> {
  let enabledGens: number[] | undefined;
  let encounterRate: number | undefined;
  let reviewWeight = 1;
  try {
    const genSetting = await plugin.settings.getSetting('pokerem.generations');
    enabledGens = parseGenSetting(genSetting);
  } catch { /* use default */ }
  try {
    const rateSetting = await plugin.settings.getSetting('pokerem.encounterRate');
    if (typeof rateSetting === 'string') {
      const parsed = parseInt(rateSetting, 10);
      if (!isNaN(parsed) && parsed >= 1) encounterRate = parsed;
    }
  } catch { /* use default */ }

  let autoClearLog = true;
  try {
    const acl = await plugin.settings.getSetting<boolean>('pokerem.autoClearLog');
    if (acl === false) autoClearLog = false;
  } catch { /* default true */ }

  let encounterPacingModulo = 1;
  try {
    const pace = await plugin.settings.getSetting<string>('pokerem.encounterPacing');
    if (pace === 'every_2_reviews') encounterPacingModulo = 2;
  } catch { /* default */ }

  try {
    const rq = await plugin.settings.getSetting<string>('pokerem.reviewProgress');
    if (rq === 'light') reviewWeight = 0.75;
    else if (rq === 'half') reviewWeight = 0.5;
  } catch { /* default full */ }

  const { prev, next } = await withSyncedGameWrite(async () => {
    const raw = await getSyncedGameRaw(plugin);
    const prevInner = parseGameState(raw);
    let effectiveEncounterRate = encounterRate;
    let effectiveReviewWeight = reviewWeight;
    if (prevInner.studyDifficultyConfigured) {
      effectiveEncounterRate = prevInner.studyReviewsPerEncounter;
      effectiveReviewWeight = prevInner.studyCardWeight;
    }

    const routeFindReviewsNeeded = Math.max(
      8,
      Math.round((effectiveEncounterRate ?? REVIEWS_PER_ENCOUNTER) * ROUTE_FIND_REVIEWS_PER_ENCOUNTER_MULT),
    );

    const nextInner = onQueueCardComplete(prevInner, enabledGens, effectiveEncounterRate, {
      autoClearLog,
      encounterPacingModulo,
      reviewWeight: effectiveReviewWeight,
      routeFindReviewsNeeded,
      encounterReviewMultiplier: queueOpts?.encounterReviewMultiplier,
    });
    await plugin.storage.setSynced(STORAGE_KEY, nextInner);
    try {
      await plugin.messaging.broadcast({ channel: SYNC_BROADCAST_KEY, at: nextInner.lastUpdatedAt });
    } catch {
      // non-fatal; storage write already succeeded
    }
    return { prev: prevInner, next: nextInner };
  });

  // Toast notifications and floating popup for important events
  try {
    const shouldNotify = await shouldShowPokeRemNotification(plugin);
    if (!shouldNotify) return next;

    if (next.currentEncounter && !prev.currentEncounter) {
      const tier = next.currentEncounter.tier;
      const tierLabel = tier && tier !== 'Common' ? ` (${tier})` : '';
      await plugin.app.toast(`Wild ${next.currentEncounter.name}${tierLabel} appeared!`);

      // Show floating encounter popup near queue answer button (puppy pattern)
      let floatingPopup = true;
      try {
        const fp = await plugin.settings.getSetting<boolean>('pokerem.feature.encounterFloatingPopup');
        if (fp === false) floatingPopup = false;
      } catch { /* default on */ }
      if (floatingPopup) {
        try {
          setTimeout(async () => {
            try {
              await (plugin as any).window.openFloatingWidget(
                'pokerem_encounter_popup',
                { top: -120, left: 0 },
                'rn-queue__show-answer-btn',
              );
            } catch { /* FloatingWidget may not be supported */ }
          }, 100);
        } catch { /* non-critical */ }
      }
    }
    if ((next.currentStreak ?? 0) > (prev.currentStreak ?? 0)) {
      const streak = next.currentStreak ?? 0;
      if (streak === 7 || streak === 14 || streak === 30 || streak === 100) {
        await plugin.app.toast(`🔥 ${streak}-day study streak! Keep it up!`);
      }
    }
    if (next.trainerRank !== prev.trainerRank && next.trainerRank !== 'Novice Trainer') {
      await plugin.app.toast(`Rank up! You are now a ${next.trainerRank}!`);
    }
    if ((next.routeFindNoticeSeq ?? 0) > (prev.routeFindNoticeSeq ?? 0) && next.routeFindNotice) {
      const rf = next.routeFindNotice;
      const label = rf.source === 'scrap' ? 'Battle scrap' : 'Route find';
      await plugin.app.toast(`${label}: ${rf.headline}`);
    }
  } catch { /* toast is non-critical */ }

  return next;
}
