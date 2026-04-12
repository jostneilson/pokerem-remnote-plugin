import '../style.css';
import { useCallback, useEffect, useState } from 'react';
import { AppEvents, renderWidget, useAPIEventListener, useOnMessageBroadcast, usePlugin } from '@remnote/plugin-sdk';
import { STORAGE_KEY, SYNC_BROADCAST_KEY, REVIEWS_PER_ENCOUNTER, getSyncedGameRaw } from '../game/constants';
import { createInitialStateV3, parseGameState, activePokemon } from '../game/state/store';
import type { PokeRemGameState } from '../game/state/model';
import { frontSpriteUrl, backSpriteUrl } from '../game/sprites';
import { battleAmbienceCssVars, getBattleAmbience } from '../game/engine/battleAmbience';
import { GameIcon } from '../ui/components/GameIcon';
import { neutralizeBrokenRegisterCSS } from '../neutralizeRemNoteCssApi';
import { BRAND } from '../ui/theme/gameTheme';
import { PokeRemSatelliteMiniCard } from '../ui/components/PokeRemSatelliteChrome';
import { PokeRemTrekStrip } from '../ui/components/PokeRemTrekStrip';
import { estimatedQueueCompletionsUntilWild } from '../game/wildEncounterDisplay';

/**
 * Compact queue toolbar strip — same HUD kit as the sidebar when RemNote mounts the queue toolbar.
 */
function PokeRemQueueStrip() {
  const plugin = usePlugin();
  neutralizeBrokenRegisterCSS(plugin);

  const [state, setState] = useState<PokeRemGameState | null>(null);
  const [queueStripOn, setQueueStripOn] = useState(true);
  const [encounterRate, setEncounterRate] = useState(REVIEWS_PER_ENCOUNTER);
  const [encounterPacingModulo, setEncounterPacingModulo] = useState(1);
  const [pluginReviewWeight, setPluginReviewWeight] = useState(1);

  useEffect(() => {
    void (async () => {
      try {
        const v = await plugin.settings.getSetting<boolean>('pokerem.feature.queueStrip');
        setQueueStripOn(v !== false);
      } catch {
        setQueueStripOn(true);
      }
    })();
  }, [plugin]);

  useEffect(() => {
    void (async () => {
      try {
        const rate = await plugin.settings.getSetting('pokerem.encounterRate');
        if (typeof rate === 'string') {
          const parsed = parseInt(rate, 10);
          if (!isNaN(parsed) && parsed >= 1) setEncounterRate(parsed);
        }
      } catch {
        /* default */
      }
    })();
  }, [plugin]);

  useEffect(() => {
    void (async () => {
      try {
        const pace = await plugin.settings.getSetting<string>('pokerem.encounterPacing');
        setEncounterPacingModulo(pace === 'every_2_reviews' ? 2 : 1);
      } catch {
        setEncounterPacingModulo(1);
      }
    })();
  }, [plugin]);

  useEffect(() => {
    void (async () => {
      try {
        const rq = await plugin.settings.getSetting<string>('pokerem.reviewProgress');
        if (rq === 'light') setPluginReviewWeight(0.75);
        else if (rq === 'half') setPluginReviewWeight(0.5);
        else setPluginReviewWeight(1);
      } catch {
        setPluginReviewWeight(1);
      }
    })();
  }, [plugin]);

  const refresh = useCallback(async () => {
    try {
      const raw = await getSyncedGameRaw(plugin);
      setState(parseGameState(raw));
    } catch (e) {
      console.error(`[${BRAND.wordmark}] Queue toolbar: failed to load synced game state`, e);
      setState(createInitialStateV3());
    }
  }, [plugin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useAPIEventListener(AppEvents.StorageSyncedChange, STORAGE_KEY, () => {
    void refresh();
  });
  const bumpRefreshAfterQueueCard = useCallback(() => {
    void refresh();
    window.setTimeout(() => void refresh(), 48);
    window.setTimeout(() => void refresh(), 160);
    window.setTimeout(() => void refresh(), 420);
  }, [refresh]);
  useAPIEventListener(AppEvents.QueueCompleteCard, undefined, bumpRefreshAfterQueueCard);
  useOnMessageBroadcast(SYNC_BROADCAST_KEY, () => {
    void refresh();
  });

  if (!queueStripOn) return null;

  if (!state || !state.starterChosen || !state.studyDifficultyConfigured) return null;

  const active = activePokemon(state);
  if (!active) return null;

  const hasEncounter = !!state.currentEncounter;
  const wild = state.currentEncounter;
  const progress = state.encounterProgress;
  const effectiveRate = state.studyDifficultyConfigured ? state.studyReviewsPerEncounter : encounterRate;
  const wildReviewWeight = state.studyDifficultyConfigured ? state.studyCardWeight : pluginReviewWeight;
  const amb = getBattleAmbience(state.battleSceneIndex ?? 0);
  const ambienceStyle = battleAmbienceCssVars(amb);
  const leadFaintedNoEncounter = !hasEncounter && active.currentHp <= 0;

  const remaining =
    !hasEncounter && !leadFaintedNoEncounter
      ? estimatedQueueCompletionsUntilWild({
          encounterProgress: progress,
          effectiveRate,
          wildReviewAccum: state.wildReviewAccum ?? 0,
          reviewWeight: wildReviewWeight,
          encounterPacingModulo,
          cardsReviewed: state.cardsReviewed,
        })
      : 0;
  const trekTitle = leadFaintedNoEncounter
    ? 'Your lead has fainted; wild encounters are paused.'
    : `About ${remaining} queue completions until the next wild (${progress} of ${effectiveRate} toward encounter)`;

  return (
    <div
      className={`pkr-pixel-surface pkr-queue-shell relative flex w-full min-w-0 flex-wrap items-stretch gap-1.5 border px-2 py-1.5 text-[7px] sm:text-[9px] ${
        hasEncounter ? 'animate-pkr-queue-wild' : ''
      }`}
      style={{
        ...ambienceStyle,
        borderColor: `${amb.accent}44`,
        background: 'var(--pkr-header-bar-gradient, linear-gradient(90deg, #15803d 0%, #052e16 50%, #166534 100%))',
        color: amb.pillActiveText,
        filter: 'saturate(1.05) contrast(1.03)',
      }}
    >
      <div className="relative z-[3] flex w-full min-w-0 flex-wrap items-stretch gap-1.5">
        <PokeRemSatelliteMiniCard
          accentBorder={`${amb.accent}40`}
          className="flex min-w-0 flex-[1_1_auto] items-center gap-1.5 sm:flex-none"
        >
          <span className="flex shrink-0 items-center gap-1">
            <GameIcon name="pokeball" size={12} />
            <span className="pkr-pixel-title text-[6px] font-black tracking-tight sm:text-[7px]" style={{ color: amb.pillActiveText }}>
              {BRAND.wordmark}
            </span>
          </span>
          <div className="flex min-w-0 items-center gap-1 border-l border-white/10 pl-1.5">
            <img
              src={backSpriteUrl(plugin.rootURL, active.dexNum)}
              alt=""
              width={22}
              height={22}
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="min-w-0">
              <div className="truncate font-bold leading-tight" style={{ color: amb.pillActiveText }}>
                {active.name}
              </div>
              <div className="text-[6px] font-bold sm:text-[7px]" style={{ color: amb.accentMuted }}>
                Lv{active.level}
              </div>
            </div>
          </div>
        </PokeRemSatelliteMiniCard>

        <PokeRemSatelliteMiniCard accentBorder={`${amb.accent}40`} className="flex flex-col justify-center gap-0.5 px-1.5 py-1">
          <span className="pkr-battle-hud-role text-[5px] sm:text-[6px]" style={{ color: amb.accentMuted }}>
            Next wild
          </span>
          <PokeRemTrekStrip
            variant="compact"
            rootURL={plugin.rootURL}
            effectiveRate={effectiveRate}
            progress={progress}
            hasEncounter={hasEncounter}
            accent={amb.accent}
            title={trekTitle}
          />
        </PokeRemSatelliteMiniCard>

        <PokeRemSatelliteMiniCard
          accentBorder={hasEncounter ? 'rgba(251,191,36,0.35)' : `${amb.accent}33`}
          className="flex min-w-0 flex-[1_1_140px] items-center gap-1.5 px-1.5 py-1 sm:flex-1"
        >
          {hasEncounter && wild ? (
            <>
              <span
                className="shrink-0 rounded-full px-1.5 py-px text-[6px] font-black sm:text-[7px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(251,191,36,0.28) 0%, rgba(180,83,9,0.2) 100%)',
                  color: '#fde68a',
                  border: '1px solid rgba(251,191,36,0.4)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              >
                WILD
              </span>
              <img
                src={frontSpriteUrl(plugin.rootURL, wild.dexNum)}
                alt=""
                width={22}
                height={22}
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold leading-tight" style={{ color: '#fde68a' }}>
                  {wild.name}
                </div>
                <div className="text-[6px] font-bold sm:text-[7px]" style={{ color: amb.accentMuted }}>
                  Open sidebar to battle
                </div>
              </div>
            </>
          ) : leadFaintedNoEncounter ? (
            <div className="min-w-0 text-[6px] font-bold leading-snug sm:text-[7px]" style={{ color: '#fca5a5' }}>
              Wilds paused — heal or switch lead
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-1">
              <span className="text-[6px] font-bold sm:text-[7px]" style={{ color: amb.uiMutedHover }}>
                Wild in <strong style={{ color: amb.pillActiveText }}>{remaining}</strong> review{remaining === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </PokeRemSatelliteMiniCard>
      </div>
    </div>
  );
}

renderWidget(PokeRemQueueStrip);
