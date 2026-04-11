import { useMemo, type CSSProperties } from 'react';

type BurstVariant = 'xp' | 'level' | 'reward';

/** Gold star chips — short radial burst (90s cel / impact frame vibe). */
export function TrainerXpStarBurst({
  variant,
  burstKey,
}: {
  variant: BurstVariant;
  /** Bump to reshuffle angles slightly per burst */
  burstKey: number;
}) {
  const { count, distancePx } =
    variant === 'reward'
      ? { count: 8, distancePx: 22 }
      : variant === 'level'
        ? { count: 14, distancePx: 36 }
        : { count: 10, distancePx: 30 };

  const particles = useMemo(() => {
    const seed = burstKey * 9973;
    return Array.from({ length: count }, (_, i) => {
      const t = (i / count) * Math.PI * 2 + (seed % 360) * 0.001;
      const jitter = ((seed + i * 31) % 7) * 0.04 - 0.12;
      const a = t + jitter;
      return {
        dx: Math.cos(a) * distancePx,
        dy: Math.sin(a) * distancePx,
        rot: ((seed + i * 17) % 80) - 40,
        delay: i * 0.018,
        scale: 0.55 + ((seed + i) % 5) * 0.09,
      };
    });
  }, [burstKey, count, distancePx]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={`${burstKey}-${i}`}
          className="pkr-xp-star-particle"
          style={
            {
              '--pkr-xp-dx': `${p.dx}px`,
              '--pkr-xp-dy': `${p.dy}px`,
              '--pkr-xp-rot': `${p.rot}deg`,
              '--pkr-xp-sc': String(p.scale),
              animationDelay: `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
