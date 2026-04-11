import type { OwnedPokemon } from '../../game/state/model';
import { MOVES } from '../../game/data/moves';
import { learnsetMilestonesOrdered } from '../../game/engine/moveLearn';
import { nextFutureLevelEvolution } from '../../game/engine/evolution';
import { XP_PER_LEVEL, xpToNextLevel } from '../../game/engine/progression';
import { typePillStyle } from '../battle/battleTheme';
import { GameIcon } from './GameIcon';

const FUTURE_PREVIEW_CAP = 8;

function milestoneStatus(
  p: OwnedPokemon,
  row: { level: number; moveId: string },
  known: Set<string>,
): 'upcoming' | 'known' | 'passed' {
  if (row.level > p.level) return 'upcoming';
  if (known.has(row.moveId)) return 'known';
  return 'passed';
}

export function PokemonGrowthPanel({ pokemon: p }: { pokemon: OwnedPokemon }) {
  const milestones = learnsetMilestonesOrdered(p.dexNum);
  const known = new Set((p.moves ?? []).filter(Boolean));
  const evoNext = nextFutureLevelEvolution(p);
  const needXp = xpToNextLevel(p.totalXp);
  const nextLevelTotal = p.totalXp + needXp;

  const upcomingIdx = milestones.findIndex((m) => m.level > p.level);
  const pastRows = upcomingIdx === -1 ? milestones : milestones.slice(0, upcomingIdx);
  const upcomingRows = upcomingIdx === -1 ? [] : milestones.slice(upcomingIdx);
  const upcomingShown = upcomingRows.slice(0, FUTURE_PREVIEW_CAP);
  const upcomingHidden = Math.max(0, upcomingRows.length - upcomingShown.length);

  return (
    <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
      <div className="pkr-pixel-title text-[6px] font-black uppercase tracking-wide" style={{ color: '#94a3b8' }}>
        Growth &amp; moves
      </div>

      <div
        className="rounded-md border border-white/5 px-2 py-1.5 text-[9px] font-semibold leading-snug"
        style={{ background: 'rgba(0,0,0,0.15)', color: '#cbd5e1' }}
      >
        <span style={{ color: '#e2e8f0' }}>Lv{p.level}</span>
        <span style={{ color: '#64748b' }}> · </span>
        {needXp > 0 ? (
          <>
            <span style={{ color: '#fde68a' }}>{needXp} XP</span>
            <span style={{ color: '#64748b' }}> to Lv{p.level + 1}</span>
            <span className="block text-[8px] font-bold" style={{ color: '#64748b' }}>
              ({p.totalXp} / {nextLevelTotal} toward next level · {XP_PER_LEVEL} XP per level step)
            </span>
          </>
        ) : (
          <span style={{ color: '#86efac' }}>Max level ({p.level})</span>
        )}
      </div>

      {evoNext ? (
        <div
          className="flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[9px] font-semibold leading-snug"
          style={{
            borderColor: 'rgba(192,132,252,0.4)',
            background: 'rgba(88,28,135,0.22)',
            color: '#e9d5ff',
          }}
        >
          <GameIcon name="dna" size={12} className="mt-0.5 shrink-0" style={{ color: '#d8b4fe' }} />
          <span>
            Evolves into <strong style={{ color: '#faf5ff' }}>{evoNext.intoName}</strong> at level{' '}
            <strong style={{ color: '#fde68a' }}>{evoNext.minLevel}</strong>.
          </span>
        </div>
      ) : null}

      <p className="text-[8px] font-semibold leading-snug" style={{ color: '#64748b' }}>
        New moves from level-ups join your moveset; with four moves already known, the oldest slot is replaced.
      </p>

      <div className="max-h-[min(40vh,220px)] space-y-1 overflow-y-auto pr-0.5">
        {pastRows.length > 0 ? (
          <div className="text-[7px] font-black uppercase tracking-wide" style={{ color: '#64748b' }}>
            Reached
          </div>
        ) : null}
        {pastRows.map((row) => {
          const st = milestoneStatus(p, row, known);
          const mv = MOVES[row.moveId];
          if (!mv) return null;
          return (
            <div
              key={`${row.level}-${row.moveId}`}
              className="flex flex-wrap items-center gap-1 rounded border border-white/5 px-1.5 py-1"
              style={{ background: 'rgba(0,0,0,0.12)' }}
            >
              <span
                className="shrink-0 rounded px-1 py-px text-[8px] font-black tabular-nums"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: '#94a3b8',
                }}
              >
                L{row.level}
              </span>
              <span className="truncate text-[9px] font-bold" style={{ color: '#f1f5f9' }}>
                {mv.name}
              </span>
              <span className="rounded border px-1 py-px text-[7px] font-bold uppercase" style={typePillStyle(mv.type)}>
                {mv.type}
              </span>
              <span
                className="ml-auto shrink-0 rounded-full px-1.5 py-px text-[7px] font-black uppercase"
                style={
                  st === 'known'
                    ? { background: 'rgba(6,78,59,0.45)', color: '#6ee7b7' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }
                }
              >
                {st === 'known' ? 'Known' : 'Passed'}
              </span>
            </div>
          );
        })}

        {upcomingShown.length > 0 ? (
          <div className="mt-1 text-[7px] font-black uppercase tracking-wide" style={{ color: '#64748b' }}>
            Upcoming
          </div>
        ) : null}
        {upcomingShown.map((row) => {
          const mv = MOVES[row.moveId];
          if (!mv) return null;
          return (
            <div
              key={`up-${row.level}-${row.moveId}`}
              className="flex flex-wrap items-center gap-1 rounded border border-amber-900/30 px-1.5 py-1"
              style={{ background: 'rgba(120,53,15,0.15)' }}
            >
              <span
                className="shrink-0 rounded px-1 py-px text-[8px] font-black tabular-nums"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fde68a' }}
              >
                L{row.level}
              </span>
              <span className="truncate text-[9px] font-bold" style={{ color: '#fef3c7' }}>
                {mv.name}
              </span>
              <span className="rounded border px-1 py-px text-[7px] font-bold uppercase" style={typePillStyle(mv.type)}>
                {mv.type}
              </span>
              <span
                className="ml-auto shrink-0 rounded-full px-1.5 py-px text-[7px] font-black uppercase"
                style={{ background: 'rgba(251,191,36,0.2)', color: '#fcd34d' }}
              >
                Next
              </span>
            </div>
          );
        })}
        {upcomingHidden > 0 ? (
          <p className="py-0.5 text-center text-[8px] font-semibold" style={{ color: '#64748b' }}>
            +{upcomingHidden} more later learn…
          </p>
        ) : null}
        {milestones.length === 0 ? (
          <p className="text-[9px] font-semibold" style={{ color: '#64748b' }}>
            No learnset data for this species.
          </p>
        ) : null}
      </div>
    </div>
  );
}
