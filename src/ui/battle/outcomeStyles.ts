import type { CSSProperties } from 'react';
import type { BattleOutcomeKind, CombatStrikeSnapshot } from '../../game/state/model';
import { MOVES } from '../../game/data/moves';
import { TYPE_COLORS } from './battleTheme';

function rgbTripletFromHex(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r},${g},${b}`;
}

/**
 * Outcome panel inline styles for the battle log.
 * Uses inline styles instead of Tailwind classes to avoid purge issues.
 * Inset highlight + soft outer glow so the log reads as a primary HUD surface.
 */
export const OUTCOME_PANEL_STYLE: Record<BattleOutcomeKind, CSSProperties> = {
  none: {
    borderColor: 'rgba(71,85,105,0.95)',
    background: 'linear-gradient(180deg, rgba(30,41,59,0.88) 0%, rgba(15,23,42,0.92) 100%)',
    color: '#f1f5f9',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px rgba(15,23,42,0.55), 0 4px 14px rgba(0,0,0,0.35)',
  },
  spawn: {
    borderColor: '#06b6d4',
    background: 'linear-gradient(180deg, rgba(14,116,144,0.88) 0%, rgba(8,51,68,0.94) 100%)',
    color: '#ecfeff',
    boxShadow:
      'inset 0 1px 0 rgba(165,243,252,0.2), 0 0 22px rgba(6,182,212,0.35), 0 4px 14px rgba(0,0,0,0.3)',
  },
  catch_success: {
    borderColor: '#22c55e',
    background: 'linear-gradient(180deg, rgba(21,128,61,0.85) 0%, rgba(6,78,59,0.94) 100%)',
    color: '#ecfdf5',
    boxShadow:
      'inset 0 1px 0 rgba(187,247,208,0.2), 0 0 24px rgba(34,197,94,0.38), 0 4px 14px rgba(0,0,0,0.3)',
  },
  catch_fail: {
    borderColor: '#eab308',
    background: 'linear-gradient(180deg, rgba(113,63,18,0.88) 0%, rgba(69,26,3,0.92) 100%)',
    color: '#fffbeb',
    boxShadow:
      'inset 0 1px 0 rgba(253,224,71,0.12), 0 0 20px rgba(234,179,8,0.28), 0 4px 14px rgba(0,0,0,0.32)',
  },
  no_balls: {
    borderColor: '#f97316',
    background: 'linear-gradient(180deg, rgba(124,45,18,0.88) 0%, rgba(67,20,7,0.92) 100%)',
    color: '#fff7ed',
    boxShadow:
      'inset 0 1px 0 rgba(254,215,170,0.15), 0 0 22px rgba(249,115,22,0.32), 0 4px 14px rgba(0,0,0,0.32)',
  },
  defeat: {
    borderColor: '#fb7185',
    background: 'linear-gradient(180deg, rgba(136,19,55,0.85) 0%, rgba(76,5,25,0.92) 100%)',
    color: '#fff1f2',
    boxShadow:
      'inset 0 1px 0 rgba(255,228,230,0.12), 0 0 22px rgba(251,113,133,0.35), 0 4px 14px rgba(0,0,0,0.35)',
  },
  combat: {
    borderColor: '#38bdf8',
    background: 'linear-gradient(180deg, rgba(12,74,110,0.88) 0%, rgba(8,47,73,0.94) 100%)',
    color: '#e0f2fe',
    boxShadow:
      'inset 0 1px 0 rgba(125,211,252,0.18), 0 0 22px rgba(56,189,248,0.32), 0 4px 14px rgba(0,0,0,0.3)',
  },
  faint: {
    borderColor: '#94a3b8',
    background: 'linear-gradient(180deg, rgba(51,65,85,0.9) 0%, rgba(30,41,59,0.94) 100%)',
    color: '#f1f5f9',
    boxShadow:
      'inset 0 1px 0 rgba(226,232,240,0.08), 0 0 18px rgba(100,116,139,0.28), 0 4px 12px rgba(0,0,0,0.32)',
  },
  run: {
    borderColor: '#5eead4',
    background: 'linear-gradient(180deg, rgba(15,118,110,0.82) 0%, rgba(15,23,42,0.9) 100%)',
    color: '#ccfbf1',
    boxShadow:
      'inset 0 1px 0 rgba(153,246,228,0.15), 0 0 22px rgba(94,234,212,0.28), 0 4px 14px rgba(0,0,0,0.3)',
  },
  evolution: {
    borderColor: '#c084fc',
    background: 'linear-gradient(180deg, rgba(107,33,168,0.88) 0%, rgba(59,7,100,0.94) 100%)',
    color: '#faf5ff',
    boxShadow:
      'inset 0 1px 0 rgba(233,213,255,0.15), 0 0 24px rgba(192,132,252,0.38), 0 4px 14px rgba(0,0,0,0.32)',
  },
};

/** Combat / faint / KO defeat log — border + outer glow keyed to the player’s move type. */
export function outcomePanelWithStrikeAccent(
  outcomeKind: BattleOutcomeKind,
  strike: CombatStrikeSnapshot | null | undefined,
): CSSProperties {
  const base = OUTCOME_PANEL_STYLE[outcomeKind];
  if (!strike) return base;
  const m = MOVES[strike.playerMoveId];
  if (!m) return base;
  const tc = TYPE_COLORS[m.type];
  const rgb = rgbTripletFromHex(tc.bg);
  const accent = {
    borderColor: tc.border,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 28px rgba(${rgb},0.42), 0 4px 14px rgba(0,0,0,0.32)`,
  };
  if (outcomeKind === 'combat' || outcomeKind === 'faint') {
    return { ...base, ...accent };
  }
  if (outcomeKind === 'defeat' && strike.wildDefeated === true) {
    return { ...base, ...accent };
  }
  return base;
}
