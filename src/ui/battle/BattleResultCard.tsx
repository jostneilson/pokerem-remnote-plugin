import { useEffect, useState } from 'react';
import type { BattleResult } from '../../game/state/model';
import { frontSpriteUrl } from '../../game/sprites';
import { PokemonSprite } from '../components/PokemonSprite';

/**
 * After a wild battle: the XP bar fills, then the level-up, new moves and evolution appear in turn,
 * like the main series. A shiny catch gets the gold "SHINY CAUGHT!" treatment.
 */
export function BattleResultCard({
  result,
  rootURL,
  reducedMotion,
  onDismiss,
}: {
  result: BattleResult;
  rootURL: string | undefined;
  reducedMotion?: boolean;
  onDismiss: () => void;
}) {
  const levels = Math.max(0, result.toLevel - result.fromLevel);
  const [step, setStep] = useState(reducedMotion ? 3 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    setStep(0);
    const timers = [250, 1050, 1700].map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [result.seq, reducedMotion]);

  // Bar: fill to 100% for each level gained, then settle at the new progress.
  const barPct =
    step === 0 ? result.xpPctBefore : levels > 0 && step === 1 ? 100 : result.xpPctAfter;
  const isCatch = result.kind === 'catch';
  const shiny = result.shiny === true;
  const title = isCatch
    ? shiny
      ? 'SHINY CAUGHT!'
      : `Gotcha! ${result.name} was caught!`
    : `${result.name} fainted!`;

  return (
    <div
      className={`pkr-result-card${shiny ? ' pkr-result-card--shiny' : ''}${result.perfectIvs ? ' pkr-result-card--hundo' : ''}${reducedMotion ? ' pkr-result-card--still' : ''}`}
      role="status"
      aria-live="polite"
    >
      {shiny && !reducedMotion ? <span className="pkr-result-sweep" aria-hidden="true" /> : null}
      <div className="pkr-result-head">
        {isCatch ? (
          <span className="pkr-result-sprite">
            <PokemonSprite
              src={frontSpriteUrl(rootURL, result.dexNum, shiny)}
              alt={result.name}
              size={56}
              shiny={shiny}
            />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="pkr-result-title">{title}</div>
          {isCatch && shiny ? (
            <div className="pkr-result-sub">✦ {result.name} is yours ✦</div>
          ) : null}
          {result.perfectIvs ? (
            <div className="pkr-result-hundo">★★★★ HUNDO · perfect IVs</div>
          ) : null}
          <div className="pkr-result-sub">
            {result.xp > 0 ? `${result.monName} +${result.xp} XP · ` : ''}+₽
            {result.coins.toLocaleString()}
          </div>
        </div>
      </div>
      {!isCatch ? (
        <div className="pkr-result-xp" aria-hidden="true">
          <span>XP</span>
          <div className="pkr-result-xp-track">
            <i
              style={{
                width: `${barPct}%`,
                transition: reducedMotion || (levels > 0 && step === 2) ? 'none' : undefined,
              }}
            />
          </div>
        </div>
      ) : null}
      {levels > 0 && step >= 2 ? (
        <div className="pkr-result-line pkr-result-line--level">
          {result.monName} grew to Lv {result.toLevel}!
        </div>
      ) : null}
      {step >= 3 && result.newMoves.length > 0 ? (
        <div className="pkr-result-line">
          Learned {result.newMoves.join(', ')}!{' '}
          <span className="pkr-result-note">Best moves update automatically.</span>
        </div>
      ) : null}
      {step >= 3 && result.evolvedInto ? (
        <div
          className={`pkr-result-line pkr-result-line--evolve${reducedMotion ? '' : ' pkr-result-evolve-flash'}`}
        >
          What? {result.monName} evolved into {result.evolvedInto}!
        </div>
      ) : null}
      <button type="button" className="pkr-btn-secondary pkr-result-ok" onClick={onDismiss}>
        OK
      </button>
    </div>
  );
}
