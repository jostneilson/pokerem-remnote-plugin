import { useEffect, useRef, useState } from 'react';
import type { PokeRemGameState } from '../../game/state/model';
import { formatCoins } from '../format/coins';

const SHOW_MS = 2500;

/** "Lucky card! +₽620": a gold chip above the dialogue box for 2.5s when a card rolls a cash bonus (SPEC U13). */
export function LuckyChip({ reward }: { reward: PokeRemGameState['lastStudyReward'] }) {
  const [shown, setShown] = useState<{ amount: number; tier?: string } | null>(null);
  const seen = useRef<number | undefined>(reward?.seq);
  useEffect(() => {
    if (!reward || reward.seq === seen.current) return;
    seen.current = reward.seq;
    if (!(reward.bonus > 0)) return;
    setShown({ amount: reward.bonus, tier: reward.tier });
    const t = window.setTimeout(() => setShown(null), SHOW_MS);
    return () => window.clearTimeout(t);
  }, [reward?.seq, reward?.bonus]);
  if (!shown) return null;
  const label = shown.tier === 'Jackpot' ? 'Jackpot card!' : shown.tier === 'Rare find' ? 'Rare find!' : 'Lucky card!';
  return (
    <div className="pkr-lucky-chip" role="status">
      {label} +{formatCoins(shown.amount)}
    </div>
  );
}

/** Replays a small tick on the ₽ counter whenever the balance goes up. */
export function useCoinTick(currency: number): string {
  const prev = useRef(currency);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (currency > prev.current) setTick((n) => n + 1);
    prev.current = currency;
  }, [currency]);
  return tick > 0 ? `pkr-coin-tick pkr-coin-tick--${tick % 2}` : '';
}
