import '../style.css';
import { useEffect, useState } from 'react';
import { renderWidget, usePlugin } from '@remnote/plugin-sdk';
import { getSyncedGameRaw } from '../game/constants';
import { parseGameState } from '../game/state/store';
import type { PokemonType } from '../game/data/species';
import { frontSpriteUrl } from '../game/sprites';
import { PokemonSprite } from '../ui/components/PokemonSprite';
import { TypeBadge } from '../ui/components/TypeBadge';
import { neutralizeBrokenRegisterCSS } from '../neutralizeRemNoteCssApi';
import { getBattleAmbience } from '../game/engine/battleAmbience';
import { PokeRemSatelliteHudFrame } from '../ui/components/PokeRemSatelliteChrome';
import { GameIcon } from '../ui/components/GameIcon';
import { BRAND } from '../ui/theme/gameTheme';

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
  } | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    void (async () => {
      const raw = await getSyncedGameRaw(plugin);
      const state = parseGameState(raw);
      if (state.currentEncounter) {
        setEncounter(state.currentEncounter);
        setSceneIndex(state.battleSceneIndex ?? 0);
        window.setTimeout(async () => {
          try {
            const windowAny = (plugin as any).window;
            if (typeof windowAny?.closeFloatingWidget === 'function') {
              await windowAny.closeFloatingWidget('pokerem_encounter_popup');
            }
          } catch {
            /* host may not support close */
          }
        }, 4000);
      }
    })();
  }, [plugin]);

  if (!encounter) return null;

  const { border: tierBorder, glow: tierGlow } = tierAccent(encounter.tier);
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
            src={frontSpriteUrl(plugin.rootURL, encounter.dexNum)}
            alt={encounter.name}
            size={48}
          />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="mb-1 flex items-center gap-1">
            <GameIcon name="pokeball" size={11} />
            <span className="pkr-battle-hud-role text-[5px] sm:text-[6px]" style={{ color: amb.accentMuted }}>
              {BRAND.wordmarkCaps}
            </span>
          </div>

          <div
            className="pkr-pixel-title text-[7px] leading-snug sm:text-[8px]"
            style={{ color: amb.pillActiveText, textShadow: '2px 2px 0 rgba(0,0,0,0.55)' }}
          >
            {encounter.tier && encounter.tier !== 'Common' && (
              <span
                className="mr-1 inline-block rounded px-1 py-px align-middle text-[6px] font-bold uppercase sm:text-[7px]"
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
            Wild {encounter.name}!
          </div>

          <div className="mt-0.5 text-[7px] font-bold sm:text-[8px]" style={{ color: amb.accentMuted }}>
            Lv{encounter.level}
          </div>

          <div className="mt-1 flex flex-wrap gap-0.5">
            {encounter.types.map((t) => (
              <TypeBadge key={t} rootURL={plugin.rootURL} type={t as PokemonType} />
            ))}
          </div>

          <div
            className="pkr-pixel-title mt-2 flex items-center gap-1 text-[6px] leading-tight sm:text-[7px]"
            style={{ color: '#fca5a5', textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
          >
            <span className="inline-flex shrink-0 opacity-90" aria-hidden style={{ color: amb.accentMuted }}>
              <GameIcon name="party" size={10} />
            </span>
            Open sidebar to battle
          </div>
        </div>
      </div>
    </PokeRemSatelliteHudFrame>
  );
}

renderWidget(EncounterPopup);
