import { meterLevel } from '../../game/engine/capacity';

/** "Storage 58/60" with a 4px bar: amber at 90%, red when full (SPEC U6). */
export function CapacityMeter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const level = meterLevel(used, cap);
  const pct = Math.min(100, cap > 0 ? (used / cap) * 100 : 100);
  return (
    <span className={`pkr-cap-meter pkr-cap-meter--${level}`} role="meter" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={used} aria-label={`${label} ${used} of ${cap}${level === 'full' ? ', full' : ''}`}>
      <span className="pkr-cap-meter__text">
        {label} {used}/{cap}
      </span>
      <span className="pkr-cap-meter__bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
