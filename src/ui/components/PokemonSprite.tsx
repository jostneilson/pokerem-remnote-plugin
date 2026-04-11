import { useState, type CSSProperties } from 'react';

const FALLBACK_DATA_URI = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="40" stroke="#94a3b8" stroke-width="4" stroke-dasharray="8 6"/>
    <circle cx="48" cy="48" r="12" fill="#cbd5e1"/>
    <text x="48" y="54" text-anchor="middle" font-size="20" font-weight="bold" fill="#64748b">?</text>
  </svg>`
);

interface PokemonSpriteProps {
  src: string;
  alt: string;
  size: number;
  className?: string;
  style?: CSSProperties;
  glow?: string;
  lazy?: boolean;
  /** Alternate palette — animated hue unless `reducedMotion`. */
  shiny?: boolean;
  reducedMotion?: boolean;
}

export function PokemonSprite({ src, alt, size, className = '', style, glow, lazy, shiny, reducedMotion }: PokemonSpriteProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const effectiveSrc = errored ? FALLBACK_DATA_URI : src;

  const wrapStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    ...(glow ? { filter: `drop-shadow(0 0 8px ${glow})` } : {}),
  };

  const shinyAnim = shiny && !reducedMotion ? 'animate-pkr-shiny-hue' : '';

  return (
    <div style={wrapStyle} className={`inline-flex items-center justify-center ${shiny ? 'pkr-shiny-sprite-ring' : ''} ${className}`}>
      {!loaded && !errored && (
        <div
          className="animate-pkr-shimmer pkr-shimmer-bg absolute inset-0 rounded"
          style={{ backgroundColor: 'rgba(148,163,184,0.15)' }}
        />
      )}
      <img
        src={effectiveSrc}
        alt={alt}
        width={size}
        height={size}
        style={{
          imageRendering: 'pixelated',
          ...(shiny && reducedMotion ? { filter: 'hue-rotate(26deg) saturate(1.28) brightness(1.06)' } : {}),
          ...style,
        }}
        className={`drop-shadow-[2px_3px_0_rgba(0,0,0,0.35)] ${loaded ? '' : 'opacity-0'} ${shinyAnim}`}
        onLoad={() => setLoaded(true)}
        onError={() => { setErrored(true); setLoaded(true); }}
        loading={lazy ? 'lazy' : undefined}
      />
    </div>
  );
}
