import { classificationFor } from './SpeciesBadge';
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
  grounded?: boolean;
}

export function PokemonSprite({ src, alt, size, className = '', style, glow, lazy, shiny, reducedMotion, grounded = false }: PokemonSpriteProps) {
  const [imageState, setImageState] = useState({ src, loaded: false, errored: false, frontFallback: false });
  const [ground,setGround]=useState({src:'',x:0,y:0});
  const [corsBlocked,setCorsBlocked]=useState(false);
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
    <div data-classification={classificationFor(Number(src.match(/\/(\d+)\.png/)?.[1]??0))} style={wrapStyle} className={`inline-flex items-center justify-center ${grounded ? `pkr-grounded ${reducedMotion ? '' : 'pkr-grounded--idle'}` : ''} ${isShiny ? 'pkr-shiny-sprite-ring' : ''} ${className}`}>
      {!loaded && !errored && (
        <div
          className="animate-pkr-shimmer pkr-shimmer-bg absolute inset-0 rounded"
          style={{ backgroundColor: 'rgba(148,163,184,0.15)' }}
        />
      )}
      {isShiny ? <span className="pkr-shiny-stars" aria-label="Shiny Pokémon" data-still={reducedMotion || undefined}>✦</span> : null}
      <img
        key={`${effectiveSrc}:${corsBlocked}`}
        crossOrigin={grounded && !corsBlocked ? 'anonymous' : undefined}
        src={effectiveSrc}
        alt={alt}
        width={size}
        height={size}
        style={{
          imageRendering: 'pixelated',
          transform:grounded && ground.src===effectiveSrc?`translate(${ground.x}px,${ground.y}px)`:undefined,
          ...style,
        }}
        className={`pkr-sprite-image drop-shadow-[2px_3px_0_rgba(0,0,0,0.35)] ${loaded ? '' : 'opacity-0'} `}
        onLoad={(event) => {
          setImageState({src,loaded:true,errored,frontFallback});
          if(grounded){try{const img=event.currentTarget,canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');if(ctx){ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,right=0,bottom=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>20){left=Math.min(left,x);right=Math.max(right,x);bottom=Math.max(bottom,y);}setGround({src:effectiveSrc,x:Math.round((canvas.width/2-(left+right)/2)*size/canvas.width),y:Math.round((canvas.height-1-bottom)*size/canvas.height)});}}catch{/* Sprite remains visible if a host blocks canvas reads. */}}
        }}
        onError={() => grounded && !corsBlocked ? setCorsBlocked(true) : setImageState(src.includes('/pokemon/back/') && !frontFallback ? { src, loaded: false, errored: false, frontFallback: true } : { src, loaded: true, errored: true, frontFallback })}
        loading={lazy ? 'lazy' : undefined}
      />
    </div>
  );
}
