import { useEffect, useState } from 'react';

const HP_FILL_GRADIENT =
  'linear-gradient(180deg,#bef264 0%,#84cc16 50%,#4d7c0f 100%)';
const XP_FILL = '#22d3ee';

export function MeterBar({
  value,
  max,
  color,
  colorClass,
  label,
  showText = true,
  /** Smaller type + track — party cards, dense rows */
  compact = false,
  /** When set, overrides solid `color` / auto HP coloring */
  fillGradient,
  /** Right-side summary (e.g. XP percent). If omitted, uses value/max. */
  valueText,
  /** Bump to briefly run the global XP shimmer on the fill (trainer XP moments). */
  pulseKey,
}: {
  value: number;
  max: number;
  color?: string;
  colorClass?: string;
  label: string;
  showText?: boolean;
  compact?: boolean;
  fillGradient?: string;
  valueText?: string;
  pulseKey?: number;
}) {
  const [shimmer, setShimmer] = useState(false);
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const autoColor = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444';
  const fillColor = fillGradient ? undefined : color || autoColor;
  const fillClass = colorClass || '';
  const trackH = compact ? 'h-[4px]' : 'h-2';
  const textRow = compact ? 'text-[8px]' : 'text-[10px]';

  useEffect(() => {
    if (pulseKey === undefined || pulseKey <= 0) return;
    setShimmer(true);
    const t = window.setTimeout(() => setShimmer(false), 680);
    return () => clearTimeout(t);
  }, [pulseKey]);

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-0.5'}>
      {showText && (
        <div className={`flex justify-between font-bold ${textRow}`} style={{ color: '#94a3b8' }}>
          <span>{label}</span>
          <span className="tabular-nums">
            {valueText ?? `${Math.floor(value)}/${Math.floor(max)}`}
          </span>
        </div>
      )}
      <div className={`pkr-meter-track ${trackH} w-full overflow-hidden`}>
        <div
          className={`pkr-meter-fill h-full transition-[width] duration-300 ${fillClass} ${shimmer ? 'pkr-xp-bar-fill--pulse' : ''}`}
          style={{
            width: `${pct}%`,
            ...(fillGradient ? { background: fillGradient } : { background: fillColor }),
          }}
        />
      </div>
    </div>
  );
}

/** Party / list rows — same HP gradient language as battle player bar */
export function PartyHpMeter({ current, max, compact = true }: { current: number; max: number; compact?: boolean }) {
  return (
    <MeterBar
      compact={compact}
      value={current}
      max={max}
      label="HP"
      fillGradient={HP_FILL_GRADIENT}
      showText
    />
  );
}

/** XP toward next level — bar is 0–100% of current level segment */
export function PartyXpMeter({ percent, compact = true }: { percent: number; compact?: boolean }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <MeterBar
      compact={compact}
      value={p}
      max={100}
      label="XP"
      color={XP_FILL}
      valueText={`${Math.round(p)}%`}
      showText
    />
  );
}
