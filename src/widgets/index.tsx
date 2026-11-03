import {
  AppEvents,
  declareIndexPlugin,
  type EventCallbackFn,
  type ReactRNPlugin,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import { STORAGE_KEY } from '../game/constants';
import { runSingleReview } from '../game/pipeline';
import { runQueueAction, type QueueAction } from '../game/queueActions';
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
 * and queue menu entries that run wild-battle actions here in the host (see queueActions.ts).
 *
 * SDK version policy: pinned to 0.0.14 to match RemNote's embedded plugin runtime.
 */

let queueReviewChain: Promise<void> = Promise.resolve();
let queueListener: EventCallbackFn | undefined;

/** Run a wild-battle command here in the plugin host, so it works whether or not the sidebar is open. */
async function queueCommand(plugin: ReactRNPlugin, action: QueueAction) {
  try {
    const next = await runQueueAction(plugin, action);
    if (!next) await plugin.app.toast('No wild Pokémon to battle right now.');
  } catch (e) {
    console.error('[PokéRem] Queue command failed', e);
  }
}

/** One setup step; a failure is logged and the rest of activation carries on. */
async function safely(label: string, step: () => Promise<unknown>) {
  try {
    await step();
  } catch (e) {
    console.error(`[${BRAND.wordmark}] Setup step failed: ${label}`, e);
  }
}

const WELCOMED_KEY = 'pokerem.welcomed';

/** On a brand-new install, open the sidebar once and say where it lives. */
async function welcomeOnFirstRun(plugin: ReactRNPlugin) {
  if (await plugin.storage.getSynced(WELCOMED_KEY)) return;
  await plugin.storage.setSynced(WELCOMED_KEY, POKEREM_VERSION);
  // Players who already have a save know where PokéRem is.
  if (await plugin.storage.getSynced(STORAGE_KEY)) return;
  await openSidebar(plugin);
  await plugin.app.toast(
    `${BRAND.wordmark} is ready: find the Poké Ball tab in the right sidebar.`
  );
}

async function openSidebar(plugin: ReactRNPlugin) {
  await plugin.window.openWidgetInRightSidebar('pokerem_sidebar');
}

async function onActivate(plugin: ReactRNPlugin) {
  neutralizeBrokenRegisterCSS(plugin);

  // Widgets first: if a later setup step fails on this RemNote version, the Poké Ball tab still appears.
  // Right-sidebar tab: same red ball as bag/shop (`public/assets/items/poke-ball.png`). Plugin list icon = `public/logo.png` + `logo.svg` at bundle root (not used here).
  const pluginBase = (plugin.rootURL ?? '').replace(/\/?$/, '/');
  const sidebarTabIconUrl = `${pluginBase}assets/items/poke-ball.png?v=${encodeURIComponent(POKEREM_VERSION)}`;

  try {
    await plugin.app.registerWidget('pokerem_sidebar', WidgetLocation.RightSidebar, {
      dimensions: { height: 'auto', width: '100%' },
      widgetTabTitle: BRAND.wordmark,
      widgetTabIcon: sidebarTabIconUrl,
      dontOpenByDefaultInTabLocation: false,
    });
  } catch (e) {
    console.error(`[${BRAND.wordmark}] Could not register the sidebar`, e);
  }

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

  await safely('first-run welcome', () => welcomeOnFirstRun(plugin));

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

  await safely('registerCommand', () =>
    plugin.app.registerCommand({
      id: 'pokerem.open',
      name: `Open ${BRAND.wordmark}`,
      description: 'Show the PokéRem sidebar (the Poké Ball tab on the right).',
      action: async () => {
        await openSidebar(plugin);
      },
    })
  );
  await safely('registerCommand', () =>
    plugin.app.registerCommand({
      id: 'pokerem.catch',
      name: brandCommandCaps('Catch'),
      description:
        'Wild encounter: throw a ball. Use from the command palette or queue menu without focusing the PokéRem sidebar. Requires an active encounter.',
      action: async () => {
        await queueCommand(plugin, 'catch');
      },
    })
  );
  await safely('registerCommand', () =>
    plugin.app.registerCommand({
      id: 'pokerem.defeat',
      name: brandCommandCaps('Fight'),
      description:
        'Wild encounter: use your lead’s first damaging move. Open the sidebar to choose other moves. Works from the palette without iframe focus.',
      action: async () => {
        await queueCommand(plugin, 'fight');
      },
    })
  );
  await safely('registerCommand', () =>
    plugin.app.registerCommand({
      id: 'pokerem.run',
      name: brandCommandCaps('Run'),
      description: 'Wild encounter: flee. Palette or queue menu; no sidebar focus required.',
      action: async () => {
        await queueCommand(plugin, 'run');
      },
    })
  );

  try {
    const appAny = plugin.app as any;
    if (typeof appAny.registerMenuItem === 'function') {
      const QueueMenu = 'QueueMenu';
      await appAny.registerMenuItem({
        id: 'pokerem.queuemenu.catch',
        name: brandCommandCaps('Catch'),
        location: QueueMenu,
        action: async () => {
          await queueCommand(plugin, 'catch');
        },
      });
      await appAny.registerMenuItem({
        id: 'pokerem.queuemenu.defeat',
        name: `${brandCommandCaps('Fight')} (first move)`,
        location: QueueMenu,
        action: async () => {
          await queueCommand(plugin, 'fight');
        },
      });
      await appAny.registerMenuItem({
        id: 'pokerem.queuemenu.run',
        name: brandCommandCaps('Run'),
        location: QueueMenu,
        action: async () => {
          await queueCommand(plugin, 'run');
        },
      });
    }
  } catch {
    // QueueMenu registration may not be available in all SDK versions
  }

  await safely('registerBooleanSetting', () =>
    plugin.settings.registerBooleanSetting({
      id: 'pokerem.autoClearLog',
      title: 'Auto-clear battle log',
      description:
        'When on, the battle log line clears each time you complete a flashcard (unless a wild encounter is active).',
      defaultValue: true,
    })
  );
  try {
    await plugin.settings.registerDropdownSetting({
      id: 'pokerem.encounterPacing',
      title: 'Extra wild slowdown',
      description:
        'Optional extra slowdown on top of Study difficulty (set in PokéRem → Menu → Settings). "Every 2 reviews" halves how often wild Pokémon appear.',
      defaultValue: 'every_review',
      options: [
        { key: '0', label: 'Every review (default)', value: 'every_review' },
        { key: '1', label: 'Every 2 reviews (slower)', value: 'every_2_reviews' },
      ],
    });
  } catch {
    /* registerDropdownSetting may be unavailable */
  }
  await safely('registerBooleanSetting', () =>
    plugin.settings.registerBooleanSetting({
      id: 'pokerem.reducedMotion',
      title: 'Reduced motion',
      description: 'Disable animations in the battle UI',
      defaultValue: false,
    })
  );

  await safely('registerBooleanSetting', () =>
    plugin.settings.registerBooleanSetting({
      id: 'pokerem.feature.queueStrip',
      title: 'Queue toolbar strip',
      description: `Show the compact ${BRAND.wordmark} status strip in the queue toolbar (when RemNote mounts it).`,
      defaultValue: true,
    })
  );
  await safely('registerBooleanSetting', () =>
    plugin.settings.registerBooleanSetting({
      id: 'pokerem.feature.encounterFloatingPopup',
      title: 'Floating encounter popup',
      description:
        'Show a popup with Catch / Fight / Auto / Run near the queue when a wild Pokémon appears and the queue strip is off. Shinies always get one.',
      defaultValue: true,
    })
  );
  await safely('registerBooleanSetting', () =>
    plugin.settings.registerBooleanSetting({
      id: 'pokerem.ui.showDailyHeaderStats',
      title: 'Daily stats in battle header',
      description:
        'Show today’s reviews / encounters / catches in the battle header when space allows.',
      defaultValue: true,
    })
  );

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

  // Encounter frequency and review intensity used to be RemNote settings here. The in-game Study
  // difficulty replaced both: it is chosen before play starts and always takes precedence.

  try {
    await plugin.settings.registerDropdownSetting({
      id: 'pokerem.trainerBattleFrequency',
      title: 'Trainer battle frequency',
      description:
        'How often a wild encounter is replaced with a trainer mini-boss battle. Trainer battles use 3 of your party Pokémon (locked in — no switching, healing, or items mid-battle). Winning grants rewards and a chance to catch one of the trainer\u2019s Pokémon.',
      defaultValue: 'normal',
      options: [
        { key: '0', label: 'Off', value: 'off' },
        { key: '1', label: 'Rare (every 100 cards)', value: 'rare' },
        { key: '2', label: 'Normal (every 50 cards) — default', value: 'normal' },
        { key: '3', label: 'Frequent (every 25 cards)', value: 'frequent' },
      ],
    });
  } catch {
    // registerDropdownSetting may not be available in SDK 0.0.14
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
