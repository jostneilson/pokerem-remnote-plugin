import { useEffect, useState, type CSSProperties } from 'react';
import type { PokemonType } from '../../game/data/species';
import { TYPE_COLORS } from './battleTheme';
import { typeSymbolUrl } from './typeSymbolUrl';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/** Compact type “gem” — color only; full name in title (Pokémon-style circular icons). */
export function TypeBattleIcon({
  type,
  variant,
  size = 14,
  reducedMotion,
}: {
  type: PokemonType;
  /** Weak = takes super-effective; Resist = defensive resist. */
  variant: 'weak' | 'resist';
  size?: number;
  reducedMotion?: boolean;
}) {
  const systemReduce = usePrefersReducedMotion();
  const calm = reducedMotion === true || systemReduce;
  const c = TYPE_COLORS[type];
  const ring = calm
    ? variant === 'weak'
      ? '0 0 0 2px rgba(248,113,113,0.9), inset 0 1px 0 rgba(255,255,255,0.2)'
      : '0 0 0 2px rgba(52,211,153,0.85), inset 0 1px 0 rgba(255,255,255,0.15)'
    : variant === 'weak'
      ? '0 0 0 2px rgba(254,202,202,0.95), 0 0 10px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.25)'
      : '0 0 0 2px rgba(167,243,208,0.9), 0 0 8px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 9999,
    background: `linear-gradient(145deg, ${c.bg} 0%, ${c.border} 100%)`,
    border: `1px solid rgba(0,0,0,0.35)`,
    boxShadow: ring,
  };

  const hint =
    variant === 'weak'
      ? `${type} — super-effective against this Pokémon`
      : `${type} — not very effective against this Pokémon`;

  return (
    <span
      className="inline-block shrink-0 select-none"
      style={style}
      title={hint}
      aria-label={hint}
    />
  );
}

/** Type orb from bundled PNGs (`assets/types/`). Falls back to {@link TypeBattleIcon} if image fails to load. */
export function TypeSymbolImage({
  rootURL,
  type,
  size = 16,
  variant = 'resist',
  reducedMotion,
}: {
  rootURL: string | undefined;
  type: PokemonType;
  size?: number;
  /** Used only if PNG fails to load (same semantics as TypeBattleIcon). */
  variant?: 'weak' | 'resist';
  reducedMotion?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <TypeBattleIcon type={type} variant={variant} size={size} reducedMotion={reducedMotion} />;
  }
  return (
    <img
      src={typeSymbolUrl(rootURL, type)}
      alt=""
      width={size}
      height={size}
      className="pkr-type-orb inline-block shrink-0 select-none"
      style={{ imageRendering: 'auto' }}
      title={type}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
