import type { CSSProperties } from 'react';
import { itemIconUrl } from '../../game/sprites';

export type PokeRemTrekStripVariant = 'battle' | 'compact';

/**
 * Shared “trek” toward the next wild check — same fill / near-wild / Poké Ball semantics as
 * {@link BattleReviewSurface} so queue toolbar stays aligned with in-battle progress.
 */
export function PokeRemTrekStrip({
  rootURL,
  effectiveRate,
  progress,
  hasEncounter,
  accent,
  variant = 'battle',
  title,
}: {
  rootURL: string | undefined;
  effectiveRate: number;
  progress: number;
  hasEncounter: boolean;
  accent: string;
  variant?: PokeRemTrekStripVariant;
  title?: string;
}) {
  const defaultTitle = `${progress} of ${effectiveRate} reviews toward the next wild check`;
  const isCompact = variant === 'compact';

  const cellClass = isCompact
    ? 'flex h-3.5 w-3.5 items-center justify-center rounded-full transition-[box-shadow] duration-200 sm:h-4 sm:w-4'
    : 'flex h-5 w-5 items-center justify-center rounded-full transition-[box-shadow] duration-200';

  const dotClass = isCompact
    ? 'h-2 w-2 rounded-full transition-colors sm:h-2.5 sm:w-2.5'
    : 'h-2.5 w-2.5 rounded-full transition-colors';

  const ballSize = isCompact ? 9 : 12;

  const wrapClass = isCompact
    ? 'flex items-center gap-0.5 rounded-full border px-1 py-px sm:gap-1 sm:px-1.5 sm:py-0.5'
    : 'flex items-center gap-1 rounded-full border-2 px-1.5 py-0.5';

  const wrapStyle: CSSProperties = isCompact
    ? {
        borderColor: `${accent}55`,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(15,23,42,0.65) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 rgba(0,0,0,0.35)',
      }
    : {
        borderColor: `${accent}66`,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(15,23,42,0.72) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 0 rgba(0,0,0,0.35)',
      };

  return (
    <div className={wrapClass} style={wrapStyle} title={title ?? defaultTitle}>
      {Array.from({ length: effectiveRate }, (_, i) => {
        const filled = hasEncounter || i < progress;
        const isLast = i === effectiveRate - 1;
        const nearWild = !hasEncounter && i === progress && progress < effectiveRate;
        return (
          <div
            key={i}
            className={cellClass}
            style={{
              border: `1px solid ${nearWild ? accent : 'rgba(255,255,255,0.38)'}`,
              background: 'rgba(0,0,0,0.35)',
              boxShadow: nearWild ? `0 0 8px ${accent}88` : undefined,
            }}
          >
            {isLast ? (
              <img
                src={itemIconUrl(rootURL, 'poke-ball.png')}
                alt=""
                width={ballSize}
                height={ballSize}
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <span
                className={dotClass}
                style={
                  filled
                    ? { background: '#6ee7b7', boxShadow: '0 0 6px rgba(110,231,183,0.85)' }
                    : { background: 'rgba(255,255,255,0.22)' }
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
