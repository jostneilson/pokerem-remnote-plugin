import '../style.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderWidget, usePlugin } from '@remnote/plugin-sdk';
import { getSyncedGameRaw } from '../game/constants';
import { activePokemon, parseGameState } from '../game/state/store';
import type { PokeRemGameState } from '../game/state/model';
import { recommendedBall, wildCatchChancePreview } from '../game/engine/encounters';
import type { PokemonType } from '../game/data/species';
import { frontSpriteUrl } from '../game/sprites';
import { PokemonSprite } from '../ui/components/PokemonSprite';
import { TypeBadge } from '../ui/components/TypeBadge';
import { neutralizeBrokenRegisterCSS } from '../neutralizeRemNoteCssApi';
import { getBattleAmbience } from '../game/engine/battleAmbience';
import { PokeRemSatelliteHudFrame } from '../ui/components/PokeRemSatelliteChrome';
import { GameIcon } from '../ui/components/GameIcon';
import { BRAND } from '../ui/theme/gameTheme';
import { runQueueAction, type QueueAction } from '../game/queueActions';

/** The popup closes itself this long after it opens or after the last tap. */
const POPUP_LINGER_MS = 9000;

function tierAccent(tier?: string): { border: string; glow: string } {
  if (tier === 'Legendary') return { border: '#eab308', glow: 'rgba(234,179,8,0.35)' };
  if (tier === 'Mythical') return { border: '#a855f7', glow: 'rgba(168,85,247,0.35)' };
  if (tier === 'Ultra') return { border: '#3b82f6', glow: 'rgba(59,130,246,0.35)' };
  return { border: '#f87171', glow: 'rgba(248,113,113,0.28)' };
}

function EncounterPopup() {
  const plugin = usePlugin();
  neutralizeBrokenRegisterCSS(plugin);
  const [encounter, setEncounter] = useState<{
    name: string;
    dexNum: number;
    level: number;
    types: string[];
    tier?: string;
    shiny?: boolean;
  } | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [catchPct, setCatchPct] = useState<number | null>(null);
  /** The wild was caught, defeated or fled: the result stays up briefly with no actions left to tap. */
  const [ended, setEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('');
  const closeTimer = useRef<number | undefined>(undefined);

  const close = useCallback(async () => {
    try {
      const windowAny = (plugin as any).window;
      if (typeof windowAny?.closeFloatingWidget === 'function') {
        await windowAny.closeFloatingWidget('pokerem_encounter_popup');
      }
    } catch {
      /* host may not support close */
    }
  }, [plugin]);

  const scheduleClose = useCallback(
    (ms: number) => {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => void close(), ms);
    },
    [close],
  );

  const readCatch = (state: PokeRemGameState) => {
    const wild = state.currentEncounter;
    const picked = wild ? recommendedBall(state.bag, wild, activePokemon(state)) : null;
    setCatchPct(
      wild && picked && (state.bag[picked] ?? 0) > 0
        ? Math.round(wildCatchChancePreview(wild, activePokemon(state), picked) * 100)
        : null
    );
  };

  useEffect(() => {
    void (async () => {
      const raw = await getSyncedGameRaw(plugin);
      const state = parseGameState(raw);
      if (state.currentEncounter) {
        setEncounter(state.currentEncounter);
        setSceneIndex(state.battleSceneIndex ?? 0);
        readCatch(state);
        scheduleClose(POPUP_LINGER_MS);
      }
    })();
    return () => window.clearTimeout(closeTimer.current);
  }, [plugin, scheduleClose]);

  const act = async (action: QueueAction) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await runQueueAction(plugin, action);
      if (!next) return;
      setLog(next.lastBattleLog ?? '');
      if (next.currentEncounter) {
        setEncounter(next.currentEncounter);
        readCatch(next);
        scheduleClose(POPUP_LINGER_MS);
      } else {
        setEnded(true);
        scheduleClose(2600);
      }
    } catch (e) {
      console.error(`[${BRAND.wordmark}] Encounter popup action failed`, e);
    } finally {
      setBusy(false);
    }
  };

  if (!encounter) return null;

  const { border: tierBorder, glow: tierGlow } = encounter.shiny
    ? { border: '#fde047', glow: 'rgba(253,224,71,0.55)' }
    : tierAccent(encounter.tier);
  const amb = getBattleAmbience(sceneIndex);

  return (
    <PokeRemSatelliteHudFrame
      accentBar={amb.accent}
      className="pkr-pixel-surface pkr-encounter-surface-enter pkr-satellite-popup-veneer border-2"
      style={{
        borderColor: tierBorder,
        minWidth: '232px',
        maxWidth: 'min(288px, 92vw)',
        boxShadow: `
          0 0 0 1px rgba(0,0,0,0.55),
          0 10px 32px rgba(0,0,0,0.52),
          0 0 26px ${tierGlow},
          inset 0 2px 0 rgba(255,255,255,0.09),
          inset 0 -2px 0 rgba(0,0,0,0.38)
        `,
        filter: 'saturate(1.06) contrast(1.04)',
      }}
    >
      <div
        className="flex items-stretch gap-2.5 p-2.5"
        style={{
          background: amb.sidebarGradient,
        }}
      >
        <div
          className="pkr-battle-hud relative shrink-0 self-center rounded border p-0.5"
          style={{
            borderColor: `${amb.accent}55`,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(15,23,42,0.55) 100%)',
            boxShadow: `inset 0 2px 4px rgba(0,0,0,0.45), 0 0 10px ${amb.accent}22`,
          }}
        >
          <PokemonSprite
            src={frontSpriteUrl(plugin.rootURL, encounter.dexNum, encounter.shiny === true)}
            alt={encounter.name}
            size={48}
          />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="mb-1 flex items-center gap-1">
            <GameIcon name="pokeball" size={11} />
            <span className="pkr-battle-hud-role pkr-fine" style={{ color: amb.accentMuted }}>
              {BRAND.wordmarkCaps}
            </span>
          </div>

          <div
            className="pkr-pixel-title pkr-fine leading-snug"
            style={{ color: amb.pillActiveText, textShadow: '2px 2px 0 rgba(0,0,0,0.55)' }}
          >
            {encounter.tier && encounter.tier !== 'Common' && (
              <span
                className="mr-1 inline-block rounded px-1 py-px align-middle pkr-fine font-bold uppercase"
                style={{
                  backgroundColor: tierBorder,
                  color: encounter.tier === 'Legendary' ? '#422006' : '#fff',
                  border: '1px solid rgba(0,0,0,0.35)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {encounter.tier}
              </span>
            )}
            {encounter.shiny ? `✦ Shiny ${encounter.name}!` : `Wild ${encounter.name}!`}
          </div>

          <div className="mt-0.5 pkr-fine font-bold" style={{ color: amb.accentMuted }}>
            Lv{encounter.level}
          </div>

          <div className="mt-1 flex flex-wrap gap-0.5">
            {encounter.types.map((t) => (
              <TypeBadge key={t} rootURL={plugin.rootURL} type={t as PokemonType} />
            ))}
          </div>

          {log ? (
            <div className="mt-1 line-clamp-2 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-text)' }} role="status">
              {log}
            </div>
          ) : null}
          {ended ? null : (
            <div className="pkr-queue-actions pkr-popup-actions mt-1.5" role="group" aria-label={`Battle ${encounter.name}`}>
              <button type="button" disabled={busy || catchPct == null} onClick={() => void act('catch')}>
                Catch{catchPct != null ? ` ${catchPct}%` : ''}
              </button>
              <button type="button" disabled={busy} onClick={() => void act('fight')}>Fight</button>
              <button type="button" disabled={busy} onClick={() => void act('auto')}>Auto</button>
              <button type="button" disabled={busy} onClick={() => void act('run')}>Run</button>
            </div>
          )}
        </div>
      </div>
    </PokeRemSatelliteHudFrame>
  );
}

renderWidget(EncounterPopup);
