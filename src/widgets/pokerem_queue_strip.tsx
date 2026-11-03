import '../style.css';
import { useCallback, useEffect, useState } from 'react';
import { AppEvents, renderWidget, useAPIEventListener, useOnMessageBroadcast, usePlugin } from '@remnote/plugin-sdk';
import { STORAGE_KEY, SYNC_BROADCAST_KEY, REVIEWS_PER_ENCOUNTER, WILD_FLEE_AFTER_CARDS, getSyncedGameRaw } from '../game/constants';
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
import { recommendedBall, wildCatchChancePreview } from '../game/engine/encounters';
import { bestPotionForLead } from '../game/state/store';
import { runQueueAction, type QueueAction } from '../game/queueActions';

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
  const [busy, setBusy] = useState<QueueAction | null>(null);

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

  const act = async (action: QueueAction) => {
    if (busy) return;
    setBusy(action);
    try {
      const next = await runQueueAction(plugin, action);
      if (next) setState(next);
    } catch (e) {
      console.error(`[${BRAND.wordmark}] Queue toolbar action failed`, e);
    } finally {
      setBusy(null);
    }
  };

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
  const leadFaintedNoEncounter = !hasEncounter && state.party.every((p) => p.currentHp <= 0);
  const inTrainerBattle = !!state.currentTrainerBattle;
  const picked = wild ? recommendedBall(state.bag, wild, active) : null;
  const ball = picked && (state.bag[picked] ?? 0) > 0 ? picked : null;
  const catchPct = wild && ball ? Math.round(wildCatchChancePreview(wild, active, ball) * 100) : 0;
  const potion = !hasEncounter && !inTrainerBattle ? bestPotionForLead(state) : null;
  const hpPct = active.maxHp > 0 ? Math.max(0, Math.min(100, (active.currentHp / active.maxHp) * 100)) : 0;

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
    ? 'Your whole team has fainted. It rests while you study, or heal it in the sidebar.'
    : `About ${remaining} queue completions until the next wild (${progress} of ${effectiveRate} toward encounter)`;

  return (
    <div
      className={`pkr-pixel-surface pkr-queue-shell relative flex w-full min-w-0 flex-wrap items-stretch gap-1.5 border px-2 py-1.5 pkr-fine ${
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
            <span className="pkr-pixel-title pkr-fine font-black tracking-tight" style={{ color: amb.pillActiveText }}>
              {BRAND.wordmark}
            </span>
          </span>
          <div className="flex min-w-0 items-center gap-1 border-l border-white/10 pl-1.5">
            <img
              src={backSpriteUrl(plugin.rootURL, active.dexNum, active.shiny === true)}
              alt=""
              width={22}
              height={22}
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="min-w-0">
              <div className="truncate font-bold leading-tight" style={{ color: amb.pillActiveText }}>
                {active.name}
              </div>
              <div className="pkr-fine font-bold" style={{ color: amb.accentMuted }}>
                Lv{active.level} · {active.currentHp}/{active.maxHp}
              </div>
              <div className="pkr-queue-hp" aria-hidden="true">
                <i style={{ width: `${hpPct}%`, background: hpPct > 50 ? '#4ade80' : hpPct > 20 ? '#facc15' : '#f87171' }} />
              </div>
            </div>
          </div>
        </PokeRemSatelliteMiniCard>

        <PokeRemSatelliteMiniCard accentBorder={`${amb.accent}40`} className="flex flex-col justify-center gap-0.5 px-1.5 py-1">
          <span className="pkr-battle-hud-role pkr-fine" style={{ color: amb.accentMuted }}>
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
          className="pkr-queue-wild-card flex min-w-0 flex-[1_1_140px] flex-wrap items-center gap-1.5 px-1.5 py-1 sm:flex-1"
        >
          {hasEncounter && wild ? (
            <>
              <span
                className="shrink-0 rounded-full px-1.5 py-px pkr-fine font-black"
                style={{
                  background: 'linear-gradient(180deg, rgba(251,191,36,0.28) 0%, rgba(180,83,9,0.2) 100%)',
                  color: 'var(--pkr-ink-gold)',
                  border: '1px solid rgba(251,191,36,0.4)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              >
                WILD
              </span>
              <img
                src={frontSpriteUrl(plugin.rootURL, wild.dexNum, wild.shiny === true)}
                alt=""
                width={22}
                height={22}
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="min-w-0 flex-1">
                <div className={`truncate font-bold leading-tight ${wild.shiny ? 'pkr-queue-shiny' : ''}`} style={{ color: wild.shiny ? '#fde047' : '#fde68a' }}>
                  {wild.shiny ? `✦ Shiny ${wild.name}!` : wild.name}
                </div>
                <div className="pkr-fine font-bold" style={{ color: amb.accentMuted }}>
                  Lv{wild.level} · {wild.currentHp}/{wild.maxHp} HP
                </div>
              </div>
              <div className="pkr-queue-actions" role="group" aria-label={`Battle ${wild.name}`}>
                <button type="button" disabled={!!busy || !ball} onClick={() => void act('catch')} title={ball ? `Throw a ${ball.replace('-', ' ')}` : 'No balls left'}>
                  Catch{ball ? ` ${catchPct}%` : ''}
                </button>
                <button type="button" disabled={!!busy || active.currentHp <= 0} onClick={() => void act('fight')}>
                  Fight
                </button>
                <button type="button" disabled={!!busy || active.currentHp <= 0} onClick={() => void act('auto')} title="Attack until it's weak enough to catch">
                  Auto
                </button>
                <button type="button" disabled={!!busy} onClick={() => void act('run')}>
                  Run
                </button>
              </div>
            </>
          ) : state.currentTrainerBattle ? (
            <div className="flex w-full items-center gap-1">
              <span className="min-w-0 pkr-fine font-bold leading-snug" style={{ color: 'var(--pkr-ink-gold)' }}>
                {state.currentTrainerBattle.phase === 'active'
                  ? `Trainer battle in progress: finish it in the sidebar`
                  : state.currentTrainerBattle.phase === 'team_select'
                    ? `${state.currentTrainerBattle.trainer.className} challenges you! Open the sidebar to battle, or they move on in ${Math.max(1, WILD_FLEE_AFTER_CARDS - (state.wildIdleCards ?? 0))} cards`
                    : 'Trainer battle over: see the result in the sidebar'}
              </span>
            </div>
          ) : state.pendingCaughtMon ? (
            <div className="flex w-full items-center justify-between gap-1">
              <span className="min-w-0 pkr-fine font-bold leading-snug" style={{ color: 'var(--pkr-ink-gold)' }}>
                Party full: swap in {state.pendingCaughtMon.name} from the sidebar, or it goes to storage with your next card
              </span>
              <div className="pkr-queue-actions">
                <button type="button" disabled={!!busy} onClick={() => void act('store')} title={`Send ${state.pendingCaughtMon.name} to storage`}>
                  Storage
                </button>
              </div>
            </div>
          ) : leadFaintedNoEncounter ? (
            <div className="flex w-full items-center justify-between gap-1">
              <span className="min-w-0 pkr-fine font-bold leading-snug" style={{ color: 'var(--pkr-ink-danger)' }}>
                Team resting: wilds return in {Math.max(1, WILD_FLEE_AFTER_CARDS - (state.wildIdleCards ?? 0))} cards
              </span>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-1">
              <span className="pkr-fine font-bold" style={{ color: amb.uiMutedHover }}>
                Wild in <strong style={{ color: amb.pillActiveText }}>{remaining}</strong> review{remaining === 1 ? '' : 's'}
              </span>
              {potion?.owned ? (
                <div className="pkr-queue-actions">
                  <button type="button" disabled={!!busy} onClick={() => void act('heal')} title={`Use a ${potion.id.replace('-', ' ')} on ${active.name}`}>
                    Heal
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </PokeRemSatelliteMiniCard>
      </div>
    </div>
  );
}

renderWidget(PokeRemQueueStrip);
