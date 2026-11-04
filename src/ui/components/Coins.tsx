import { coinsSpoken, formatCoins, formatCoinsExact } from '../format/coins';

/** A money amount: short on screen, exact on hover and for screen readers. */
export function Coins({ value, prefix = '', className }: { value: number; prefix?: string; className?: string }) {
  return (
    <span className={className} title={`${prefix}${formatCoinsExact(value)}`} aria-label={`${prefix}${coinsSpoken(value)}`}>
      {prefix}
      {formatCoins(value)}
    </span>
  );
}
