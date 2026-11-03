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
import {
  DEFAULT_TRAINER_FREQUENCY,
  parseTrainerFrequencyKey,
  type TrainerFrequencyKey,
} from './engine/trainerBattles';

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

  let trainerFrequency: TrainerFrequencyKey = DEFAULT_TRAINER_FREQUENCY;
  try {
    const tf = await plugin.settings.getSetting<string>('pokerem.trainerBattleFrequency');
    if (typeof tf === 'string') trainerFrequency = parseTrainerFrequencyKey(tf);
  } catch {
    /* default normal */
  }

  const { prev, next } = await withSyncedGameWrite(async () => {
    const raw = await getSyncedGameRaw(plugin);
    const prevInner = parseGameState(raw);
    // Nothing to advance before a starter is picked. This also means an empty or unreadable save
    // (RemNote storage still starting up) is never replaced with a fresh game.
    if (!prevInner.starterChosen) return { prev: prevInner, next: prevInner };
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
      trainerFrequency,
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

    // One channel per event: the queue strip when it is on (it already flashes), else the floating
    // popup, else a toast. A shiny always gets the popup as well — it should feel special.
    const settingOn = async (id: string) => {
      try {
        return (await plugin.settings.getSetting<boolean>(id)) !== false;
      } catch {
        return true;
      }
    };
    const stripOn = await settingOn('pokerem.feature.queueStrip');
    const popupOn = await settingOn('pokerem.feature.encounterFloatingPopup');

    if (next.currentTrainerBattle && !prev.currentTrainerBattle && !stripOn) {
      const t = next.currentTrainerBattle.trainer;
      const eliteTag = next.currentTrainerBattle.tier === 'elite' ? '⚔︎ Elite Trainer ' : 'Trainer ';
      await plugin.app.toast(
        `${eliteTag}${t.className}${t.displayName ? ' ' + t.displayName : ''} challenges you!`,
      );
    }
    if (next.currentEncounter && !prev.currentEncounter) {
      const enc = next.currentEncounter;
      const showPopup = popupOn && (!stripOn || enc.shiny === true);
      if (showPopup) {
        // Floating encounter popup near the queue answer button (puppy pattern), with battle buttons.
        setTimeout(async () => {
          try {
            await (plugin as any).window.openFloatingWidget(
              'pokerem_encounter_popup',
              { top: -120, left: 0 },
              'rn-queue__show-answer-btn',
            );
          } catch {
            /* FloatingWidget may not be supported */
          }
        }, 100);
      } else if (!stripOn) {
        const tierLabel = enc.tier && enc.tier !== 'Common' ? ` (${enc.tier})` : '';
        await plugin.app.toast(enc.shiny ? `✦ A shiny ${enc.name} appeared!` : `Wild ${enc.name}${tierLabel} appeared!`);
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
