import { useEffect, useRef, useState } from 'react';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { STORAGE_KEY } from '../../game/constants';
import { downloadPokeRemSaveBackup } from '../../game/exportSave';
import { resetPokeRemGameSave } from '../../game/resetSave';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { BRAND, brandCommandCaps } from '../theme/gameTheme';
import { POKEREM_VERSION } from '../../releaseMeta';
import {
  STUDY_PRESET_DEFAULTS,
  STUDY_PRESET_LABEL,
  type StudyDifficultyPreset,
} from '../../game/engine/studyDifficulty';

interface SettingsState {
  autoClearLog: boolean;
  reducedMotion: boolean;
  encounterPacing: string;
  reviewProgress: string;
  featureQueueStrip: boolean;
  featureEncounterFloatingPopup: boolean;
  showDailyHeaderStats: boolean;
}

const REMNOTE_SETTINGS_PATH = `RemNote Settings → Plugins → ${BRAND.wordmark}`;

export function SettingsScreen({
  plugin,
  onAfterGameReset,
  studyProfile,
  onConfigureStudy,
}: {
  plugin: RNPlugin;
  /** Sidebar refreshes local React state and usually closes settings after a full reset. */
  onAfterGameReset?: () => void | Promise<void>;
  studyProfile?: {
    configured: boolean;
    preset: StudyDifficultyPreset;
    reviews: number;
    weight: number;
  };
  onConfigureStudy?: (preset: StudyDifficultyPreset, custom?: { reviews: number; weight: number }) => void;
}) {
  const [settings, setSettings] = useState<SettingsState>({
    autoClearLog: true,
    reducedMotion: false,
    encounterPacing: 'every_review',
    reviewProgress: 'full',
    featureQueueStrip: true,
    featureEncounterFloatingPopup: true,
    showDailyHeaderStats: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const resetDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const [acl, rm, ep, rq, fq, ff, dh] = await Promise.all([
        plugin.settings.getSetting<boolean>('pokerem.autoClearLog'),
        plugin.settings.getSetting<boolean>('pokerem.reducedMotion'),
        plugin.settings.getSetting<string>('pokerem.encounterPacing'),
        plugin.settings.getSetting<string>('pokerem.reviewProgress'),
        plugin.settings.getSetting<boolean>('pokerem.feature.queueStrip'),
        plugin.settings.getSetting<boolean>('pokerem.feature.encounterFloatingPopup'),
        plugin.settings.getSetting<boolean>('pokerem.ui.showDailyHeaderStats'),
      ]);
      setSettings({
        autoClearLog: acl ?? true,
        reducedMotion: rm ?? false,
        encounterPacing: ep || 'every_review',
        reviewProgress: rq || 'full',
        featureQueueStrip: fq !== false,
        featureEncounterFloatingPopup: ff !== false,
        showDailyHeaderStats: dh !== false,
      });
      setLoaded(true);
    })();
  }, [plugin]);

  useEffect(() => {
    if (!resetModalOpen) return;
    const t = window.setTimeout(() => resetDialogRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !resetBusy) {
        setResetModalOpen(false);
        setResetAcknowledged(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [resetModalOpen, resetBusy]);

  if (!loaded) {
    return (
      <Panel title="Settings" icon={<GameIcon name="gear" size={14} />}>
        <p className="text-xs font-semibold" style={{ color: '#64748b' }}>
          Loading…
        </p>
      </Panel>
    );
  }

  const pacingLabel =
    settings.encounterPacing === 'every_2_reviews' ? 'Every 2 reviews' : 'Every review';
  const rewardLabel =
    settings.reviewProgress === 'half' ? '50%' : settings.reviewProgress === 'light' ? '75%' : '100%';

  const battleActions = [
    {
      action: 'Catch',
      icon: 'pokeball' as const,
      cmd: brandCommandCaps('Catch'),
      line: 'Throw a ball',
    },
    {
      action: 'Fight',
      icon: 'swords' as const,
      cmd: brandCommandCaps('Fight'),
      line: 'First damaging move (open the sidebar for the full move list)',
    },
    {
      action: 'Run',
      icon: 'flee' as const,
      cmd: brandCommandCaps('Run'),
      line: 'Flee the encounter',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="pkr-settings-hero">
        <div className="pkr-pixel-title text-[6px] font-black uppercase tracking-widest" style={{ color: 'var(--pkr-accent, #fbbf24)' }}>
          Configuration
        </div>
        <h1 className="mt-1 text-sm font-black tracking-tight" style={{ color: '#f8fafc' }}>
          Settings
        </h1>
        <p className="mt-1 max-w-xl text-[10px] font-semibold leading-relaxed" style={{ color: '#94a3b8' }}>
          Control how {BRAND.wordmark} reacts while you review. Most options are edited in RemNote&apos;s plugin settings; this screen shows
          current values and explains how things fit together.
        </p>
        <div className="pkr-settings-path-hint mt-2">
          <span className="pkr-settings-path-hint__label">Edit all toggles</span>
          <code className="pkr-settings-path-hint__code">{REMNOTE_SETTINGS_PATH}</code>
        </div>
      </div>

      <Panel title="Recommended workflow" icon={<GameIcon name="book" size={14} />}>
        <ol className="pkr-settings-workflow-list space-y-2 text-[10px] font-semibold leading-snug" style={{ color: '#cbd5e1' }}>
          <li>
            <span className="font-black text-amber-200">1.</span> Open the <strong style={{ color: '#e2e8f0' }}>{BRAND.wordmark}</strong>{' '}
            sidebar tab while studying (or use the queue strip if your layout shows it).
          </li>
          <li>
            <span className="font-black text-amber-200">2.</span> Review flashcards as usual — coins, trainer XP, wild progress, and (when you
            hit milestones) claim achievement rewards on the Progress tab (see Behavior below).
          </li>
          <li>
            <span className="font-black text-amber-200">3.</span> When a wild appears, use the <strong style={{ color: '#e2e8f0' }}>Catch</strong>,{' '}
            <strong style={{ color: '#e2e8f0' }}>Fight</strong>, and <strong style={{ color: '#e2e8f0' }}>Run</strong> buttons in the sidebar (or
            the queue strip when it&apos;s visible).
          </li>
          <li>
            <span className="font-black text-amber-200">4.</span> From anywhere in the queue, you can also run{' '}
            <strong style={{ color: '#fde68a' }}>RemNote commands</strong> ({brandCommandCaps('Catch')} / {brandCommandCaps('Fight')} /{' '}
            {brandCommandCaps('Run')}) or use the queue menu — no need to focus the plugin first.
          </li>
        </ol>
      </Panel>

      <Panel title="Battle controls" icon={<GameIcon name="gear" size={14} />}>
        <p className="mb-3 text-[10px] font-semibold leading-relaxed" style={{ color: '#94a3b8' }}>
          Wild encounters are meant to be handled with <strong style={{ color: '#e2e8f0' }}>on-screen buttons</strong> in the sidebar (and the
          queue strip when RemNote shows it), plus <strong style={{ color: '#e2e8f0' }}>RemNote commands</strong> and the review{' '}
          <strong style={{ color: '#e2e8f0' }}>queue menu</strong> when you want the same actions without clicking the plugin.
        </p>

        <div className="pkr-settings-keymap">
          {battleActions.map((row) => (
            <div key={row.action} className="pkr-settings-keymap__card">
              <div className="pkr-settings-keymap__icon">
                <GameIcon name={row.icon} size={18} style={{ color: row.action === 'Catch' ? '#451a03' : row.action === 'Fight' ? '#fff' : '#042f2e' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-black" style={{ color: '#f1f5f9' }}>
                  {row.action}
                </div>
                <div className="text-[8px] font-semibold leading-tight" style={{ color: '#64748b' }}>
                  {row.line}
                </div>
                <div className="mt-1.5 text-[8px] font-bold" style={{ color: '#a5b4fc' }}>
                  Command palette: <span style={{ color: '#e0e7ff' }}>{row.cmd}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[9px] leading-relaxed" style={{ color: '#64748b' }}>
          Feature toggles and study pacing live in <strong style={{ color: '#94a3b8' }}>{REMNOTE_SETTINGS_PATH}</strong>.
        </p>
      </Panel>

      <Panel title="Behavior" icon={<GameIcon name="shield" size={14} />}>
        <div className="space-y-2">
          <StatChip label="Auto-clear battle log" value={settings.autoClearLog ? 'On' : 'Off'} on={settings.autoClearLog} />
          <p className="text-[9px] leading-snug" style={{ color: '#64748b' }}>
            Clears the battle log after each completed card when no encounter is active (matches plugin setting).
          </p>
          <StatChip label="Wild encounter pacing" value={pacingLabel} variant="info" />
          <StatChip label="Review rewards intensity" value={rewardLabel} variant="info" />
          <p className="text-[9px] leading-snug" style={{ color: '#64748b' }}>
            Scales Pokécoins, trainer XP, and (on pacing ticks) progress toward wild Pokémon. RemNote does not expose per-card grades to
            plugins yet — this knob stands in for study intensity.
          </p>
          <StatChip label="Reduced motion" value={settings.reducedMotion ? 'On' : 'Off'} on={settings.reducedMotion} />
        </div>
        <p className="mt-2 text-[9px]" style={{ color: '#64748b' }}>
          Change in <strong style={{ color: '#94a3b8' }}>{REMNOTE_SETTINGS_PATH}</strong>.
        </p>
      </Panel>

      {studyProfile && onConfigureStudy ? (
        <Panel title="Study difficulty" icon={<GameIcon name="book" size={14} style={{ color: '#fde68a' }} />}>
          <p className="mb-2 text-[10px] font-semibold leading-relaxed" style={{ color: '#cbd5e1' }}>
            When configured here, your save uses these values for <strong style={{ color: '#e2e8f0' }}>reviews per wild</strong> and{' '}
            <strong style={{ color: '#e2e8f0' }}>card XP intensity</strong> instead of RemNote&apos;s encounter rate / review intensity
            plugin settings. This matches the first-run picker and stays synced with your KB.
          </p>
          <div className="mb-2 rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-[9px] font-bold" style={{ color: '#94a3b8' }}>
            Current:{' '}
            <span className="text-amber-200">
              {studyProfile.configured
                ? studyProfile.preset === 'custom'
                  ? 'Custom'
                  : STUDY_PRESET_LABEL[studyProfile.preset as 'easy' | 'medium' | 'hard']
                : 'Not set (plugin defaults)'}
            </span>
            {studyProfile.configured ? (
              <>
                {' '}
                · <span className="text-slate-300">{studyProfile.reviews}</span> reviews / wild ·{' '}
                <span className="text-slate-300">{Math.round(studyProfile.weight * 100)}%</span> card scaling
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['easy', 'medium', 'hard'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                className="rounded-lg border-2 px-2.5 py-1.5 text-[9px] font-black uppercase"
                style={{
                  borderColor: 'rgba(251,191,36,0.4)',
                  background: 'rgba(251,191,36,0.08)',
                  color: '#fde68a',
                }}
                onClick={() => onConfigureStudy(preset)}
              >
                {STUDY_PRESET_LABEL[preset]}
              </button>
            ))}
          </div>
          <p className="mb-1 mt-3 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
            Custom
          </p>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const r = parseInt(String(fd.get('reviews') ?? '3'), 10);
              const w = parseFloat(String(fd.get('weight') ?? '1'));
              const reviews = Number.isFinite(r) ? Math.max(2, Math.min(15, r)) : 3;
              const weight = Number.isFinite(w) ? Math.max(0.5, Math.min(1.5, w)) : 1;
              onConfigureStudy('custom', { reviews, weight });
            }}
          >
            <label className="flex flex-col text-[8px] font-bold" style={{ color: '#64748b' }}>
              Reviews / wild
              <input
                name="reviews"
                type="number"
                min={2}
                max={15}
                defaultValue={studyProfile.reviews || STUDY_PRESET_DEFAULTS.medium.reviews}
                className="mt-0.5 w-20 rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] font-bold text-slate-100"
              />
            </label>
            <label className="flex flex-col text-[8px] font-bold" style={{ color: '#64748b' }}>
              Card XP (0.5–1.5)
              <input
                name="weight"
                type="number"
                min={0.5}
                max={1.5}
                step={0.05}
                defaultValue={studyProfile.weight || 1}
                className="mt-0.5 w-20 rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] font-bold text-slate-100"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg border-2 px-2.5 py-1.5 text-[9px] font-black uppercase"
              style={{
                borderColor: 'rgba(167,139,250,0.5)',
                background: 'rgba(109,40,217,0.25)',
                color: '#e9d5ff',
              }}
            >
              Apply custom
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel title="Customize" icon={<GameIcon name="diamond" size={14} />}>
        <p className="mb-2 text-[9px] leading-snug" style={{ color: '#64748b' }}>
          Feature toggles are read from RemNote. Some changes may need a plugin reload depending on your app version.
        </p>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
          Queue
        </p>
        <BoolRow label="Queue toolbar strip" on={settings.featureQueueStrip} />
        <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
          Popups
        </p>
        <BoolRow label="Floating encounter popup" on={settings.featureEncounterFloatingPopup} />
        <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
          Appearance
        </p>
        <BoolRow label="Daily stats in battle header" on={settings.showDailyHeaderStats} />
        <p className="mt-2 text-[9px]" style={{ color: '#64748b' }}>
          Edit in <strong style={{ color: '#94a3b8' }}>{REMNOTE_SETTINGS_PATH}</strong>.
        </p>
      </Panel>

      <details className="pkr-settings-troubleshoot group rounded-lg border-2 border-white/10 bg-black/20">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-black uppercase tracking-wide outline-none transition-colors group-open:border-b group-open:border-white/10" style={{ color: '#94a3b8' }}>
          <span className="inline-flex items-center gap-2">
            <GameIcon name="gear" size={12} />
            Troubleshooting & help
            <span className="text-[9px] font-bold normal-case opacity-70">(tap to expand)</span>
          </span>
        </summary>
        <div className="space-y-3 px-3 pb-3 pt-1 text-[10px] font-semibold leading-relaxed" style={{ color: '#cbd5e1' }}>
          <section>
            <h3 className="mb-1 text-[9px] font-black uppercase tracking-wide" style={{ color: '#fde68a' }}>
              Battle actions from the palette
            </h3>
            <ul className="list-disc space-y-1 pl-4" style={{ color: '#94a3b8' }}>
              <li>
                Open the command palette and run <strong style={{ color: '#e2e8f0' }}>{brandCommandCaps('Catch')}</strong>,{' '}
                <strong style={{ color: '#e2e8f0' }}>{brandCommandCaps('Fight')}</strong>, or{' '}
                <strong style={{ color: '#e2e8f0' }}>{brandCommandCaps('Run')}</strong> — they work even when the card editor has focus.
              </li>
              <li>Or use the review queue menu entries with the same names when a wild encounter is active.</li>
              <li>You can always use the Catch / Fight / Run buttons in the {BRAND.wordmark} sidebar.</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-[9px] font-black uppercase tracking-wide" style={{ color: '#fde68a' }}>
              Save, sync, and odd states
            </h3>
            <ul className="list-disc space-y-1 pl-4" style={{ color: '#94a3b8' }}>
              <li>
                Party Pokémon art loads from the network when online. Offline or blocked CDNs may show placeholders — gameplay still runs;
                see credits in <strong style={{ color: '#e2e8f0' }}>ATTRIBUTION.md</strong> in the repo.
              </li>
              <li>
                RemNote may take a moment to sync plugin storage across devices. If two clients edit at once, the last write wins — avoid
                split-brain play on the same KB.
              </li>
              <li>
                If storage is empty or unreadable, {BRAND.wordmark} starts a fresh game. Use <strong style={{ color: '#e2e8f0' }}>Export save</strong>{' '}
                before experiments so you can compare or restore manually if needed.
              </li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-[9px] font-black uppercase tracking-wide" style={{ color: '#fde68a' }}>
              Platform notes
            </h3>
            <p style={{ color: '#94a3b8' }}>
              Browser embedding and RemNote updates can change layout, focus, and which widgets mount (e.g. queue strip). The sidebar tab is
              the most reliable surface; we don&apos;t guarantee identical behavior on every OS and app version.
            </p>
          </section>
        </div>
      </details>

      <Panel title="Your data & backup" icon={<GameIcon name="box" size={14} />}>
        <p className="mb-2 text-[10px] font-semibold leading-relaxed" style={{ color: '#cbd5e1' }}>
          Your {BRAND.wordmark} progress is stored in RemNote&apos;s <strong style={{ color: '#e2e8f0' }}>synced plugin storage</strong> under
          the key <code className="rounded bg-black/35 px-1 py-px text-[9px]" style={{ color: '#a5b4fc' }}>{STORAGE_KEY}</code>. If your
          knowledge base syncs to RemNote Cloud, that data is included in your usual backup story — check your RemNote account / export habits
          for the full picture.
        </p>
        <p className="mb-3 text-[9px] font-semibold leading-snug" style={{ color: '#64748b' }}>
          The button below downloads a JSON snapshot you can keep on disk. It does not replace RemNote sync; it&apos;s an extra safety copy and
          a way to inspect or archive your save.
        </p>
        <button
          type="button"
          disabled={exportBusy}
          className="pkr-btn-secondary w-full px-3 py-2 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setExportBusy(true);
            void (async () => {
              try {
                await downloadPokeRemSaveBackup(plugin);
              } catch (e) {
                console.error(`[${BRAND.wordmark}] export failed`, e);
              } finally {
                setExportBusy(false);
              }
            })();
          }}
        >
          {exportBusy ? 'Preparing download…' : 'Export save as JSON'}
        </button>
      </Panel>

      <Panel title="Restart progress" icon={<GameIcon name="flame" size={14} style={{ color: '#fca5a5' }} />}>
        <p className="mb-2 text-[10px] font-semibold leading-relaxed" style={{ color: '#cbd5e1' }}>
          Start completely over in <strong style={{ color: '#e2e8f0' }}>this knowledge base</strong>: your party, bag, Pokédex counts,
          Pokécoins, trainer XP, claimed rewards, achievements, streaks, and any active wild encounter are cleared from synced storage.
        </p>
        <p className="mb-3 text-[9px] font-semibold leading-snug" style={{ color: '#64748b' }}>
          Export a JSON backup above first if you might want this data later. Plugin preferences (pacing, toggles) are{' '}
          <strong style={{ color: '#94a3b8' }}>not</strong> reset.
        </p>
        <button
          type="button"
          disabled={resetBusy}
          className="pkr-btn-destructive w-full px-3 py-2 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setResetAcknowledged(false);
            setResetModalOpen(true);
          }}
        >
          Restart all progress…
        </button>
      </Panel>

      {resetModalOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center p-2 sm:items-center"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          role="presentation"
          onClick={() => {
            if (!resetBusy) {
              setResetModalOpen(false);
              setResetAcknowledged(false);
            }
          }}
        >
          <div
            ref={resetDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkr-reset-title"
            tabIndex={-1}
            className="pkr-battle-hud w-full max-w-sm rounded-lg border-2 p-4 shadow-xl outline-none"
            style={{
              borderColor: 'rgba(248,113,113,0.5)',
              background: 'linear-gradient(180deg, rgba(69,10,10,0.96) 0%, rgba(15,23,42,0.98) 100%)',
              boxShadow: '0 0 28px rgba(220,38,38,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              id="pkr-reset-title"
              className="pkr-pixel-title text-[8px] font-black uppercase leading-snug"
              style={{ color: '#fecaca' }}
            >
              Erase all {BRAND.wordmark} data?
            </div>
            <p className="mt-2 text-[10px] font-semibold leading-snug" style={{ color: '#e2e8f0' }}>
              This removes your save from RemNote&apos;s synced plugin storage for this KB. You will pick a starter again.{' '}
              <strong style={{ color: '#fde68a' }}>This cannot be undone</strong> unless you kept a backup.
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
              <li>Party, storage, and nicknames</li>
              <li>Bag, shop purchases history counters, coins</li>
              <li>Dex, trainer rank / XP, daily recap stats</li>
              <li>Achievements and any active wild encounter</li>
            </ul>
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-white/10 bg-black/25 px-2.5 py-2">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 accent-red-500"
                checked={resetAcknowledged}
                disabled={resetBusy}
                onChange={(e) => setResetAcknowledged(e.target.checked)}
              />
              <span className="text-[9px] font-semibold leading-snug" style={{ color: '#e2e8f0' }}>
                I understand my game data in this knowledge base will be permanently deleted.
              </span>
            </label>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:flex-row-reverse sm:flex-wrap sm:justify-start sm:gap-2">
              <button
                type="button"
                disabled={resetBusy || !resetAcknowledged}
                className="pkr-btn-destructive w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  setResetBusy(true);
                  void (async () => {
                    try {
                      await resetPokeRemGameSave(plugin);
                      try {
                        await plugin.app.toast(`${BRAND.wordmark} progress restarted — choose a starter.`);
                      } catch {
                        /* host may not support toast */
                      }
                      await onAfterGameReset?.();
                    } catch (e) {
                      console.error(`[${BRAND.wordmark}] reset failed`, e);
                      try {
                        await plugin.app.toast(`${BRAND.wordmark} could not reset. Try again.`);
                      } catch {
                        /* unknown host */
                      }
                    } finally {
                      setResetBusy(false);
                      setResetModalOpen(false);
                      setResetAcknowledged(false);
                    }
                  })();
                }}
              >
                {resetBusy ? 'Resetting…' : 'Erase & restart'}
              </button>
              <button
                type="button"
                disabled={resetBusy}
                className="pkr-btn-secondary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetAcknowledged(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Panel title="About" icon={<GameIcon name="pokeball" size={14} />}>
        <div className="space-y-1.5 text-[10px] font-semibold" style={{ color: '#94a3b8' }}>
          <p>
            <strong style={{ color: '#e2e8f0' }}>{BRAND.wordmark}</strong> v{POKEREM_VERSION}
          </p>
          <p>Pokémon study companion for RemNote.</p>
          <p>Sprites via PokéAPI / project assets.</p>
        </div>
      </Panel>
    </div>
  );
}

function StatChip({
  label,
  value,
  on,
  variant,
}: {
  label: string;
  value: string;
  on?: boolean;
  variant?: 'info';
}) {
  const isInfo = variant === 'info';
  return (
    <div className="flex items-center justify-between rounded-md border border-white/5 px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
      <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>
        {label}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
        style={
          isInfo
            ? { background: 'rgba(30,58,138,0.35)', color: '#93c5fd' }
            : on
              ? { background: 'rgba(6,78,59,0.4)', color: '#6ee7b7' }
              : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }
        }
      >
        {value}
      </span>
    </div>
  );
}

function BoolRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/5 px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.12)' }}>
      <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>
        {label}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
        style={
          on ? { background: 'rgba(6,78,59,0.4)', color: '#6ee7b7' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }
        }
      >
        {on ? 'On' : 'Off'}
      </span>
    </div>
  );
}
