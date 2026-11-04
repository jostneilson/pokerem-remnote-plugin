import { useState, type ReactNode } from 'react';
import type {
  BattleOutcomeKind,
  CombatStrikeSnapshot,
  EncounterPokemon,
  OwnedPokemon,
} from '../../game/state/model';
import { backSpriteUrl, frontSpriteUrl, itemIconUrl } from '../../game/sprites';
import {
  battleSceneBackgroundStyle,
  battleSceneImageUrl,
  type getBattleAmbience,
  type getBattleSpriteOffsets,
} from '../../game/engine/battleAmbience';
import type { CatchBall } from '../../game/engine/encounters';
import { PokemonSprite } from '../components/PokemonSprite';
import { CombatStrikeOverlay } from './CombatStrikeOverlay';
import { busyOverlayText, tierGlow, type BusyAction } from './battleSurfaceUtils';
import type { BattleFx, BattleLinger } from './useBattleFx';
import type { useSceneBlend } from './useBattleLayout';

const SCENE_FADE =
  'opacity var(--pkr-motion-scene, 0.42s) var(--pkr-ease-out, cubic-bezier(0.22, 1, 0.36, 1))';

/**
 * The battle field in the main-series layout: scene backdrop (with crossfade), the foe on the far
 * platform and your Pokémon's back on the near one, both info plates, and the field's moments —
 * the encounter wipe, damage floats, the shiny ribbon, the thrown ball and the KO / faint hold.
 */
export function BattleField({
  rootURL,
  sceneIdx,
  amb,
  spriteOff,
  scene,
  reducedMotion,
  fx,
  height,
  layoutW,
  spriteSize,
  fieldWild,
  linger,
  hasEncounter,
  active,
  outcomeKind,
  feedbackSeq,
  strike,
  thrownBall,
  battleBusy,
  busyAction,
  wildHud,
  playerHud,
}: {
  rootURL: string | undefined;
  sceneIdx: number;
  amb: ReturnType<typeof getBattleAmbience>;
  spriteOff: ReturnType<typeof getBattleSpriteOffsets>;
  scene: ReturnType<typeof useSceneBlend>;
  reducedMotion?: boolean;
  fx: BattleFx;
  height: number;
  layoutW: number;
  spriteSize: number;
  /** The wild on the field: the live encounter, or the one held for a KO / faint finish. */
  fieldWild: EncounterPokemon | null;
  linger: BattleLinger | null;
  hasEncounter: boolean;
  active: OwnedPokemon;
  outcomeKind: BattleOutcomeKind;
  feedbackSeq: number;
  strike: CombatStrikeSnapshot | null;
  thrownBall: CatchBall;
  battleBusy: boolean;
  busyAction: BusyAction;
  wildHud: ReactNode;
  playerHud: ReactNode;
}) {
  const [sceneFailed, setSceneFailed] = useState(false);
  const singleBgStyle = sceneFailed
    ? ({
        backgroundImage: amb.sceneFallbackGradient,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      } as const)
    : battleSceneBackgroundStyle(rootURL, sceneIdx);
  const { blend, armed } = scene;

  const isCatchOutcome = outcomeKind === 'catch_success';
  const isDefeatOutcome = outcomeKind === 'defeat' || linger?.kind === 'defeat';
  const wildFinishMotionClass =
    linger?.kind === 'faint'
      ? 'pkr-battle-wild-faint-flee'
      : isDefeatOutcome
        ? 'animate-pkr-fade-out'
        : '';
  const wildAnimate = fx.shake && (hasEncounter || !!linger);
  const showDamageFloats =
    hasEncounter && outcomeKind === 'combat' && !!strike && feedbackSeq > 0 && !reducedMotion;
  const lunging = !reducedMotion && !linger;

  return (
    <div
      className={`pkr-battle-field pkr-wild-field relative w-full overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]${fieldWild?.shiny ? ' pkr-battle-field--shiny' : ''}`}
      style={{ height: `${height}px` }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        {blend && !reducedMotion ? (
          <>
            <div
              className="pkr-scene-crossfade-layer absolute inset-0"
              style={{
                ...battleSceneBackgroundStyle(rootURL, blend.from),
                opacity: armed ? 0 : 1,
                transition: armed ? SCENE_FADE : 'none',
              }}
              aria-hidden
            />
            <div
              className="pkr-scene-crossfade-layer absolute inset-0"
              style={{
                ...(sceneFailed ? singleBgStyle : battleSceneBackgroundStyle(rootURL, blend.to)),
                opacity: armed ? 1 : 0,
                transition: armed ? SCENE_FADE : 'none',
              }}
              aria-hidden
              onTransitionEnd={(e) => {
                if (e.propertyName !== 'opacity' || e.target !== e.currentTarget) return;
                scene.finish();
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0" style={{ ...singleBgStyle }} />
        )}
      </div>
      {!reducedMotion ? <div className="pkr-crt-lines" aria-hidden /> : null}
      <img
        src={battleSceneImageUrl(rootURL, sceneIdx)}
        alt=""
        style={{ display: 'none' }}
        onError={() => setSceneFailed(true)}
        onLoad={() => setSceneFailed(false)}
      />

      <CombatStrikeOverlay
        rootURL={rootURL}
        strike={strike}
        lungePhase={fx.lunge}
        reducedMotion={reducedMotion}
      />

      {showDamageFloats && strike ? (
        <>
          {(strike.playerDamage ?? 0) > 0 ? (
            <div
              key={`wild-dmg-${feedbackSeq}`}
              className="pointer-events-none absolute right-[8%] top-[22%] z-[8] pkr-dmg-float pkr-dmg-float--wild pkr-pixel-title"
              aria-hidden
            >
              −{strike.playerDamage}
            </div>
          ) : null}
          {(strike.wildDamage ?? 0) > 0 ? (
            <div
              key={`pl-dmg-${feedbackSeq}`}
              className="pointer-events-none absolute left-[12%] bottom-[38%] z-[8] pkr-dmg-float pkr-dmg-float--player pkr-pixel-title"
              aria-hidden
            >
              −{strike.wildDamage}
            </div>
          ) : null}
        </>
      ) : null}

      {linger ? (
        <div
          className="pointer-events-none absolute inset-0 z-[12] flex flex-col items-center justify-end pb-[16%]"
          aria-hidden
        >
          <div className="pkr-battle-finish-veil absolute inset-0" />
          {reducedMotion ? (
            <span className="pkr-battle-finish-stamp pkr-battle-finish-stamp--static relative z-[1]">
              {linger.kind === 'defeat' ? 'Defeated' : 'Fainted'}
            </span>
          ) : linger.kind === 'defeat' ? (
            <span className="pkr-battle-finish-stamp relative z-[1]">KO</span>
          ) : (
            <span className="pkr-battle-finish-stamp pkr-battle-finish-stamp--faint relative z-[1]">
              Fainted
            </span>
          )}
        </div>
      ) : null}

      {wildHud}

      {fx.intro ? (
        <div
          className={`pkr-battle-wipe${fieldWild?.pendingPrize ? ' pkr-battle-wipe--prize' : fieldWild?.shiny ? ' pkr-battle-wipe--shiny' : ''}`}
          aria-hidden="true"
        />
      ) : null}
      {fieldWild?.pendingPrize && fx.intro ? (
        <div className="pkr-prize-reveal" role="status">
          <span className="pkr-prize-reveal__label">THE LEADER’S PRIZE</span>
          <strong>{fieldWild.name} appeared!</strong>
        </div>
      ) : null}
      {fieldWild?.shiny ? (
        <div
          key={`shiny-${fieldWild.dexNum}-${isCatchOutcome}`}
          className="pkr-shiny-celebration pkr-shiny-celebration--field"
          role="status"
        >
          <span aria-hidden="true" className="pkr-shiny-burst">
            ✦
          </span>
          <strong>{isCatchOutcome ? 'Shiny caught!' : 'A shiny appeared!'}</strong>
          <span aria-hidden="true" className="pkr-shiny-burst">
            ✦
          </span>
          <span className="sr-only">{fieldWild.name}</span>
        </div>
      ) : null}
      {(isCatchOutcome || outcomeKind === 'catch_fail') && !reducedMotion ? (
        <img
          key={`ball-${feedbackSeq}`}
          src={itemIconUrl(rootURL, `${thrownBall}.png`)}
          alt=""
          aria-hidden="true"
          className={`pkr-ball-throw ${isCatchOutcome ? 'pkr-ball-throw--caught' : 'pkr-ball-throw--missed'}${fieldWild?.shiny ? ' pkr-ball-throw--shiny' : ''}`}
        />
      ) : null}

      {/* Wild sprite on the far platform. */}
      <div
        className="absolute z-10"
        style={{
          left: '74%',
          top: '58%',
          translate: '-50% -100%',
          transform: `translate(${Math.round((spriteOff.wildX * layoutW) / 400)}px,${Math.round((spriteOff.wildY * layoutW) / 400)}px)`,
        }}
      >
        {fieldWild ? (
          <div
            className={`${fieldWild.shiny ? 'pkr-shiny-aura' : ''} ${fx.intro ? 'pkr-intro-foe' : ''} ${wildAnimate ? 'animate-pkr-shake' : ''} ${wildFinishMotionClass} ${isCatchOutcome ? 'animate-pkr-catch-bounce' : ''} ${fx.lunge === 'wild' && lunging ? 'animate-pkr-lunge-wild' : ''} ${fx.wildHit ? 'pkr-battle-target-hit' : ''}`}
          >
            <PokemonSprite
              src={frontSpriteUrl(rootURL, fieldWild.dexNum, fieldWild.shiny === true)}
              alt={fieldWild.name}
              grounded
              size={spriteSize}
              glow={tierGlow(fieldWild.tier)}
              shiny={fieldWild.shiny === true}
              reducedMotion={reducedMotion}
            />
            {fieldWild.shiny ? (
              <span
                key={`spark-${fieldWild.dexNum}`}
                className="pkr-shiny-landing"
                aria-hidden="true"
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} style={{ ['--a' as string]: `${i * 45}deg` }} />
                ))}
              </span>
            ) : null}
          </div>
        ) : (
          <div
            className="animate-pkr-float flex items-center justify-center"
            style={{ width: spriteSize, height: spriteSize }}
          >
            <span
              className="text-5xl font-black drop-shadow-lg"
              style={{
                color: 'rgba(255,255,255,0.4)',
                textShadow: '0 0 20px rgba(255,255,255,0.15)',
              }}
            >
              ?
            </span>
          </div>
        )}
      </div>

      {/* Your Pokémon's back on the near platform. */}
      <div
        className="absolute z-10"
        style={{
          left: '24%',
          top: hasEncounter ? '93%' : '89%',
          translate: '-50% -100%',
          transform: `translate(${Math.round((spriteOff.playerX * layoutW) / 400)}px,${Math.round((spriteOff.playerY * layoutW) / 400)}px)`,
        }}
      >
        <div
          className={`${fx.intro ? 'pkr-intro-ally' : ''} ${fx.lunge === 'player' && lunging ? 'animate-pkr-lunge-player' : ''} ${fx.playerHit ? 'pkr-battle-target-hit' : ''} ${linger?.kind === 'faint' ? 'animate-pkr-fade-out' : ''}`}
        >
          <PokemonSprite
            src={backSpriteUrl(rootURL, active.dexNum, active.shiny === true)}
            alt={active.name}
            grounded
            size={Math.round(spriteSize * 1.3)}
            shiny={active.shiny === true}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>

      {playerHud}

      {hasEncounter && battleBusy ? (
        <div className="pkr-battle-busy-overlay" aria-live="polite" aria-busy="true">
          <span className="pkr-battle-busy-overlay__label">{busyOverlayText(busyAction)}</span>
        </div>
      ) : null}
    </div>
  );
}
