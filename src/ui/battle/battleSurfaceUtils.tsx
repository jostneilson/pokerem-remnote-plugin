import type { ReactNode } from 'react';
import type { PokemonType } from '../../game/data/species';
import type { CatchBall } from '../../game/engine/encounters';

/** Design baseline for proportions when the host width is unknown. */
export const DESIGN_W = 360;

/** Minus before digits (U+2212 from narr strings or ASCII hyphen) — the pixel face draws the glyph low; align as a unit. */
const BATTLE_LOG_DAMAGE_RE = /(−|-)(\d+)/g;

export function battleLogRichText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let mi = 0;
  BATTLE_LOG_DAMAGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BATTLE_LOG_DAMAGE_RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    parts.push(
      <span key={`dmg-${mi++}`} className="pkr-battle-damage-token">
        <span className="pkr-battle-damage-token__sign">{m[1]}</span>
        <span className="pkr-battle-damage-token__num">{m[2]}</span>
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts.length === 0 ? text : parts.length === 1 ? parts[0]! : parts;
}

export function measureElementWidth(el: Element | null): number {
  if (!el || !(el instanceof HTMLElement)) return 0;
  const r = el.getBoundingClientRect().width || el.clientWidth || 0;
  return Math.round(r);
}

export function sortTypes(types: PokemonType[]): PokemonType[] {
  return [...types].sort((a, b) => a.localeCompare(b));
}

export function tierGlow(tier?: string): string | undefined {
  if (tier === 'Legendary') return '#eab308';
  if (tier === 'Mythical') return '#a855f7';
  if (tier === 'Ultra') return '#3b82f6';
  return undefined;
}

/** Compact battle-deck label for move category. */
export function moveCategoryMeta(category: 'physical' | 'special' | 'status'): {
  short: string;
  title: string;
} {
  if (category === 'physical') return { short: 'PHY', title: 'Physical move' };
  if (category === 'special') return { short: 'SPC', title: 'Special move' };
  return { short: 'STA', title: 'Status move' };
}

export function formatMovePowerLine(power: number): string {
  if (power <= 0) return '—';
  return `${power} PWR`;
}

export type BusyAction = null | 'catch' | 'fight' | 'run';

export function busyOverlayText(busyAction: BusyAction): string {
  if (busyAction === 'catch') return 'Throwing…';
  if (busyAction === 'fight') return 'Attacking…';
  if (busyAction === 'run') return 'Fleeing…';
  return '…';
}

export const CATCH_BALL_STOCK: { key: CatchBall; icon: string; label: string }[] = [
  { key: 'poke-ball', icon: 'poke-ball.png', label: 'Poké Ball' },
  { key: 'great-ball', icon: 'great-ball.png', label: 'Great Ball' },
  { key: 'ultra-ball', icon: 'ultra-ball.png', label: 'Ultra Ball' },
];
