import { useMemo, type CSSProperties } from 'react';
import type { CombatStrikeSnapshot } from '../../game/state/model';
import { MOVES } from '../../game/data/moves';
import { TYPE_COLORS } from './battleTheme';
import { TypeSymbolImage } from './TypeBattleIcon';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Type- and category-aware strike presentation during the combat lunge sequence.
 * Replaces the old generic ember sprite so feedback matches the actual move.
 */
export function CombatStrikeOverlay({
  rootURL,
  strike,
  lungePhase,
  reducedMotion,
}: {
  rootURL: string | undefined;
  strike: CombatStrikeSnapshot | null;
  lungePhase: 'idle' | 'player' | 'wild';
  reducedMotion?: boolean;
}) {
  const active = useMemo(() => {
    if (!strike || lungePhase === 'idle') return null;
    const id = lungePhase === 'player' ? strike.playerMoveId : strike.wildMoveId;
    const m = MOVES[id];
    if (!m) return null;
    const tc = TYPE_COLORS[m.type];
    return { move: m, tc, phase: lungePhase as 'player' | 'wild' };
  }, [strike, lungePhase]);

  if (reducedMotion || !active) return null;

  const { move, tc, phase } = active;
  const cat = move.category;
  const posClass = phase === 'player' ? 'pkr-combat-strike--player' : 'pkr-combat-strike--wild';
  const catClass =
    cat === 'special' ? 'pkr-combat-strike--special' : cat === 'status' ? 'pkr-combat-strike--status' : 'pkr-combat-strike--physical';

  const core = rgba(tc.bg, 0.55);
  const rim = rgba(tc.border, 0.85);
  const glow = rgba(tc.bg, 0.4);

  return (
    <div
      className={`pointer-events-none absolute z-[6] ${posClass} pkr-combat-strike ${catClass}`}
      aria-hidden
      style={
        {
          '--pkr-strike-core': core,
          '--pkr-strike-rim': rim,
          '--pkr-strike-glow': glow,
        } as CSSProperties
      }
    >
      <div className="pkr-combat-strike__ring" />
      <div className="pkr-combat-strike__burst" />
      {cat === 'physical' ? (
        <>
          <div className="pkr-combat-strike__slash pkr-combat-strike__slash--a" />
          <div className="pkr-combat-strike__slash pkr-combat-strike__slash--b" />
        </>
      ) : null}
      {cat === 'special' ? <div className="pkr-combat-strike__rings" /> : null}
      {cat === 'status' ? <div className="pkr-combat-strike__mist" /> : null}
      <div className="pkr-combat-strike__icon">
        <TypeSymbolImage rootURL={rootURL} type={move.type} size={26} variant="resist" reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}
