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
  /** Actual species-specific shiny sprite with decorative stars; never recolor the art. */
  shiny?: boolean;
  reducedMotion?: boolean;
}

export function PokemonSprite({ src, alt, size, className = '', style, glow, lazy, shiny, reducedMotion }: PokemonSpriteProps) {
  const [imageState, setImageState] = useState({ src, loaded: false, errored: false, frontFallback: false });
  const loaded = imageState.src === src && imageState.loaded;
  const errored = imageState.src === src && imageState.errored;
  const frontFallback = imageState.src === src && imageState.frontFallback;
  const effectiveSrc = errored ? FALLBACK_DATA_URI : frontFallback ? src.replace('/pokemon/back/', '/pokemon/') : src;

  const wrapStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    ...(glow ? { filter: `drop-shadow(0 0 8px ${glow})` } : {}),
  };

  const isShiny = shiny || src.includes('/shiny/');

  return (
    <div style={wrapStyle} className={`inline-flex items-center justify-center ${isShiny ? 'pkr-shiny-sprite-ring' : ''} ${className}`}>
      {!loaded && !errored && (
        <div
          className="animate-pkr-shimmer pkr-shimmer-bg absolute inset-0 rounded"
          style={{ backgroundColor: 'rgba(148,163,184,0.15)' }}
        />
      )}
      {isShiny ? <span className="pkr-shiny-stars" aria-label="Shiny Pokémon" data-still={reducedMotion || undefined}>✦</span> : null}
      <img
        key={effectiveSrc}
        src={effectiveSrc}
        alt={alt}
        width={size}
        height={size}
        style={{
          imageRendering: 'pixelated',
          ...style,
        }}
        className={`pkr-sprite-image drop-shadow-[2px_3px_0_rgba(0,0,0,0.35)] ${loaded ? '' : 'opacity-0'} `}
        onLoad={() => setImageState({ src, loaded: true, errored, frontFallback })}
        onError={() => setImageState(src.includes('/pokemon/back/') && !frontFallback ? { src, loaded: false, errored: false, frontFallback: true } : { src, loaded: true, errored: true, frontFallback })}
        loading={lazy ? 'lazy' : undefined}
      />
    </div>
  );
}
