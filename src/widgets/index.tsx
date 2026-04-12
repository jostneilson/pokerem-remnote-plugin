import {
  AppEvents,
  declareIndexPlugin,
  type EventCallbackFn,
  type ReactRNPlugin,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import { runSingleReview } from '../game/pipeline';
import {
  QUEUE_COMPLETE_RECENT_SESSION_KEY,
  extractQueueCompleteDedupeKey,
  evaluateQueueCompleteDedupe,
  parseRecentQueueCompleteKeys,
} from '../game/queueCompleteDedupe';
import { extractEncounterReviewMultiplier } from '../game/queueCompletionMeta';
import { neutralizeBrokenRegisterCSS } from '../neutralizeRemNoteCssApi';
import { POKEREM_VERSION } from '../releaseMeta';
import { BRAND, brandCommandCaps } from '../ui/theme/gameTheme';
import '../style.css';
import '../index.css';

/*
 * ── Architecture ─────────────────────────────────────────────────────────────
 *
 * Primary battle surface: RightSidebar (always mounts).
 * Secondary: QueueToolbar strip and FloatingWidget popup when RemNote mounts them.
 *
 * Battle actions: on-screen buttons in the sidebar, plus RemNote command palette
 * and queue menu entries that broadcast `pokerem_cmd` to mounted widgets.
 *
 * SDK version policy: pinned to 0.0.14 to match RemNote's embedded plugin runtime.
 */

let queueReviewChain: Promise<void> = Promise.resolve();
let queueListener: EventCallbackFn | undefined;

async function onActivate(plugin: ReactRNPlugin) {
  neutralizeBrokenRegisterCSS(plugin);

  queueListener = (event: unknown) => {
    queueReviewChain = queueReviewChain.then(async () => {
      try {
        const raw = await plugin.storage.getSession(QUEUE_COMPLETE_RECENT_SESSION_KEY);
        const recent = parseRecentQueueCompleteKeys(raw);
        const key = extractQueueCompleteDedupeKey(event);
        const { shouldProcess, nextKeysIfProcessed } = evaluateQueueCompleteDedupe(recent, key);
        if (!shouldProcess) return;
        await plugin.storage.setSession(QUEUE_COMPLETE_RECENT_SESSION_KEY, nextKeysIfProcessed);
        const encounterReviewMultiplier = extractEncounterReviewMultiplier(event);
        await runSingleReview(plugin, { encounterReviewMultiplier });
      } catch (e) {
        console.error(`[${BRAND.wordmark}] QueueCompleteCard handler failed`, e);
      }
    });
  };
  plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, queueListener);

  await plugin.app.registerCommand({
    id: 'pokerem.catch',
    name: brandCommandCaps('Catch'),
    description:
      'Wild encounter: throw a ball. Use from the command palette or queue menu without focusing the PokéRem sidebar. Requires an active encounter.',
    action: async () => {
      await plugin.messaging.broadcast({ channel: 'pokerem_cmd', action: 'catch' });
    },
  });
  await plugin.app.registerCommand({
    id: 'pokerem.defeat',
    name: brandCommandCaps('Fight'),
    description:
      'Wild encounter: use your lead’s first damaging move. Open the sidebar to choose other moves. Works from the palette without iframe focus.',
    action: async () => {
      await plugin.messaging.broadcast({ channel: 'pokerem_cmd', action: 'fight_first' });
    },
  });
  await plugin.app.registerCommand({
    id: 'pokerem.run',
    name: brandCommandCaps('Run'),
    description: 'Wild encounter: flee. Palette or queue menu; no sidebar focus required.',
    action: async () => {
      await plugin.messaging.broadcast({ channel: 'pokerem_cmd', action: 'run' });
    },
  });

  try {
    const appAny = plugin.app as any;
    if (typeof appAny.registerMenuItem === 'function') {
      const QueueMenu = 'QueueMenu';
      await appAny.registerMenuItem({
        id: 'pokerem.queuemenu.catch',
        name: brandCommandCaps('Catch'),
        location: QueueMenu,
        action: async () => {
          await plugin.messaging.broadcast({ channel: 'pokerem_cmd', action: 'catch' });
        },
      });
      await appAny.registerMenuItem({
        id: 'pokerem.queuemenu.defeat',
        name: `${brandCommandCaps('Fight')} (first move)`,
        location: QueueMenu,
        action: async () => {
          await plugin.messaging.broadcast({ channel: 'pokerem_cmd', action: 'fight_first' });
        },
      });
      await appAny.registerMenuItem({
        id: 'pokerem.queuemenu.run',
        name: brandCommandCaps('Run'),
        location: QueueMenu,
        action: async () => {
          await plugin.messaging.broadcast({ channel: 'pokerem_cmd', action: 'run' });
        },
      });
    }
  } catch {
    // QueueMenu registration may not be available in all SDK versions
  }

  await plugin.settings.registerBooleanSetting({
    id: 'pokerem.autoClearLog',
    title: 'Auto-clear battle log',
    description: 'When on, the battle log line clears each time you complete a flashcard (unless a wild encounter is active).',
    defaultValue: true,
  });
  try {
    await plugin.settings.registerDropdownSetting({
      id: 'pokerem.encounterPacing',
      title: 'Wild encounter pacing',
      description:
        'How reviews count toward the next wild Pokémon. "Every review" is standard. "Every 2 reviews" slows encounters. (RemNote does not yet expose card grades to plugins; finer SRS-based pacing may be added later.)',
      defaultValue: 'every_review',
      options: [
        { key: '0', label: 'Every review (default)', value: 'every_review' },
        { key: '1', label: 'Every 2 reviews (slower)', value: 'every_2_reviews' },
      ],
    });
  } catch {
    /* registerDropdownSetting may be unavailable */
  }
  try {
    await plugin.settings.registerDropdownSetting({
      id: 'pokerem.reviewProgress',
      title: 'Review rewards & wild pacing',
      description:
        'Scales Pokécoins and trainer XP from each completed flashcard, and how fast you advance toward the next wild Pokémon. RemNote does not expose card grades (Again/Hard/Good/Easy) to plugins yet — this is a manual study-intensity knob until then.',
      defaultValue: 'full',
      options: [
        { key: '0', label: 'Standard (100%)', value: 'full' },
        { key: '1', label: 'Light (75%)', value: 'light' },
        { key: '2', label: 'Slow wilds (50%)', value: 'half' },
      ],
    });
  } catch {
    /* registerDropdownSetting may be unavailable */
  }
  await plugin.settings.registerBooleanSetting({
    id: 'pokerem.reducedMotion',
    title: 'Reduced motion',
    description: 'Disable animations in the battle UI',
    defaultValue: false,
  });

  await plugin.settings.registerBooleanSetting({
    id: 'pokerem.feature.queueStrip',
    title: 'Queue toolbar strip',
    description: `Show the compact ${BRAND.wordmark} status strip in the queue toolbar (when RemNote mounts it).`,
    defaultValue: true,
  });
  await plugin.settings.registerBooleanSetting({
    id: 'pokerem.feature.encounterFloatingPopup',
    title: 'Floating encounter popup',
    description: 'Open the small encounter popup near the queue when a wild Pokémon appears.',
    defaultValue: true,
  });
  await plugin.settings.registerBooleanSetting({
    id: 'pokerem.ui.showDailyHeaderStats',
    title: 'Daily stats in battle header',
    description: 'Show today’s reviews / encounters / catches in the battle header when space allows.',
    defaultValue: true,
  });

  try {
    await plugin.settings.registerDropdownSetting({
      id: 'pokerem.generations',
      title: 'Encounter Generations',
      description: 'Which Pokemon generations can appear in wild encounters',
      defaultValue: 'gen1',
      options: [
        { key: '0', label: 'Gen 1 only (Kanto)', value: 'gen1' },
        { key: '1', label: 'Gen 1-2 (+ Johto)', value: 'gen1-2' },
        { key: '2', label: 'Gen 1-3 (+ Hoenn)', value: 'gen1-3' },
        { key: '3', label: 'Gen 1-4 (+ Sinnoh)', value: 'gen1-4' },
        { key: '4', label: 'Gen 1-5 (+ Unova)', value: 'gen1-5' },
        { key: '5', label: 'Gen 1-6 (+ Kalos)', value: 'gen1-6' },
        { key: '6', label: 'Gen 1-7 (+ Alola)', value: 'gen1-7' },
        { key: '7', label: 'All Generations (1-8)', value: 'gen1-8' },
      ],
    });
  } catch {
    // registerDropdownSetting may not be available in SDK 0.0.14
  }

  try {
    await plugin.settings.registerDropdownSetting({
      id: 'pokerem.encounterRate',
      title: 'Encounter Frequency',
      description: 'How many reviews between wild encounters. Less frequent = slightly better rarity odds.',
      defaultValue: '3',
      options: [
        { key: '0', label: 'Every 3 reviews (default)', value: '3' },
        { key: '1', label: 'Every 5 reviews (+rarity)', value: '5' },
        { key: '2', label: 'Every 7 reviews (++rarity)', value: '7' },
        { key: '3', label: 'Every 10 reviews (rare)', value: '10' },
      ],
    });
  } catch {
    // registerDropdownSetting may not be available in SDK 0.0.14
  }

  // Right-sidebar tab: same red ball as bag/shop (`public/assets/items/poke-ball.png`). Plugin list icon = `public/logo.png` + `logo.svg` at bundle root (not used here).
  const pluginBase = (plugin.rootURL ?? '').replace(/\/?$/, '/');
  const sidebarTabIconUrl = `${pluginBase}assets/items/poke-ball.png?v=${encodeURIComponent(POKEREM_VERSION)}`;

  await plugin.app.registerWidget('pokerem_sidebar', WidgetLocation.RightSidebar, {
    dimensions: { height: 'auto', width: '100%' },
    widgetTabTitle: BRAND.wordmark,
    widgetTabIcon: sidebarTabIconUrl,
    dontOpenByDefaultInTabLocation: false,
  });

  try {
    await plugin.app.registerWidget('pokerem_queue_strip', WidgetLocation.QueueToolbar, {
      dimensions: { height: 'auto', width: '100%' },
    });
  } catch {
    // QueueToolbar may not mount on all hosts — that's fine, sidebar is primary.
  }

  try {
    await plugin.app.registerWidget('pokerem_encounter_popup', WidgetLocation.FloatingWidget, {
      dimensions: { width: 280, height: 'auto' },
    });
  } catch {
    // FloatingWidget may not be available
  }
}

async function onDeactivate(plugin: ReactRNPlugin) {
  if (queueListener) {
    plugin.event.removeListener(AppEvents.QueueCompleteCard, undefined, queueListener);
    queueListener = undefined;
  }

  try {
    await plugin.app.unregisterWidget('pokerem_sidebar', WidgetLocation.RightSidebar);
  } catch {
    /* ok */
  }
  try {
    await plugin.app.unregisterWidget('pokerem_queue_strip', WidgetLocation.QueueToolbar);
  } catch {
    /* ok */
  }
  try {
    await plugin.app.unregisterWidget('pokerem_encounter_popup', WidgetLocation.FloatingWidget);
  } catch {
    /* ok */
  }
}

declareIndexPlugin(onActivate, onDeactivate);
