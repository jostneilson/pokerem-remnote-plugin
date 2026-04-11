import { useMemo } from 'react';
import type { PokeRemGameState, OwnedPokemon } from '../../game/state/model';
import { xpProgressPercent } from '../../game/state/store';
import { frontSpriteUrl } from '../../game/sprites';
import { typePillStyle } from '../battle/battleTheme';
import { MeterBar, PartyHpMeter } from '../components/Bars';
import { Panel } from '../components/Panel';
import { PokemonSprite } from '../components/PokemonSprite';
import { GameIcon } from '../components/GameIcon';
import { checkLevelEvolution } from '../../game/engine/evolution';
import { movesetForBattle } from '../../game/engine/moveLearn';
import { xpToNextLevel } from '../../game/engine/progression';
import { MOVES } from '../../game/data/moves';
import { BRAND } from '../theme/gameTheme';
import type { SessionRecapDeltas } from '../../hooks/useSessionRecap';

function streakStudyLine(current: number, longest: number): string {
  if (current <= 0) {
    return `Study on consecutive UTC days to build a streak — ${BRAND.wordmark} tracks your calendar habit alongside your run.`;
  }
  if (current < 3) {
    return `${current}-day streak. Three days in a row is a solid rhythm — you’re almost there.`;
  }
  if (current < 7) {
    return `${current}-day streak. A full week (${7 - current} more day${7 - current === 1 ? '' : 's'}) is a great milestone.`;
  }
  if (current === longest) {
    return `${current}-day streak — matching your personal best. Keep the chain going when you can.`;
  }
  return `${current}-day streak (best ${longest} days). Consistency beats intensity for long-term recall.`;
}

export function StatusScreen({
  rootURL,
  state,
  active,
  sessionRecap,
}: {
  rootURL: string | undefined;
  state: PokeRemGameState;
  active: OwnedPokemon;
  sessionRecap: SessionRecapDeltas;
}) {
  const uniqueCaught = Object.values(state.collectionDex).filter((n) => n > 0).length;
  const ds = state.dailyStats;
  const streak = state.currentStreak ?? 0;
  const longest = state.longestStreak ?? 0;

  const battleMoves = useMemo(() => movesetForBattle(active), [active]);
  const partySlot = state.party.findIndex((p) => p.id === active.id);
  const xpPct = xpProgressPercent(active);
  const xpNeed = xpToNextLevel(active.totalXp);
  const atMaxLevel = active.level >= 100;
  const nextLevel = atMaxLevel ? 100 : active.level + 1;

  return (
    <div className="space-y-2">
      <Panel title="Active Pokemon" icon={<GameIcon name="starFilled" size={14} />}>
        <div className="flex gap-2.5">
          <div
            className="shrink-0 flex items-center justify-center self-start rounded-md p-0.5"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 72%)' }}
          >
            <PokemonSprite
              src={frontSpriteUrl(rootURL, active.dexNum)}
              alt={active.nickname || active.name}
              size={120}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="truncate text-[13px] font-black leading-tight" style={{ color: '#e2e8f0' }}>
                  {active.nickname || active.name}
                </span>
                {active.shiny ? (
                  <span
                    className="shrink-0 rounded px-1 py-px text-[7px] font-black uppercase leading-none"
                    style={{
                      background: 'linear-gradient(90deg, #fde047, #facc15)',
                      color: '#422006',
                      border: '1px solid rgba(0,0,0,0.2)',
                    }}
                    title="Shiny"
                  >
                    Shiny
                  </span>
                ) : null}
              </div>
              {active.nickname && active.nickname !== active.name ? (
                <div className="truncate text-[9px] font-semibold" style={{ color: '#64748b' }}>
                  Species · {active.name}
                </div>
              ) : null}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-semibold" style={{ color: '#94a3b8' }}>
                <span>Lv {active.level}</span>
                <span style={{ color: '#475569' }}>·</span>
                <span>#{String(active.dexNum).padStart(3, '0')}</span>
                {partySlot >= 0 ? (
                  <>
                    <span style={{ color: '#475569' }}>·</span>
                    <span style={{ color: 'var(--pkr-accent-muted, #cbd5e1)' }} title="Position in party">
                      Party {partySlot + 1}/{state.party.length}
                    </span>
                  </>
                ) : null}
                {active.everstone ? (
                  <>
                    <span style={{ color: '#475569' }}>·</span>
                    <span title="Holding Everstone — will not evolve from level-ups">Everstone</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {active.types.map((t) => (
                <span key={t} className="rounded border px-1.5 py-px text-[7px] font-bold uppercase leading-tight" style={typePillStyle(t)}>
                  {t}
                </span>
              ))}
              {checkLevelEvolution(active) ? (
                <span
                  className="flex shrink-0 items-center gap-0.5 rounded px-1 py-px text-[7px] font-black uppercase leading-tight"
                  style={{ background: 'rgba(168,85,247,0.28)', color: '#f3e8ff', border: '1px solid rgba(192,132,252,0.45)' }}
                  title="Meets level for evolution — will evolve when it levels up after a win"
                >
                  <GameIcon name="dna" size={9} />
                  Evolve ready
                </span>
              ) : null}
            </div>
            <div>
              <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>
                Moves
              </div>
              <div className="flex flex-wrap gap-1">
                {battleMoves.map((moveId) => {
                  const m = MOVES[moveId];
                  const pill = m ? typePillStyle(m.type) : undefined;
                  return (
                    <span
                      key={moveId}
                      className="max-w-full truncate rounded border px-1.5 py-0.5 text-[8px] font-bold leading-tight"
                      style={{
                        ...(pill ?? {
                          borderColor: 'rgba(148,163,184,0.35)',
                          backgroundColor: 'rgba(30,41,59,0.5)',
                          color: '#e2e8f0',
                        }),
                      }}
                      title={m ? `${m.type} · power ${m.power}` : moveId}
                    >
                      {m?.name ?? moveId}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
          <PartyHpMeter current={active.currentHp} max={active.maxHp} compact={false} />
          <MeterBar
            compact={false}
            value={xpPct}
            max={100}
            color="#22d3ee"
            label="XP"
            valueText={
              atMaxLevel
                ? 'Max level'
                : `${Math.round(xpPct)}% · ${xpNeed} XP → Lv ${nextLevel}`
            }
            showText
          />
        </div>
      </Panel>

      <Panel title="This session" icon={<GameIcon name="chart" size={14} />}>
        {!sessionRecap.ready ? (
          <p className="text-[9px] font-semibold" style={{ color: '#64748b' }}>
            Loading…
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-black tabular-nums" style={{ color: '#93c5fd' }}>{sessionRecap.cardsReviewed}</div>
                <div className="text-[9px] font-bold uppercase" style={{ color: '#64748b' }}>Cards</div>
              </div>
              <div>
                <div className="text-lg font-black tabular-nums" style={{ color: '#fde68a' }}>{sessionRecap.wildEncounters}</div>
                <div className="text-[9px] font-bold uppercase" style={{ color: '#64748b' }}>Wilds</div>
              </div>
              <div>
                <div className="text-lg font-black tabular-nums" style={{ color: '#6ee7b7' }}>{sessionRecap.catches}</div>
                <div className="text-[9px] font-bold uppercase" style={{ color: '#64748b' }}>Catches</div>
              </div>
            </div>
            <p className="mt-2 text-[9px] font-semibold leading-snug" style={{ color: '#64748b' }}>
              Since you opened {BRAND.wordmark} this time. Wilds and catches count for the current UTC day only (they reset at midnight with
              Today). Cards keep counting until you close RemNote or reload the plugin.
            </p>
          </>
        )}
      </Panel>

      {ds ? (
        <Panel title="Today (UTC)" icon={<GameIcon name="chart" size={14} />}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-black tabular-nums" style={{ color: '#93c5fd' }}>{ds.reviews}</div>
              <div className="text-[9px] font-bold uppercase" style={{ color: '#64748b' }}>Reviews</div>
            </div>
            <div>
              <div className="text-lg font-black tabular-nums" style={{ color: '#fde68a' }}>{ds.encounters}</div>
              <div className="text-[9px] font-bold uppercase" style={{ color: '#64748b' }}>Wilds</div>
            </div>
            <div>
              <div className="text-lg font-black tabular-nums" style={{ color: '#6ee7b7' }}>{ds.catches}</div>
              <div className="text-[9px] font-bold uppercase" style={{ color: '#64748b' }}>Catches</div>
            </div>
          </div>
          <p className="mt-2 text-[9px] font-semibold" style={{ color: '#64748b' }}>Resets at UTC midnight · date {ds.date}</p>
        </Panel>
      ) : null}

      <Panel title="Statistics" icon={<GameIcon name="chart" size={14} />}>
        <div className="space-y-0">
          {[
            { icon: 'dot' as const, iconColor: '#60a5fa', label: 'Unique caught', value: uniqueCaught },
            { icon: 'swords' as const, iconColor: '#f87171', label: 'Total defeated', value: state.totalDefeated ?? 0 },
            { icon: 'dna' as const, iconColor: '#c084fc', label: 'Total evolutions', value: state.totalEvolutions ?? 0 },
            { icon: 'party' as const, iconColor: '#4ade80', label: 'Party size', value: `${state.party.length}/6` },
            { icon: 'box' as const, iconColor: '#fbbf24', label: 'In storage', value: state.storagePokemon.length },
            { icon: 'flame' as const, iconColor: '#fb923c', label: 'Longest streak', value: `${state.longestStreak ?? 0} days` },
          ].map((row, i) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold transition-colors"
              style={{
                ...(i % 2 === 0 ? { background: 'rgba(255,255,255,0.04)' } : {}),
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                <GameIcon name={row.icon} size={13} className="" style={{ color: row.iconColor }} />{row.label}
              </span>
              <span className="font-black" style={{ color: '#e2e8f0' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Study streak" icon={<GameIcon name="flame" size={14} />}>
        <p className="text-[10px] font-semibold leading-relaxed" style={{ color: '#cbd5e1' }}>
          {streakStudyLine(streak, longest)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold tabular-nums">
          <span className="rounded-md border border-white/10 px-2 py-1" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.08)' }}>
            Current · {streak} day{streak === 1 ? '' : 's'}
          </span>
          <span className="rounded-md border border-white/10 px-2 py-1" style={{ color: '#94a3b8', background: 'rgba(0,0,0,0.2)' }}>
            Best · {longest} day{longest === 1 ? '' : 's'}
          </span>
        </div>
        <p className="mt-2 text-[9px] font-semibold" style={{ color: '#64748b' }}>
          Streak uses UTC calendar days with at least one completed flashcard while {BRAND.wordmark} is active.
        </p>
      </Panel>

      <Panel title="Trainer" icon={<GameIcon name="trainer" size={14} />}>
        <div className="relative overflow-hidden">
          <div className="absolute -right-3 -top-3 opacity-[0.04]">
            <GameIcon name="pokeball" size={64} />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black" style={{ color: '#e2e8f0' }}>{state.trainerRank || 'Novice Trainer'}</span>
              </div>
              <div className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>{state.cardsReviewed} cards reviewed</div>
            </div>
            <div className="space-y-0.5 text-right">
              {(state.currentStreak ?? 0) > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] font-bold" style={{ color: '#fb923c' }}>
                  <GameIcon name="flame" size={12} />{state.currentStreak}-day streak
                </div>
              )}
              <div className="flex items-center justify-end gap-1 text-[11px] font-bold" style={{ color: '#fbbf24' }}>
                <GameIcon name="coin" size={12} />P{state.currency ?? 0}
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
